// The Documents page lists every file the user has uploaded.
//
// IMPORTANT: This component fetches data through our API route (/api/documents)
// instead of querying Supabase directly. This avoids 403 Forbidden errors
// that happen when the browser client isn't properly authenticated.
"use client";

import { useEffect, useState } from "react";
import { FileText, FileType } from "lucide-react";
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
        // Get the current user's session so we can send their access token
        // to our API route. This proves who they are.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setError("Please sign in to view your documents.");
          setLoading(false);
          return;
        }

        // Fetch documents through our secure API route instead of directly
        // querying Supabase. This avoids Row Level Security issues.
        console.log("[Documents] Fetching documents from API...");
        const response = await fetch("/api/documents", {
          headers: {
            // Send the access token so the API knows who we are
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load documents");
        }

        const data = await response.json();
        console.log(`[Documents] ✓ Loaded ${data.documents.length} documents`);
        setDocuments(data.documents);
      } catch (err) {
        console.error("[Documents] Failed to load:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load documents"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [supabase]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold text-charcoal">
          Documents
        </h1>
        {/* Quick access to add another document. */}
        <UploadModal />
      </div>

      {error && (
        <div className="rounded-lg border border-coral bg-coral/10 p-4 text-coral">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading documents…</p>
      ) : documents.length === 0 ? (
        <p className="text-muted-foreground">
          No documents yet. Upload a PDF or TXT to get started.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => {
            // Pick an icon based on whether it is a PDF.
            const isPdf = doc.file_type.includes("pdf");
            const Icon = isPdf ? FileType : FileText;
            return (
              <div
                key={doc.id}
                className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm"
              >
                <Icon className="h-8 w-8 shrink-0 text-sage" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-charcoal">
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(doc.created_at)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {doc.content.slice(0, 120) || "No text extracted."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
