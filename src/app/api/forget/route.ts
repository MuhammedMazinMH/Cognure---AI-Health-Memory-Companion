// POST /api/forget
// Body: { memoryId: string }
//
// Permanently deletes a memory: first from Cognee (cogneeForget), then from
// our Supabase `memories` table.

import { NextResponse } from "next/server";
import { cogneeForget } from "@/lib/cognee-client";
import { getServerSupabase, getTokenFromRequest } from "@/lib/supabase-client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const startTime = Date.now();
  console.log("\n=== POST /api/forget ===");
  console.log(`[${new Date().toISOString()}] Request received`);

  try {
    // 1) Authenticate the user.
    const token = getTokenFromRequest(request);
    if (!token) {
      console.log("[forget] ❌ No auth token");
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const supabase = getServerSupabase(token);
    console.log("[forget] Verifying user token...");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("[forget] ❌ Invalid session:", userError);
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    console.log(`[forget] ✓ User authenticated: ${user.email}`);

    // 2) Read and validate the body.
    const body = await request.json();
    const memoryId: string = body?.memoryId ?? "";

    console.log(`[forget] Memory ID: ${memoryId}`);

    if (!memoryId) {
      console.log("[forget] ❌ Missing memoryId");
      return NextResponse.json(
        { error: "'memoryId' is required." },
        { status: 400 }
      );
    }

    // 3) Look up the memory to get its Cognee id (and confirm ownership).
    console.log("[forget] Fetching existing memory...");
    const { data: existing, error: findError } = await supabase
      .from("memories")
      .select("*")
      .eq("id", memoryId)
      .eq("user_id", user.id)
      .single();

    if (findError || !existing) {
      console.log("[forget] ❌ Memory not found:", findError);
      return NextResponse.json(
        { error: "Memory not found." },
        { status: 404 }
      );
    }

    console.log(`[forget] ✓ Found memory, cognee_id: ${existing.cognee_id}`);

    // 4) Tell Cognee to forget it.
    console.log("[forget] Calling cogneeForget...");
    await cogneeForget(existing.cognee_id ?? memoryId);
    console.log("[forget] ✓ Cognee forget complete");

    // 5) Delete our own copy.
    console.log("[forget] Deleting from Supabase...");
    const { error: deleteError } = await supabase
      .from("memories")
      .delete()
      .eq("id", memoryId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.log("[forget] ❌ Database delete failed:", deleteError);
      return NextResponse.json(
        { error: `Deleting memory failed: ${deleteError.message}` },
        { status: 500 }
      );
    }

    const elapsed = Date.now() - startTime;
    console.log(`[forget] ✓ Success! Completed in ${elapsed}ms\n`);

    return NextResponse.json({ success: true });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error.";
    console.error(`[forget] ❌ Exception after ${elapsed}ms:`, error);
    return NextResponse.json(
      { error: `Forget failed: ${message}` },
      { status: 500 }
    );
  }
}
