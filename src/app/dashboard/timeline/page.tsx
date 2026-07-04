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
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-charcoal">
          Health Timeline
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A chronological record of your health events, grouped by month.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-coral bg-coral/10 p-4 text-coral">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="ml-3 h-24 rounded-xl bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Symptom Trend section */}
          <div className="mb-10">
            <h2 className="mb-1 font-heading text-xl font-semibold text-charcoal">
              Symptom Trends
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Confidence scores tracked across documents. Higher confidence means
              the symptom is mentioned more definitively.
            </p>
            <SymptomTrends memories={memories} />
          </div>

          {/* Divider */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              All Events
            </span>
            <div className="flex-1 border-t border-border" />
          </div>

          <HealthTimeline memories={memories} />
        </>
      )}
    </div>
  );
}
