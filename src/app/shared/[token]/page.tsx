"use client";

// Public, read-only shared view.
// A family member opens this page via /shared/<access_token>. If the token maps
// to an active, non-expired share, we render the owner's Memory Graph and
// Timeline in read-only mode — no upload, chat, or edit controls.

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { MemoryGraph } from "@/components/memory-graph";
import { HealthTimeline } from "@/components/health-timeline";
import { Brain, Lock, Network, Clock, Eye } from "lucide-react";
import type { HealthEntity, Memory } from "@/types";

type LoadState = "loading" | "valid" | "invalid";

export default function SharedViewPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [state, setState] = useState<LoadState>("loading");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [tab, setTab] = useState<"graph" | "timeline">("graph");

  const load = useCallback(async () => {
    if (!token) {
      setState("invalid");
      return;
    }
    setState("loading");
    try {
      const res = await fetch(`/api/shared/${token}`);
      const data = (await res.json()) as {
        valid?: boolean;
        memories?: Memory[];
      };
      if (!res.ok || !data.valid) {
        setState("invalid");
        return;
      }
      setMemories(data.memories ?? []);
      setState("valid");
    } catch {
      setState("invalid");
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const allEntities: HealthEntity[] = memories.flatMap((m) => m.entities ?? []);
  const hasMemories = memories.length > 0;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Brain className="h-8 w-8 animate-pulse text-sage" />
          <p className="text-sm text-charcoal/40">Loading shared health memory…</p>
        </div>
      </main>
    );
  }

  // ── Invalid / expired ─────────────────────────────────────────────────────────
  if (state === "invalid") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-coral/10">
            <Lock className="h-8 w-8 text-coral" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-charcoal">
            This link has expired or been revoked
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-charcoal/50">
            The shared health memory you&apos;re trying to view is no longer
            available. Please ask the owner to send you a new invitation.
          </p>
        </div>
      </main>
    );
  }

  // ── Valid read-only view ──────────────────────────────────────────────────────
  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage/10">
              <Brain className="h-5 w-5 text-sage" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold text-charcoal">
                Cognure — Shared Memory
              </h1>
              <p className="text-xs text-charcoal/45">
                A family member has shared their health memory with you.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-charcoal/55">
            <Eye className="h-3.5 w-3.5" />
            Read-only
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-card px-6">
        <div className="mx-auto flex max-w-5xl gap-1">
          <TabButton
            active={tab === "graph"}
            onClick={() => setTab("graph")}
            icon={<Network className="h-4 w-4" />}
            label="Memory Graph"
          />
          <TabButton
            active={tab === "timeline"}
            onClick={() => setTab("timeline")}
            icon={<Clock className="h-4 w-4" />}
            label="Timeline"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0">
        {!hasMemories ? (
          <div className="flex h-full items-center justify-center px-6 py-20">
            <div className="max-w-sm text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sage/10">
                <Network className="h-8 w-8 text-sage" />
              </div>
              <h2 className="font-heading text-xl font-bold text-charcoal">
                Nothing to show yet
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/50">
                This person hasn&apos;t added any health memories yet. Check back
                later.
              </p>
            </div>
          </div>
        ) : tab === "graph" ? (
          <div className="h-[calc(100vh-8.5rem)]">
            <MemoryGraph entities={allEntities} />
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-6 py-8">
            <HealthTimeline memories={memories} />
          </div>
        )}
      </div>
    </main>
  );
}

// ── Tab button ──────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "flex items-center gap-2 border-b-2 border-sage px-4 py-3 text-sm font-semibold text-sage"
          : "flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-charcoal/45 hover:text-charcoal"
      }
    >
      {icon}
      {label}
    </button>
  );
}
