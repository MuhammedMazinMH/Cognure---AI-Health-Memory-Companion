// A pop-up dialog that lets the user add a memory by uploading a PDF or TXT
// file. It renders its OWN "Add Memory" button as the trigger, so we can drop
// <UploadModal /> straight into the header.
"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Loader2 } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function UploadModal() {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  // A hidden <input type="file"> we click programmatically.
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "uploaded" | "memorizing" | "memorized" | "done"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadedDocument, setUploadedDocument] = useState<{
    content: string;
    id: string;
  } | null>(null);
  const [entityCounts, setEntityCounts] = useState<Record<string, number>>({});

  // The main routine: send the file to our API, then remember its text.
  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);

      // Only allow PDF and TXT files.
      const isAllowed =
        file.type === "application/pdf" ||
        file.type === "text/plain" ||
        /\.(pdf|txt)$/i.test(file.name);

      if (!isAllowed) {
        setError("Please upload a PDF or TXT file.");
        return;
      }

      // We need the user's access token to prove who they are to the API.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("You are not signed in. Please log in again.");
        return;
      }

      try {
        // Step 1: upload the file and extract its text.
        setStatus("uploading");
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadData.error ?? "Upload failed.");
        }

        // Upload complete - now show "Memorize" button instead of auto-memorizing
        setStatus("uploaded");
        setUploadedDocument({
          content: uploadData.document.content,
          id: uploadData.document.id,
        });
      } catch (err) {
        setStatus("idle");
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    },
    [supabase]
  );

  // New function: Handle memorization when user clicks "Memorize" button
  const handleMemorize = useCallback(async () => {
    if (!uploadedDocument) return;

    setError(null);
    
    // Get the user's access token
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError("You are not signed in. Please log in again.");
      return;
    }

    try {
      // Step 2: turn the extracted text into a memory with entity extraction.
      setStatus("memorizing");
      const rememberRes = await fetch("/api/remember", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          text: uploadedDocument.content,
          documentId: uploadedDocument.id,
        }),
      });
      const rememberData = await rememberRes.json();

      if (!rememberRes.ok) {
        throw new Error(rememberData.error ?? "Could not extract entities.");
      }

      // Show success with entity counts
      setStatus("memorized");
      setEntityCounts(rememberData.count || {});
      
      // Refresh the page so new data shows up, then close after a moment.
      router.refresh();
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
        setFileName(null);
        setUploadedDocument(null);
        setEntityCounts({});
      }, 2000);
    } catch (err) {
      setStatus("uploaded"); // Return to uploaded state so user can retry
      setError(err instanceof Error ? err.message : "Entity extraction failed.");
    }
  }, [uploadedDocument, router, supabase]);

  // Handle a file dropped onto the drop zone.
  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const busy = status === "uploading" || status === "memorizing";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Base UI uses a `render` prop (instead of Radix's `asChild`) to make
          the trigger render as our styled Button. The icon + label below are
          passed in as the Button's children. */}
      <DialogTrigger
        render={<Button className="bg-sage text-white hover:bg-sage/90" />}
      >
        <UploadCloud className="mr-2 h-4 w-4" />
        Add Memory
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Add a memory</DialogTitle>
          <DialogDescription>
            Upload a health document (PDF or TXT). Cognure will read it and
            remember the important details.
          </DialogDescription>
        </DialogHeader>

        {/* The drag-and-drop zone. Clicking it opens the file picker. */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => !busy && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !busy) {
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
            dragging
              ? "border-sage bg-sage/10"
              : "border-border hover:border-sage/60 hover:bg-accent/40"
          )}
        >
          {busy ? (
            <Loader2 className="h-10 w-10 animate-spin text-sage" />
          ) : status === "done" || status === "memorized" ? (
            <FileText className="h-10 w-10 text-sage" />
          ) : (
            <UploadCloud className="h-10 w-10 text-sage" />
          )}

          <div className="text-sm">
            {status === "uploading" && <p>Reading your document…</p>}
            {status === "uploaded" && (
              <p className="font-medium text-charcoal">
                Document uploaded! Click Memorize to extract entities.
              </p>
            )}
            {status === "memorizing" && <p>Extracting medical entities...</p>}
            {status === "memorized" && (
              <p className="font-medium text-sage">
                ✓ Memorized! Found{" "}
                {Object.entries(entityCounts)
                  .filter(([_, count]) => count > 0)
                  .map(([type, count]) => `${count} ${type}${count !== 1 ? "s" : ""}`)
                  .join(", ") || "no entities"}
              </p>
            )}
            {status === "idle" && (
              <>
                <p className="font-medium text-charcoal">
                  Drag &amp; drop a file here
                </p>
                <p className="text-muted-foreground">or click to browse</p>
              </>
            )}
          </div>

          {fileName && status !== "done" && status !== "memorized" && (
            <p className="text-xs text-muted-foreground">{fileName}</p>
          )}

          {/* Show Memorize button after upload */}
          {status === "uploaded" && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleMemorize();
              }}
              className="mt-4 bg-sage text-white hover:bg-sage/90"
            >
              Memorize
            </Button>
          )}
        </div>

        {/* Hidden input that actually accepts the file selection. */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            // Reset so selecting the same file again still fires onChange.
            e.target.value = "";
          }}
        />

        {error && (
          <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
