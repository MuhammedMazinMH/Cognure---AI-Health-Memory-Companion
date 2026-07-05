"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { HealthTimeline } from "@/components/health-timeline";
import { SymptomTrends } from "@/components/symptom-trends";
import type { Memory } from "@/types";

export default function TimelinePage() {
  const supabase = getBrowserSupabase();
  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setError("Please sign in to view your timeline.");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/memories", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load memories");
        }

        const data = await response.json();
        setMemories(data.memories);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load timeline"
        );
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
        <h1 className="font-heading text-2xl font-bold text-charcoal">
          Health Timeline
        </h1>
        <p className="mt-0.5 text-sm text-charcoal/50">
          A chronological record of your health events, grouped by month.
        </p>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl">
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-coral">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="h-4 w-28 rounded-full bg-muted" />
                  <div className="ml-4 h-20 rounded-2xl bg-muted" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Symptom Trends */}
              <div className="mb-10">
                <h2 className="mb-0.5 font-heading text-lg font-semibold text-charcoal">
                  Symptom Trends
                </h2>
                <p className="mb-4 text-xs text-charcoal/45">
                  Confidence scores tracked across documents. Higher = more definitive mention.
                </p>
                <SymptomTrends memories={memories} />
              </div>

              {/* Divider */}
              <div className="mb-8 flex items-center gap-3">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs font-medium uppercase tracking-widest text-charcoal/35">
                  All Events
                </span>
                <div className="flex-1 border-t border-border" />
              </div>

              <HealthTimeline memories={memories} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
