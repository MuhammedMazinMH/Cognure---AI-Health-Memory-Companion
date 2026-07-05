// POST /api/family/revoke
// Deletes a share row. Only the owner can revoke their own shares.
//
// Body: { shareId: string }
// Returns: { success: true }

import { NextResponse } from "next/server";
import {
  getServerSupabase,
  getServiceRoleSupabase,
  getTokenFromRequest,
} from "@/lib/supabase-client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify identity with the user-scoped client (anon key + JWT).
  const supabase = getServerSupabase(token);
  // Service-role client bypasses RLS for table deletes (created at request time).
  const serviceSupabase = getServiceRoleSupabase(token);

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

  // owner_user_id filter ensures only the owner can ever delete their own shares,
  // even with the service role client.
  const { error } = await serviceSupabase
    .from("family_shares")
    .delete()
    .eq("id", shareId)
    .eq("owner_user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
