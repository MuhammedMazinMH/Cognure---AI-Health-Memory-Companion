// The home of the dashboard, reached from the "Memory Graph" nav item.
// It greets the user, then shows their health knowledge graph. If they have
// no memories yet, it shows a friendly empty state with an upload call-to-action.
//
// IMPORTANT: This component fetches data through our API route (/api/memories)
// instead of querying Supabase directly. This avoids 403 Forbidden errors.
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { MemoryGraph } from "@/components/memory-graph";
import { UploadModal } from "@/components/upload-modal";
import type { HealthEntity, Memory } from "@/types";

export default function DashboardPage() {
  const supabase = getBrowserSupabase();

  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [firstName, setFirstName] = useState<string>("");

  useEffect(() => {
    async function load() {
      // Find out the user's name for a personal greeting.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const fullName = (user?.user_metadata?.full_name as string) ?? "";
      setFirstName(fullName.split(" ")[0] ?? "");

      // Get the session so we can send the access token to the API
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      // Load this user's memories through the API route instead of direct query
      console.log("[Dashboard] Fetching memories from API...");
      try {
        const response = await fetch("/api/memories", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[Dashboard] ✓ Loaded ${data.memories.length} memories`);
          setMemories((data.memories as Memory[]) ?? []);
        } else {
          console.error("[Dashboard] Failed to fetch memories:", response.status);
        }
      } catch (error) {
        console.error("[Dashboard] Error fetching memories:", error);
      }

      setLoading(false);
    }
    load();
  }, [supabase]);

  // Flatten every memory's entities into one list to feed the graph.
  const allEntities: HealthEntity[] = memories.flatMap(
    (memory) => memory.entities ?? []
  );

  const hasMemories = memories.length > 0;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-heading text-3xl font-bold text-charcoal">
          {firstName ? `Welcome back, ${firstName}` : "Welcome to Cognure"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          This is your living health memory. Explore the connections below.
        </p>
      </motion.div>

      {/* Empty state hint shown when there are no memories yet. */}
      {!loading && !hasMemories && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/60 p-6 text-center">
          <p className="font-medium text-charcoal">
            You haven&apos;t added any memories yet
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Upload a health document to start building your graph. The example
            below shows what your memory could look like.
          </p>
          <UploadModal />
        </div>
      )}

      {/* The graph fills the remaining space. */}
      <div className="min-h-[480px] flex-1">
        <MemoryGraph entities={hasMemories ? allEntities : undefined} />
      </div>
    </div>
  );
}
