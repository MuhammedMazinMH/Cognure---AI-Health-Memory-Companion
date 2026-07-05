"use client";

import { useEffect, useState } from "react";
import { FileText, FileType, Plus, AlertCircle, FolderOpen } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { UploadModal } from "@/components/upload-modal";
import type { Document } from "@/types";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const supabase = getBrowserSupabase();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("Please sign in to view your documents.");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/documents", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Failed to load documents");
        }
        const data = await res.json();
        setDocuments(data.documents);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load documents");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="border-b border-border bg-card px-6 py-5">
        <h1 className="font-heading text-2xl font-bold text-charcoal">Documents</h1>
        <p className="mt-0.5 text-sm text-charcoal/50">
          {documents.length > 0
            ? `${documents.length} document${documents.length !== 1 ? "s" : ""} uploaded`
            : "All your uploaded health documents live here."}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-coral">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Skeletons */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border bg-card p-5"
              >
                <div className="mb-3 h-8 w-8 rounded-lg bg-muted" />
                <div className="mb-2 h-3.5 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/3 rounded bg-muted" />
                <div className="mt-3 h-3 w-full rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && documents.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage/10">
              <FolderOpen className="h-7 w-7 text-sage" />
            </div>
            <div>
              <p className="font-semibold text-charcoal">No documents yet</p>
              <p className="mt-1 text-sm text-charcoal/45">
                Upload a PDF or TXT to start extracting your health entities.
              </p>
            </div>
            <UploadModal
              trigger={
                <button className="inline-flex items-center gap-2 rounded-xl bg-sage px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sage/90">
                  <Plus className="h-4 w-4" />
                  Upload your first document
                </button>
              }
            />
          </div>
        )}

        {/* Document grid */}
        {!loading && documents.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => {
              const isPdf = doc.file_type.includes("pdf");
              const Icon = isPdf ? FileType : FileText;
              return (
                <article
                  key={doc.id}
                  className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage/10">
                      <Icon className="h-5 w-5 text-sage" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-charcoal">
                        {doc.file_name}
                      </p>
                      <p className="text-xs text-charcoal/40">
                        {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  {doc.content && (
                    <p className="line-clamp-3 text-xs leading-relaxed text-charcoal/50">
                      {doc.content.slice(0, 160)}
                    </p>
                  )}
                  {!doc.content && (
                    <p className="text-xs italic text-charcoal/30">
                      No text extracted.
                    </p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-charcoal/40">
                      {isPdf ? "PDF" : "TXT"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
