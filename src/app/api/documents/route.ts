// GET /api/documents
// Returns all documents for the authenticated user.
// This is safer than querying Supabase directly from the frontend because:
// 1. We control authentication here (verify the token)
// 2. We can add extra filtering, sorting, or business logic
// 3. It's easier to debug and log

import { NextResponse } from "next/server";
import { getServerSupabase, getTokenFromRequest } from "@/lib/supabase-client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const startTime = Date.now();
  console.log("\n=== GET /api/documents ===");
  console.log(`[${new Date().toISOString()}] Request received`);

  try {
    // 1) Make sure the user is logged in by checking for their access token.
    const token = getTokenFromRequest(request);
    if (!token) {
      console.log("[documents] ❌ No auth token");
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    // 2) Create a Supabase client with the user's token.
    //    This makes Row Level Security work - the user will only see
    //    their own documents even though we're on the server.
    const supabase = getServerSupabase(token);
    console.log("[documents] Verifying user token...");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("[documents] ❌ Invalid session:", userError);
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    console.log(`[documents] ✓ User authenticated: ${user.email}`);

    // 3) Fetch all documents for this user, newest first.
    console.log("[documents] Fetching from database...");
    const { data: documents, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.log("[documents] ❌ Database query failed:", fetchError);
      return NextResponse.json(
        { error: `Failed to fetch documents: ${fetchError.message}` },
        { status: 500 }
      );
    }

    const elapsed = Date.now() - startTime;
    console.log(`[documents] ✓ Success! Found ${documents?.length ?? 0} documents`);
    console.log(`[documents] Completed in ${elapsed}ms\n`);

    // 4) Return the documents as JSON.
    return NextResponse.json({ documents: documents ?? [] });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error.";
    console.error(`[documents] ❌ Exception after ${elapsed}ms:`, error);
    return NextResponse.json(
      { error: `Failed to fetch documents: ${message}` },
      { status: 500 }
    );
  }
}
