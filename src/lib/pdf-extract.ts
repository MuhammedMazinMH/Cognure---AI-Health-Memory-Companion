// Client-side PDF text extraction using pdfjs-dist with a locally bundled worker.
// The worker file lives at public/pdfjs/pdf.worker.min.mjs and is served from
// the app's own domain, so it works on Vercel without relying on any CDN.
"use client";

/**
 * Extracts all text content from a PDF File by rendering each page
 * through pdfjs-dist in the browser.
 *
 * @param file - The PDF File object selected by the user.
 * @returns A single string containing the text of every page, separated by
 *          double newlines.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  // Lazy-load pdfjs-dist only when the function is called in the browser.
  // This prevents SSR issues on Vercel where DOMMatrix is not available.
  const pdfjs = await import("pdfjs-dist");

  // Use the locally bundled worker file (public/pdfjs/pdf.worker.min.mjs)
  // instead of a CDN URL. This guarantees the worker is always available
  // and version-matched without any external dependency.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

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
