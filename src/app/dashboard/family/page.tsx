"use client";

// Family Sharing page.
// Lets the current user invite trusted contacts (by email) to view their
// health memory. Access is read-only for invitees.
// Data is stored in the `family_shares` Supabase table.

import { useEffect, useState, useCallback } from "react";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UserPlus,
  Users,
  Trash2,
  Loader2,
  AlertCircle,
  Mail,
  Clock,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FamilyShare {
  id: string;
  invited_email: string;
  status: "pending" | "accepted";
  created_at: string;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FamilyPage() {
  const supabase = getBrowserSupabase();

  const [shares, setShares] = useState<FamilyShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form state.
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Revoke state — tracks which share id is being deleted.
  const [revoking, setRevoking] = useState<string | null>(null);

  // Fetches the current share list from the API.
  const loadShares = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please sign in.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/family", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to load family members");
      }

      const data = await res.json();
      setShares(data.shares ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadShares(); }, [loadShares]);

  // Send an invite.
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in.");

      const res = await fetch("/api/family", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite");

      setInviteEmail("");
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 4000);
      await loadShares();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  // Revoke a share.
  async function handleRevoke(id: string) {
    setRevoking(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(`/api/family?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      await loadShares();
    } finally {
      setRevoking(null);
    }
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch { return iso; }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="border-b border-border bg-card px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage/10">
            <Users className="h-5 w-5 text-sage" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-charcoal">
              Family Sharing
            </h1>
            <p className="mt-0.5 text-sm text-charcoal/50">
              Invite trusted contacts to view your health memory (read-only).
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Invite card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-1 font-heading text-base font-semibold text-charcoal">
              Invite a family member
            </h2>
            <p className="mb-4 text-sm text-charcoal/45">
              Enter their email address. They will be able to view (but not
              edit) your health memory.
            </p>

            <form onSubmit={handleInvite} className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="invite-email" className="text-sm font-medium text-charcoal">
                  Email address
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="family@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  disabled={inviting}
                  className="h-10 rounded-xl border-border"
                />
              </div>
              <Button
                type="submit"
                disabled={inviting || !inviteEmail}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-sage px-4 text-sm font-semibold text-white shadow-sm hover:bg-sage/90 disabled:opacity-50"
              >
                {inviting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {inviting ? "Inviting…" : "Invite"}
              </Button>
            </form>

            {inviteError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-coral/30 bg-coral/8 px-4 py-2.5 text-sm text-coral">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div className="mt-3 rounded-xl border border-sage/30 bg-sage/8 px-4 py-2.5 text-sm text-sage">
                Invite sent successfully.
              </div>
            )}
          </div>

          {/* Members list */}
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-heading text-base font-semibold text-charcoal">
                People with access
              </h2>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-charcoal/50">
                {shares.length}
              </span>
            </div>

            {error && (
              <div className="m-4 flex items-center gap-2 rounded-xl border border-coral/30 bg-coral/8 px-4 py-2.5 text-sm text-coral">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-sage" />
              </div>
            )}

            {!loading && shares.length === 0 && !error && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage/10">
                  <Users className="h-6 w-6 text-sage" />
                </div>
                <p className="text-sm font-medium text-charcoal">No one has access yet</p>
                <p className="text-xs text-charcoal/40">
                  Invite a trusted contact using the form above.
                </p>
              </div>
            )}

            {!loading && shares.length > 0 && (
              <ul className="divide-y divide-border">
                {shares.map((share) => (
                  <li
                    key={share.id}
                    className="flex items-center gap-4 px-6 py-4"
                  >
                    {/* Avatar */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lavender/20 text-sm font-bold text-lavender">
                      {share.invited_email.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium text-charcoal">
                        <Mail className="h-3.5 w-3.5 text-charcoal/30" />
                        {share.invited_email}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-charcoal/40">
                        <Clock className="h-3 w-3" />
                        Invited {formatDate(share.created_at)}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={
                        share.status === "accepted"
                          ? "rounded-full bg-sage/15 px-2.5 py-0.5 text-xs font-medium text-sage"
                          : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-charcoal/40"
                      }
                    >
                      {share.status === "accepted" ? "Active" : "Pending"}
                    </span>

                    {/* Revoke button */}
                    <button
                      onClick={() => handleRevoke(share.id)}
                      disabled={revoking === share.id}
                      aria-label={`Revoke access for ${share.invited_email}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-charcoal/30 transition-colors hover:bg-coral/10 hover:text-coral disabled:opacity-40"
                    >
                      {revoking === share.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Info note */}
          <div className="rounded-xl border border-border bg-sage/5 px-5 py-4 text-sm text-charcoal/55">
            <strong className="text-charcoal">About family sharing.</strong>{" "}
            Invited contacts can view your memory graph, timeline, and chat
            history in read-only mode. They cannot upload documents, edit
            entities, or modify any of your data. You can revoke access at any
            time.
          </div>
        </div>
      </div>
    </div>
  );
}
