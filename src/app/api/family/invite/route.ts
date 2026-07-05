// POST /api/family/invite
// Invite a family member by email. Creates an active share row with a unique
// access token that can be used to open the read-only shared view.
//
// Body: { email: string }
// Returns: { success: true, share: { id, shared_email, status, access_token } }

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSupabase, getTokenFromRequest } from "@/lib/supabase-client";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  // Parse + validate body.
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  if (email === (user.email ?? "").toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot share with yourself." },
      { status: 400 }
    );
  }

  // Prevent duplicate active invites for the same email.
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

  // Generate the token ourselves so we always have one to return,
  // even if the column has no database-level default.
  const accessToken = randomUUID();

  const { data: share, error: insertError } = await supabase
    .from("family_shares")
    .insert({
      owner_user_id: user.id,
      shared_email: email,
      status: "active",
      access_token: accessToken,
    })
    .select("id, shared_email, status, access_token")
    .single();

  if (insertError) {
    if (
      insertError.code === "42P01" ||
      insertError.message.includes("does not exist") ||
      insertError.message.includes("schema cache")
    ) {
      return NextResponse.json(
        { error: "Family sharing setup is in progress. Please refresh." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, share }, { status: 201 });
}
