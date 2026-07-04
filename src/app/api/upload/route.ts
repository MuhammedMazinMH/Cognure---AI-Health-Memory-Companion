// POST /api/upload
// Accepts a single file (PDF or TXT), extracts its text, uploads the original
// file to Supabase Storage, and saves a row in the `documents` table.
//
// The browser sends the file as multipart/form-data and includes the user's
// access token in the Authorization header so we save data as that user.

import { NextResponse } from "next/server";
// pdf-parse v2 exposes a `PDFParse` class. We import it directly. Because we
// listed "pdf-parse" in serverExternalPackages (next.config.ts), Next.js will
// not try to bundle it, which keeps its PDF engine working.
import { PDFParse } from "pdf-parse";
import { getServerSupabase, getTokenFromRequest } from "@/lib/supabase-client";

// pdf-parse needs the full Node.js runtime (not the lighter Edge runtime).
export const runtime = "nodejs";

// The name of the Supabase Storage bucket we upload files into.
const BUCKET = "documents";

export async function POST(request: Request) {
  const startTime = Date.now();
  console.log("\n=== POST /api/upload ===");
  console.log(`[${new Date().toISOString()}] Request received`);

  try {
    // 1) Make sure the user is logged in.
    const token = getTokenFromRequest(request);
    if (!token) {
      console.log("[upload] ❌ No auth token");
      return NextResponse.json(
        { error: "Not signed in." },
        { status: 401 }
      );
    }

    const supabase = getServerSupabase(token);

    // Confirm the token is valid and find out who the user is.
    console.log("[upload] Verifying user token...");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("[upload] ❌ Invalid session:", userError);
      return NextResponse.json(
        { error: "Invalid session." },
        { status: 401 }
      );
    }

    console.log(`[upload] ✓ User authenticated: ${user.email}`);

    // 2) Read the uploaded file out of the form data.
    console.log("[upload] Reading form data...");
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      console.log("[upload] ❌ No file in form data");
      return NextResponse.json(
        { error: "No file was uploaded." },
        { status: 400 }
      );
    }

    console.log(`[upload] File received: ${file.name} (${file.type}, ${file.size} bytes)`);

    // Turn the file into a Buffer that won't get detached.
    // IMPORTANT: We read the ArrayBuffer once and convert it to a Node.js Buffer
    // immediately. This prevents the "detached ArrayBuffer" error that happens
    // when the same ArrayBuffer is passed to multiple operations.
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    
    console.log(`[upload] ✓ Converted to Buffer (${fileBuffer.length} bytes)`);

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    // 3) Extract plain text from the file.
    console.log(`[upload] Extracting text (isPdf: ${isPdf})...`);
    let content = "";
    if (isPdf) {
      // Parse the PDF. We pass the Buffer directly - pdf-parse can handle it.
      const parser = new PDFParse({ data: fileBuffer });
      const result = await parser.getText();
      content = result.text ?? "";
      // Free up the resources the parser used.
      await parser.destroy();
      console.log(`[upload] ✓ Extracted ${content.length} chars from PDF`);
    } else {
      // Treat anything else as a plain text file.
      content = new TextDecoder().decode(fileBuffer);
      console.log(`[upload] ✓ Read ${content.length} chars from text file`);
    }

    // 4) Upload the original file to Supabase Storage.
    // We pass the Buffer directly - Supabase Storage accepts Buffer, Uint8Array, or Blob.
    console.log("[upload] Uploading to Supabase Storage...");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: file.type || "text/plain",
        upsert: false,
      });

    if (uploadError) {
      console.log("[upload] ❌ Storage upload failed:", uploadError);
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.log(`[upload] ✓ File uploaded to: ${filePath}`);

    // 5) Save a record in the documents table.
    console.log("[upload] Saving document metadata...");
    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type || "text/plain",
        content,
      })
      .select()
      .single();

    if (insertError) {
      console.log("[upload] ❌ Database insert failed:", insertError);
      return NextResponse.json(
        { error: `Saving document failed: ${insertError.message}` },
        { status: 500 }
      );
    }

    const elapsed = Date.now() - startTime;
    console.log(`[upload] ✓ Success! Document ID: ${document.id}`);
    console.log(`[upload] Completed in ${elapsed}ms\n`);

    // Send back the new document so the browser can immediately "remember" it.
    return NextResponse.json({ document });
  } catch (error) {
    // Any unexpected error lands here so the request never hangs.
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error.";
    console.error(`[upload] ❌ Exception after ${elapsed}ms:`, error);
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}
