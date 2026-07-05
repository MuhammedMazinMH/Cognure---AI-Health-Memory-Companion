// GET /api/family/list
// Returns every share row owned by the current user.
// Returns: { shares: [...] }

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

export async function GET(request: Request) {
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

  const { data: shares, error } = await supabase
    .from("family_shares")
    .select("id, shared_email, status, access_token, created_at, expires_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[family/list] Query error:", error);
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
