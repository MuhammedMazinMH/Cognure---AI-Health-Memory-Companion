// The Timeline page shows the user's memories in the order they were created,
// newest first, like a health journal.
//
// IMPORTANT: This component fetches data through our API route (/api/memories)
// instead of querying Supabase directly. This avoids 403 Forbidden errors
// that happen when the browser client isn't properly authenticated.
"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-client";
import type { Memory } from "@/types";

// Turns an ISO date string into something friendly like "Jun 26, 2026, 3:40 PM".
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

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
        // Get the current user's session so we can send their access token
        // to our API route. This proves who they are.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setError("Please sign in to view your timeline.");
          setLoading(false);
          return;
        }

        // Fetch memories through our secure API route instead of directly
        // querying Supabase. This avoids Row Level Security issues.
        console.log("[Timeline] Fetching memories from API...");
        const response = await fetch("/api/memories", {
          headers: {
            // Send the access token so the API knows who we are
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load memories");
        }

        const data = await response.json();
        console.log(`[Timeline] ✓ Loaded ${data.memories.length} memories`);
        setMemories(data.memories);
      } catch (err) {
        console.error("[Timeline] Failed to load:", err);
        setError(err instanceof Error ? err.message : "Failed to load timeline");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [supabase]);

  return (
    <div className="p-6">
      <h1 className="mb-4 font-heading text-3xl font-bold text-charcoal">
        Timeline
      </h1>

      {error && (
        <div className="rounded-lg border border-coral bg-coral/10 p-4 text-coral">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading your history…</p>
      ) : memories.length === 0 ? (
        <p className="text-muted-foreground">
          No memories yet. Add one with the "Add Memory" button.
        </p>
      ) : (
        // A simple vertical timeline using a left border as the "rail".
        <ol className="relative ml-3 border-l border-border">
          {memories.map((memory) => (
            <li key={memory.id} className="mb-8 ml-6">
              {/* Dot on the rail. */}
              <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-sage text-white">
                <Clock className="h-3.5 w-3.5" />
              </span>

              <time className="text-xs font-medium text-muted-foreground">
                {formatDate(memory.created_at)}
              </time>

              <div className="mt-2 rounded-xl border bg-card p-4 shadow-sm">
                {/* Show the first 220 characters of the remembered text. */}
                <p className="text-sm text-charcoal">
                  {memory.text.length > 220
                    ? `${memory.text.slice(0, 220)}…`
                    : memory.text}
                </p>

                {/* Little colored tags for the entities found in this memory. */}
                {memory.entities && memory.entities.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {memory.entities.map((entity, index) => (
                      <span
                        key={`${memory.id}-${index}`}
                        className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-charcoal"
                      >
                        {entity.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
