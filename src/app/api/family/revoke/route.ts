// POST /api/family/revoke
// Deletes a share row. Only the owner can revoke their own shares.
//
// Body: { shareId: string }
// Returns: { success: true }

import { NextResponse } from "next/server";
import { getServerSupabase, getTokenFromRequest } from "@/lib/supabase-client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase(token);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { shareId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const shareId = (body.shareId ?? "").trim();
  if (!shareId) {
    return NextResponse.json({ error: "A share id is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("family_shares")
    .delete()
    .eq("id", shareId)
    .eq("owner_user_id", user.id); // Owner-scoped: only the owner can revoke.

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
