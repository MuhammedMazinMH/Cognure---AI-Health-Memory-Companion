"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { extractTextFromPdf } from "@/lib/pdf-extract";
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

// ── Progress steps shown during auto-memorize ────────────────────────────────
type Step = "uploading" | "extracting" | "memorizing" | "done";

const STEP_LABELS: Record<Step, string> = {
  uploading: "Uploading document…",
  extracting: "Extracting text…",
  memorizing: "Memorizing entities…",
  done: "Done!",
};

function StepIndicator({
  step,
  current,
  label,
}: {
  step: Step;
  current: Step | "idle" | "error";
  label: string;
}) {
  const STEPS: Step[] = ["uploading", "extracting", "memorizing", "done"];
  const currentIdx = STEPS.indexOf(current as Step);
  const stepIdx = STEPS.indexOf(step);

  const isComplete = currentIdx > stepIdx;
  const isActive = current === step;
  const isPending = currentIdx < stepIdx || current === "idle";

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
          isComplete
            ? "bg-sage text-white"
            : isActive
            ? "bg-sage/20 text-sage ring-2 ring-sage"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isComplete ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <span>{STEPS.indexOf(step) + 1}</span>
        )}
      </div>
      <span
        className={cn(
          "text-sm",
          isActive
            ? "font-semibold text-charcoal"
            : isComplete
            ? "text-sage"
            : "text-muted-foreground"
        )}
      >
        {label}
        {isActive && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" />}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function UploadModal() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | Step | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [entityCounts, setEntityCounts] = useState<Record<string, number>>({});
  const [interactionCount, setInteractionCount] = useState(0);

  // Held between upload and memorize steps so retry is possible.
  const pendingMemorize = useRef<{ content: string; documentId: string } | null>(null);

  const resetModal = useCallback(() => {
    setStatus("idle");
    setError(null);
    setFileName(null);
    setEntityCounts({});
    setInteractionCount(0);
    pendingMemorize.current = null;
  }, []);

  // Memorize step — can be called automatically or on retry.
  const runMemorize = useCallback(
    async (content: string, documentId: string) => {
      setStatus("memorizing");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("You are not signed in. Please log in again.");
        setStatus("error");
        return;
      }

      try {
        const rememberRes = await fetch("/api/remember", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ text: content, documentId }),
        });
        const rememberData = await rememberRes.json();

        if (!rememberRes.ok) {
          throw new Error(rememberData.error ?? "Could not extract entities.");
        }

        setEntityCounts(rememberData.count ?? {});
        setInteractionCount((rememberData.interactions ?? []).length);
        setStatus("done");
        router.refresh();

        // Auto-close after 2.5 s.
        setTimeout(() => {
          setOpen(false);
          resetModal();
        }, 2500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Entity extraction failed.");
        setStatus("error");
      }
    },
    [supabase, router, resetModal]
  );

  // Full flow: extract PDF text → upload → memorize.
  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);
      pendingMemorize.current = null;

      const isAllowed =
        file.type === "application/pdf" ||
        file.type === "text/plain" ||
        /\.(pdf|txt)$/i.test(file.name);

      if (!isAllowed) {
        setError("Please upload a PDF or TXT file.");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("You are not signed in. Please log in again.");
        return;
      }

      try {
        // Step 1: extract text (PDF only, in browser).
        setStatus("extracting");
        const formData = new FormData();
        formData.append("file", file);

        const isPdf =
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf");

        if (isPdf) {
          const pdfText = await extractTextFromPdf(file);
          formData.append("content", pdfText);
        }

        // Step 2: upload the file.
        setStatus("uploading");
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadData.error ?? "Upload failed.");
        }

        const { content, id: documentId } = uploadData.document;

        // Step 3: auto-memorize.
        pendingMemorize.current = { content, documentId };
        await runMemorize(content, documentId);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    },
    [supabase, runMemorize]
  );

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const busy =
    status === "uploading" ||
    status === "extracting" ||
    status === "memorizing";

  const entitySummary = Object.entries(entityCounts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${count} ${type}${count !== 1 ? "s" : ""}`)
    .join(", ");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetModal();
      }}
    >
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
            remember the important details automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone — only interactive when idle or error */}
        {(status === "idle" || status === "error") && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
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
            <UploadCloud className="h-10 w-10 text-sage" />
            <div className="text-sm">
              <p className="font-medium text-charcoal">Drag &amp; drop a file here</p>
              <p className="text-muted-foreground">or click to browse</p>
            </div>
            <p className="text-xs text-muted-foreground">PDF or TXT</p>
          </div>
        )}

        {/* Progress steps during processing */}
        {busy && (
          <div className="rounded-xl border bg-muted/30 p-5 space-y-4">
            <p className="text-sm font-medium text-charcoal mb-2">
              Processing <span className="text-sage">{fileName}</span>
            </p>
            <StepIndicator step="extracting" current={status} label="Extracting text" />
            <StepIndicator step="uploading" current={status} label="Uploading document" />
            <StepIndicator step="memorizing" current={status} label="Memorizing entities" />
            <StepIndicator step="done" current={status} label="Done!" />
          </div>
        )}

        {/* Success state */}
        {status === "done" && (
          <div className="rounded-xl border border-sage/30 bg-sage/5 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sage">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-semibold">Memorized successfully!</p>
            </div>
            <p className="text-sm text-charcoal">
              <span className="font-medium">{fileName}</span> has been processed.
            </p>
            {entitySummary && (
              <p className="text-sm text-muted-foreground">
                Found: {entitySummary}
              </p>
            )}
            {interactionCount > 0 && (
              <p className="text-sm font-medium text-red-600">
                {interactionCount} medication interaction warning
                {interactionCount !== 1 ? "s" : ""} detected — check the Memory
                Graph.
              </p>
            )}
          </div>
        )}

        {/* Error state with optional retry */}
        {status === "error" && error && (
          <div className="rounded-xl border border-coral/30 bg-coral/5 p-4 space-y-3">
            <div className="flex items-start gap-2 text-coral">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
            {pendingMemorize.current && (
              <Button
                size="sm"
                className="bg-sage text-white hover:bg-sage/90"
                onClick={() => {
                  const p = pendingMemorize.current!;
                  runMemorize(p.content, p.documentId);
                }}
              >
                Retry Memorize
              </Button>
            )}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
