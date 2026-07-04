// GET /api/interactions
// Returns all medication_interactions rows for the authenticated user.
// The memory graph reads this to show red warning badges on medications.

import { NextResponse } from "next/server";
import { getServerSupabase, getTokenFromRequest } from "@/lib/supabase-client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = getServerSupabase(token);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("medication_interactions")
    .select("id, medications, severity, description, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    // Table may not exist yet — return empty rather than crashing.
    console.log("[interactions] Query error (table may not exist):", error.message);
    return NextResponse.json({ interactions: [] });
  }

  return NextResponse.json({ interactions: data ?? [] });
}
