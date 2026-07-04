"use client";

// PDF Health Report Generator
//
// The report is rendered client-side into a styled div, then printed via
// window.print(). A print-specific CSS class hides the UI chrome and
// expands the report to full width — giving a clean, professional PDF
// when the user saves from the print dialog.
//
// No server-side PDF library is used, which keeps this fully Vercel-compatible.

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-client";
import type { HealthEntity, Memory } from "@/types";
import { Printer, Loader2, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

type EntityGroup = {
  type: string;
  label: string;
  color: string;
  entities: HealthEntity[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ENTITY_GROUPS: Omit<EntityGroup, "entities">[] = [
  { type: "medication", label: "Medications", color: "#5b8def" },
  { type: "diagnosis", label: "Diagnoses", color: "#9b6dc9" },
  { type: "symptom", label: "Symptoms", color: "#e07a5f" },
  { type: "procedure", label: "Procedures", color: "#4caf7d" },
  { type: "provider", label: "Providers", color: "#e8983b" },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// ── Page component ────────────────────────────────────────────────────────────

export default function ReportPage() {
  const supabase = getBrowserSupabase();
  const printRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("Please sign in to generate a report.");
          setLoading(false);
          return;
        }

        setUserEmail(session.user.email ?? "");
        setUserName((session.user.user_metadata?.full_name as string) ?? "");

        const res = await fetch("/api/memories", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Failed to load memories");
        }
        const data = await res.json();
        setMemories(data.memories ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  // Build deduplicated entity groups from all memories.
  const entityGroups: EntityGroup[] = ENTITY_GROUPS.map((g) => {
    const seen = new Set<string>();
    const entities: HealthEntity[] = [];

    for (const mem of memories) {
      for (const entity of mem.entities ?? []) {
        if (entity.type === g.type) {
          const key = entity.name.toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            entities.push(entity);
          }
        }
      }
    }

    // Sort by confidence descending so the most certain entities come first.
    entities.sort((a, b) => b.confidence - a.confidence);
    return { ...g, entities };
  });

  const totalEntities = entityGroups.reduce((s, g) => s + g.entities.length, 0);

  // Print / save as PDF using the browser's native print dialog.
  function handlePrint() {
    setPrinting(true);
    requestAnimationFrame(() => {
      window.print();
      setPrinting(false);
    });
  }

  return (
    <>
      {/* ── Print-specific global styles ── */}
      <style>{`
        @media print {
          /* Hide everything except the report content */
          body > *:not(#print-root) { display: none !important; }
          #print-root { display: block !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          @page { margin: 20mm 16mm; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="flex h-full flex-col" id="print-root">
        {/* Page header (hidden during print) */}
        <div className="no-print border-b border-border bg-card px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl font-bold text-charcoal">
                Health Report
              </h1>
              <p className="mt-0.5 text-sm text-charcoal/50">
                A printable summary of your health memory.
              </p>
            </div>
            <Button
              onClick={handlePrint}
              disabled={loading || printing || !!error || totalEntities === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sage/90 disabled:opacity-50"
            >
              {printing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              {printing ? "Opening print…" : "Print / Save as PDF"}
            </Button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto bg-background p-6">
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-coral">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-sage" />
            </div>
          )}

          {!loading && !error && totalEntities === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-24 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage/10">
                <FileText className="h-7 w-7 text-sage" />
              </div>
              <div>
                <p className="font-semibold text-charcoal">No health data yet</p>
                <p className="mt-1 text-sm text-charcoal/45">
                  Upload and memorize at least one document to generate a report.
                </p>
              </div>
            </div>
          )}

          {/* ── The printable report ── */}
          {!loading && !error && totalEntities > 0 && (
            <div
              ref={printRef}
              className="mx-auto max-w-3xl rounded-2xl border border-border bg-card shadow-sm"
            >
              {/* Report header */}
              <div className="border-b border-border bg-sage/5 px-8 py-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-sage">
                      Health Memory Report
                    </p>
                    <h2 className="mt-1 font-heading text-3xl font-bold text-charcoal">
                      {userName || userEmail || "Your Health Summary"}
                    </h2>
                    {userName && userEmail && (
                      <p className="mt-0.5 text-sm text-charcoal/45">{userEmail}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-charcoal/40">
                    <p>Generated</p>
                    <p className="font-medium text-charcoal">
                      {new Date().toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Summary stats */}
                <div className="mt-5 flex flex-wrap gap-3">
                  <StatBadge label="Memories" value={memories.length} />
                  <StatBadge label="Total entities" value={totalEntities} />
                  {entityGroups
                    .filter((g) => g.entities.length > 0)
                    .map((g) => (
                      <StatBadge
                        key={g.type}
                        label={g.label}
                        value={g.entities.length}
                        color={g.color}
                      />
                    ))}
                </div>
              </div>

              {/* Entity sections */}
              <div className="divide-y divide-border">
                {entityGroups
                  .filter((g) => g.entities.length > 0)
                  .map((group) => (
                    <section key={group.type} className="px-8 py-7">
                      <div className="mb-4 flex items-center gap-2.5">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <h3 className="font-heading text-base font-semibold text-charcoal">
                          {group.label}
                        </h3>
                        <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs text-charcoal/50">
                          {group.entities.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.entities.map((e) => (
                          <div
                            key={e.name}
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5"
                          >
                            <span className="text-sm text-charcoal">{e.name}</span>
                            <span className="text-xs text-charcoal/35">
                              {Math.round(e.confidence * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
              </div>

              {/* Timeline section: last 10 memory excerpts */}
              <div className="border-t border-border px-8 py-7">
                <h3 className="mb-4 font-heading text-base font-semibold text-charcoal">
                  Recent Memory Excerpts
                </h3>
                <div className="space-y-4">
                  {[...memories]
                    .sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    )
                    .slice(0, 10)
                    .map((mem) => (
                      <div
                        key={mem.id}
                        className="rounded-xl border border-border bg-background p-4"
                      >
                        <p className="mb-1.5 text-xs font-medium text-charcoal/40">
                          {formatDate(mem.created_at)}
                        </p>
                        <p className="text-sm leading-relaxed text-charcoal/70 line-clamp-4">
                          {mem.text}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Report footer */}
              <div className="border-t border-border bg-sage/3 px-8 py-5 text-center">
                <p className="text-xs text-charcoal/30">
                  This report was automatically generated by Cognure based on
                  your uploaded health documents. It is for personal reference
                  only and does not constitute medical advice.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs">
      {color && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="font-bold text-charcoal">{value}</span>
      <span className="text-charcoal/45">{label}</span>
    </div>
  );
}
