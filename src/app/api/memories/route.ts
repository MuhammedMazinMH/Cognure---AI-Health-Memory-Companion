// GET /api/memories
// Returns all memories for the authenticated user.
// This is safer than querying Supabase directly from the frontend because:
// 1. We control authentication here (verify the token)
// 2. We can add extra filtering, sorting, or business logic
// 3. It's easier to debug and log

import { NextResponse } from "next/server";
import { getServerSupabase, getTokenFromRequest } from "@/lib/supabase-client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const startTime = Date.now();
  console.log("\n=== GET /api/memories ===");
  console.log(`[${new Date().toISOString()}] Request received`);

  try {
    // 1) Make sure the user is logged in by checking for their access token.
    const token = getTokenFromRequest(request);
    if (!token) {
      console.log("[memories] ❌ No auth token");
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    // 2) Create a Supabase client with the user's token.
    //    This makes Row Level Security work - the user will only see
    //    their own memories even though we're on the server.
    const supabase = getServerSupabase(token);
    console.log("[memories] Verifying user token...");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("[memories] ❌ Invalid session:", userError);
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    console.log(`[memories] ✓ User authenticated: ${user.email}`);

    // 3) Fetch all memories for this user, newest first.
    console.log("[memories] Fetching from database...");
    const { data: memories, error: fetchError } = await supabase
      .from("memories")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.log("[memories] ❌ Database query failed:", fetchError);
      return NextResponse.json(
        { error: `Failed to fetch memories: ${fetchError.message}` },
        { status: 500 }
      );
    }

    const elapsed = Date.now() - startTime;
    console.log(`[memories] ✓ Success! Found ${memories?.length ?? 0} memories`);
    console.log(`[memories] Completed in ${elapsed}ms\n`);

    // 4) Return the memories as JSON.
    return NextResponse.json({ memories: memories ?? [] });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error.";
    console.error(`[memories] ❌ Exception after ${elapsed}ms:`, error);
    return NextResponse.json(
      { error: `Failed to fetch memories: ${message}` },
      { status: 500 }
    );
  }
}
