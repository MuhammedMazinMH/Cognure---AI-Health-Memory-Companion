// MUST be first — polyfill browser APIs before any PDF library loads.
import "@/lib/pdf-polyfill";

// POST /api/upload
// Accepts a single file (PDF or TXT), extracts its text, uploads the original
// file to Supabase Storage, and saves a row in the `documents` table.

import { NextResponse } from "next/server";
import PDFParser from "pdf2json";
import { getServerSupabase, getTokenFromRequest } from "@/lib/supabase-client";

export const runtime = "nodejs";
const BUCKET = "documents";

// Extract text from PDF using pdf2json (pure Node.js, works on Vercel)
async function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    // Use 'unknown' to bypass strict pdf2json type checking
    pdfParser.on("pdfParser_dataError", (errData: unknown) => {
      let errorMessage = "PDF parsing failed";
      const err = errData as { parserError?: string; message?: string };
      if (err.parserError) {
        errorMessage = err.parserError;
      } else if (err.message) {
        errorMessage = err.message;
      }
      reject(new Error(errorMessage));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData: unknown) => {
      try {
        const data = pdfData as {
          Pages?: Array<{
            Texts?: Array<{
              R?: Array<{ T?: string }>;
            }>;
          }>;
        };

        const pages = data.Pages || [];
        const fullText = pages
          .map((page) => {
            const texts = page.Texts || [];
            return texts
              .map((text) => {
                const r = text.R || [];
                return r.map((item) => decodeURIComponent(item.T || "")).join("");
              })
              .join(" ");
          })
          .join("\n\n");
        resolve(fullText);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

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

    // 2) Read file from form data
    console.log("[upload] Reading form data...");
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      console.log("[upload] ❌ No file in form data");
      return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
    }

    console.log(`[upload] File received: ${file.name} (${file.type}, ${file.size} bytes)`);

    // Convert to Buffer immediately to prevent detached ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    console.log(`[upload] ✓ Converted to Buffer (${fileBuffer.length} bytes)`);

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    // 3) Extract text
    console.log(`[upload] Extracting text (isPdf: ${isPdf})...`);
    let content = "";
    if (isPdf) {
      content = await extractPdfText(fileBuffer);
      console.log(`[upload] ✓ Extracted ${content.length} chars from PDF`);
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