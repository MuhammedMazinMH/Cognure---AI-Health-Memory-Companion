// Client-side PDF text extraction for React Native.
//
// The web app extracts PDF text in the browser with pdfjs-dist
// (src/lib/pdf-extract.ts). React Native has no DOM, so we preserve the
// exact same behaviour by running the identical pdfjs extraction loop
// inside a hidden WebView. Same library (pdfjs-dist 6.x, matching the web's
// package.json), same page-by-page text join, same "\n\n" separator.
//
// Usage:
//   const extractor = useRef<PdfExtractorHandle>(null);
//   <PdfExtractor ref={extractor} />
//   const text = await extractor.current.extractText(base64Pdf);

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

export interface PdfExtractorHandle {
  /** Extracts all text from a base64-encoded PDF. Rejects on parse failure. */
  extractText: (base64Pdf: string) => Promise<string>;
}

// Pinned to the same major version as the web app's pdfjs-dist (^6.1.200).
const PDFJS_VERSION = "6.1.200";

// Minimal page that hosts pdfjs. It waits for a base64 payload from the
// native side, extracts text page by page (same loop as the web app),
// and posts the result back.
const EXTRACTOR_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<script type="module">
  import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs";
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs";

  function post(message) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }

  async function extract(base64) {
    // Decode base64 -> Uint8Array (the raw PDF bytes).
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    let fullText = "";

    // Identical loop to the web app's extractTextFromPdf.
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + "\\n\\n";
    }

    return fullText.trim();
  }

  window.__extractPdf = async function (base64) {
    try {
      const text = await extract(base64);
      post({ type: "result", text });
    } catch (err) {
      post({ type: "error", message: err && err.message ? err.message : "PDF parse failed" });
    }
  };

  post({ type: "ready" });
</script>
</body>
</html>`;

interface Pending {
  resolve: (text: string) => void;
  reject: (error: Error) => void;
}

export const PdfExtractor = forwardRef<PdfExtractorHandle>(function PdfExtractor(
  _props,
  ref
) {
  const webViewRef = useRef<WebView>(null);
  const pendingRef = useRef<Pending | null>(null);
  const readyRef = useRef(false);
  // Queue a single extraction requested before the WebView finished loading.
  const queuedBase64Ref = useRef<string | null>(null);

  const runExtraction = useCallback((base64: string) => {
    // Injecting the payload as a JS call keeps the transfer in one message.
    webViewRef.current?.injectJavaScript(
      `window.__extractPdf(${JSON.stringify(base64)}); true;`
    );
  }, []);

  useImperativeHandle(ref, () => ({
    extractText: (base64Pdf: string) =>
      new Promise<string>((resolve, reject) => {
        if (pendingRef.current) {
          reject(new Error("Another PDF is already being processed."));
          return;
        }
        pendingRef.current = { resolve, reject };
        if (readyRef.current) {
          runExtraction(base64Pdf);
        } else {
          queuedBase64Ref.current = base64Pdf;
        }
      }),
  }));

  return (
    <View style={{ width: 0, height: 0, overflow: "hidden" }}>
      <WebView
        ref={webViewRef}
        source={{ html: EXTRACTOR_HTML }}
        originWhitelist={["*"]}
        javaScriptEnabled
        onMessage={(event) => {
          let message: { type: string; text?: string; message?: string };
          try {
            message = JSON.parse(event.nativeEvent.data);
          } catch {
            return;
          }

          if (message.type === "ready") {
            readyRef.current = true;
            if (queuedBase64Ref.current) {
              runExtraction(queuedBase64Ref.current);
              queuedBase64Ref.current = null;
            }
            return;
          }

          const pending = pendingRef.current;
          if (!pending) return;
          pendingRef.current = null;

          if (message.type === "result") {
            pending.resolve(message.text ?? "");
          } else {
            pending.reject(new Error(message.message ?? "PDF parse failed"));
          }
        }}
        onError={() => {
          const pending = pendingRef.current;
          pendingRef.current = null;
          pending?.reject(new Error("Could not load the PDF reader."));
        }}
      />
    </View>
  );
});
