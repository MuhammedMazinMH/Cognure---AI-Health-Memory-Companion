// GET /api/family/list
// Returns every share row owned by the current user.
// Returns: { shares: [...] }

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabase, getTokenFromRequest } from "@/lib/supabase-client";

export const runtime = "nodejs";

// Service-role client bypasses RLS for table reads.
const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify identity with the user-scoped client (anon key + JWT).
  const supabase = getServerSupabase(token);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: shares, error } = await serviceSupabase
    .from("family_shares")
    .select("id, shared_email, status, access_token, created_at, expires_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (
      error.code === "42P01" ||
      error.message.includes("does not exist") ||
      error.message.includes("schema cache")
    ) {
      return NextResponse.json(
        { error: "Family sharing setup is in progress. Please refresh." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ shares: shares ?? [] });
}
