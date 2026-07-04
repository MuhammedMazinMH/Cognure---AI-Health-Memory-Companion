// Client-side PDF text extraction using pdfjs-dist with a CDN worker.
// This runs entirely in the browser, avoiding serverless worker-file issues on Vercel.
"use client";

import * as pdfjs from "pdfjs-dist";

// Point the worker at the matching version on cdnjs so no worker file needs
// to be bundled or served from the Next.js app itself.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

/**
 * Extracts all text content from a PDF File by rendering each page
 * through pdfjs-dist in the browser.
 *
 * @param file - The PDF File object selected by the user.
 * @returns A single string containing the text of every page, separated by
 *          double newlines.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  // Read the file into an ArrayBuffer so pdfjs can parse it.
  const arrayBuffer = await file.arrayBuffer();

  // Load the PDF document from the raw bytes.
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  // Iterate through every page (1-indexed in pdfjs).
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    // Each item in content.items is either a TextItem (has .str) or a
    // TextMarkedContent (no .str). We only care about the text items.
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    fullText += pageText + "\n\n";
  }

  return fullText.trim();
}
