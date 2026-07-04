// Family sharing API.
//
// GET  /api/family  — list all share rows for the current user
// POST /api/family  — invite a new family member (by email)
// DELETE /api/family?id=<share_id> — revoke a share

import { NextResponse } from "next/server";
import { getServerSupabase, getTokenFromRequest } from "@/lib/supabase-client";

export const runtime = "nodejs";

// ── GET — list current family members ────────────────────────────────────────

export async function GET(request: Request) {
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

  const { data: shares, error } = await supabase
    .from("family_shares")
    .select("id, shared_email, created_at, status")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    // Return a friendly message when the table hasn't been created yet.
    if (error.code === "42P01" || error.message.includes("does not exist") || error.message.includes("schema cache")) {
      return NextResponse.json(
        { error: "Family sharing setup in progress. Please refresh." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ shares: shares ?? [] });
}

// ── POST — invite a new family member ────────────────────────────────────────

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

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  if (email === (user.email ?? "").toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot share with yourself." },
      { status: 400 }
    );
  }

  // Prevent duplicate invites.
  const { data: existing } = await supabase
    .from("family_shares")
    .select("id")
    .eq("owner_user_id", user.id)
    .eq("shared_email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "This person already has access." },
      { status: 409 }
    );
  }

  const { data: share, error: insertError } = await supabase
    .from("family_shares")
    .insert({
      owner_user_id: user.id,
      shared_email: email,
      status: "pending",
    })
    .select()
    .single();

  if (insertError) {
    // If the table doesn't exist yet, return a helpful message.
    if (
      insertError.code === "42P01" ||
      insertError.message.includes("does not exist")
    ) {
      return NextResponse.json(
        {
          error:
            "The family_shares table has not been created yet. Please run the database setup script.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ share }, { status: 201 });
}

// ── DELETE — revoke a share ───────────────────────────────────────────────────

export async function DELETE(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Share id is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("family_shares")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", user.id); // Only the owner can revoke.

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
