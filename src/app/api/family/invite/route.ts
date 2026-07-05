// POST /api/family/invite
// Invite a family member by email. Creates an active share row with a unique
// access token that can be used to open the read-only shared view.
//
// Body: { email: string }
// Returns: { success: true, share: { id, shared_email, status, access_token } }

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lazy-initialize the service role client at request time
function getServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function POST(request: Request) {
  const supabase = getServiceRoleClient();
  // Get the user's access token from the Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = authHeader.substring(7); // Remove "Bearer " prefix

  // Verify the user with the service role client, passing the access token
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse + validate body
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

  // Prevent duplicate active invites for the same email
  const { data: existing, error: lookupError } = await supabase
    .from("family_shares")
    .select("id")
    .eq("owner_user_id", user.id)
    .eq("shared_email", email)
    .maybeSingle();

  if (lookupError) {
    console.error("[family/invite] Lookup error:", lookupError);
    return NextResponse.json(
      { error: "Failed to check existing shares." },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json(
      { error: "This person already has access." },
      { status: 409 }
    );
  }

  // Generate the access token for the shared link
  const shareAccessToken = randomUUID();

  const { data: share, error: insertError } = await supabase
    .from("family_shares")
    .insert({
      owner_user_id: user.id,
      shared_email: email,
      status: "active",
      access_token: shareAccessToken,
    })
    .select("id, shared_email, status, access_token")
    .single();

  if (insertError) {
    console.error("[family/invite] Insert error:", insertError);
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
