// POST /api/upload
// Accepts a file (PDF or TXT) plus optional pre-extracted text (for PDFs
// that were parsed on the client with pdfjs-dist).  Uploads the original
// file to Supabase Storage and saves a row in the `documents` table.
//
// PDF text extraction is intentionally done CLIENT-SIDE (see
// src/lib/pdf-extract.ts) to avoid pdfjs-dist worker issues on Vercel
// serverless. The client sends the extracted text in the `content` field
// of the FormData, so this route never needs to parse PDF bytes.

import { NextResponse } from "next/server";
import { getServerSupabase, getTokenFromRequest } from "@/lib/supabase-client";

export const runtime = "nodejs";
const BUCKET = "documents";

export async function POST(request: Request) {
  const startTime = Date.now();
  console.log("\n=== POST /api/upload ===");
  console.log(`[${new Date().toISOString()}] Request received`);

  try {
    // 1) Authenticate
    const token = getTokenFromRequest(request);
    if (!token) {
      console.log("[upload] ❌ No auth token");
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const supabase = getServerSupabase(token);
    console.log("[upload] Verifying user token...");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("[upload] ❌ Invalid session:", userError);
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    console.log(`[upload] ✓ User authenticated: ${user.email}`);

    // 2) Read file + optional pre-extracted text from form data.
    //    For PDFs the client runs pdfjs-dist in the browser (pdf-extract.ts)
    //    and sends the result as a `content` field — no server-side PDF
    //    parsing needed, which avoids Vercel serverless worker-file crashes.
    console.log("[upload] Reading form data...");
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      console.log("[upload] ❌ No file in form data");
      return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
    }

    console.log(`[upload] File received: ${file.name} (${file.type}, ${file.size} bytes)`);

    // Convert to Buffer immediately to prevent detached ArrayBuffer issues.
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    console.log(`[upload] ✓ Converted to Buffer (${fileBuffer.length} bytes)`);

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    // 3) Resolve text content.
    //    - PDFs: use the client-extracted text that arrived in FormData["content"].
    //    - TXT files: decode the raw bytes on the server (always safe).
    let content = "";
    if (isPdf) {
      // The client sends pre-extracted text to avoid server-side pdfjs issues.
      const clientContent = formData.get("content");
      if (typeof clientContent === "string" && clientContent.trim().length > 0) {
        content = clientContent;
        console.log(`[upload] ✓ Used client-extracted PDF text (${content.length} chars)`);
      } else {
        // Fallback: no client text was provided (e.g. old client version).
        // Store an empty string so the row is still created; the user can
        // re-memorize after updating the client.
        content = "";
        console.log("[upload] ⚠️ No client-extracted text received for PDF. Storing empty content.");
      }
    } else {
      content = new TextDecoder().decode(fileBuffer);
      console.log(`[upload] ✓ Read ${content.length} chars from text file`);
    }

    // 4) Upload to Supabase Storage
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

    // 5) Save to documents table
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

    return NextResponse.json({ document });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error.";
    console.error(`[upload] ❌ Exception after ${elapsed}ms:`, error);
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}
