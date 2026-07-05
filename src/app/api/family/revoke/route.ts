// POST /api/family/revoke
// Deletes a share row. Only the owner can revoke their own shares.
//
// Body: { shareId: string }
// Returns: { success: true }

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

  // Only the owner can revoke their own shares (the owner_user_id filter ensures this)
  const { error } = await supabase
    .from("family_shares")
    .delete()
    .eq("id", shareId)
    .eq("owner_user_id", user.id);

  if (error) {
    console.error("[family/revoke] Delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
