"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { MemoryGraph } from "@/components/memory-graph";
import { UploadModal } from "@/components/upload-modal";
import { Brain, Network, Plus } from "lucide-react";
import type { HealthEntity, Memory } from "@/types";

export default function DashboardPage() {
  const supabase = getBrowserSupabase();

  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [firstName, setFirstName] = useState<string>("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const fullName = (user?.user_metadata?.full_name as string) ?? "";
      setFirstName(fullName.split(" ")[0] ?? "");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      try {
        const res = await fetch("/api/memories", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMemories((data.memories as Memory[]) ?? []);
        }
      } catch {
        // Non-fatal — graph renders with no data.
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const allEntities: HealthEntity[] = memories.flatMap((m) => m.entities ?? []);
  const hasMemories = memories.length > 0;

  // Quick stats for the summary bar.
  const stats = {
    memories: memories.length,
    entities: allEntities.length,
    medications: allEntities.filter((e) => e.type === "medication").length,
    diagnoses: allEntities.filter((e) => e.type === "diagnosis").length,
  };

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Page header */}
      <div className="border-b border-border bg-card px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-charcoal">
              {firstName ? `Good to see you, ${firstName}` : "Memory Graph"}
            </h1>
            <p className="mt-0.5 text-sm text-charcoal/50">
              {hasMemories
                ? "Your health knowledge graph — click any node to explore."
                : "Upload a document to start building your graph."}
            </p>
          </div>
        </div>

        {/* Quick stats — only show when there's data */}
        {hasMemories && !loading && (
          <div className="mt-4 flex flex-wrap gap-3">
            <StatPill label="Memories" value={stats.memories} />
            <StatPill label="Entities" value={stats.entities} />
            <StatPill label="Medications" value={stats.medications} />
            <StatPill label="Diagnoses" value={stats.diagnoses} />
          </div>
        )}
      </div>

      {/* Graph area */}
      <div className="relative flex-1 min-h-0">
        {/* Loading skeleton */}
        {loading && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Brain className="h-8 w-8 animate-pulse text-sage" />
              <p className="text-sm text-charcoal/40">Loading your memory graph…</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasMemories && (
          <div className="flex h-full items-center justify-center px-6">
            <div className="max-w-sm text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sage/10">
                <Network className="h-8 w-8 text-sage" />
              </div>
              <h2 className="font-heading text-xl font-bold text-charcoal">
                Your graph is empty
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/50">
                Upload a medical document — a lab report, prescription, or
                discharge summary — and Cognure will extract your health
                entities automatically.
              </p>
              <div className="mt-6">
                <UploadModal
                  trigger={
                    <button className="inline-flex items-center gap-2 rounded-xl bg-sage px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sage/90">
                      <Plus className="h-4 w-4" />
                      Upload your first document
                    </button>
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* The graph */}
        {!loading && (
          <div className="h-full">
            <MemoryGraph entities={hasMemories ? allEntities : undefined} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs">
      <span className="font-bold text-charcoal">{value}</span>
      <span className="text-charcoal/45">{label}</span>
    </div>
  );
}
