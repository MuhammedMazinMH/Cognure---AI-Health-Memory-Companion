// GET /api/shared/[token]
// Public (unauthenticated) endpoint that powers the read-only shared view.
//
// It looks up a share row by its access_token, verifies the share is still
// active and not expired, and — if valid — returns the owner's memories so a
// family member can view the Memory Graph and Timeline in read-only mode.
//
// Returns:
//   { valid: true, memories: [...] }        when the link is good
//   { valid: false }                        when the link is expired/revoked
//
// Uses the anonymous Supabase client, so it relies on the Row Level Security
// policies configured for shared/read access on `family_shares` and `memories`.

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-client";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  // Anonymous client — no user token. RLS decides what is readable.
  const supabase = getServerSupabase();

  // 1) Find the share by its access token.
  const { data: share, error: shareError } = await supabase
    .from("family_shares")
    .select("owner_user_id, status, expires_at")
    .eq("access_token", token)
    .maybeSingle();

  if (shareError || !share) {
    return NextResponse.json({ valid: false });
  }

  // 2) Validate status + expiry.
  const isActive = share.status === "active";
  const notExpired =
    !share.expires_at || new Date(share.expires_at).getTime() > Date.now();

  if (!isActive || !notExpired) {
    return NextResponse.json({ valid: false });
  }

  // 3) Fetch the owner's memories for the read-only view.
  const { data: memories, error: memError } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", share.owner_user_id)
    .order("created_at", { ascending: false });

  if (memError) {
    // The link is valid but we couldn't read the data (e.g. RLS). Treat the
    // link as valid but return an empty set so the view still renders.
    return NextResponse.json({ valid: true, memories: [] });
  }

  return NextResponse.json({ valid: true, memories: memories ?? [] });
}
