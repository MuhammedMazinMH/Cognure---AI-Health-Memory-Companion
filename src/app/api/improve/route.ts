// POST /api/improve
// Body: { memoryId: string, correction: string }
//
// Lets the user correct a memory. We tell Cognee to refine it
// (cogneeImprove) and append the correction to the stored text in Supabase.

import { NextResponse } from "next/server";
import { cogneeImprove } from "@/lib/cognee-client";
import { getServerSupabase, getTokenFromRequest } from "@/lib/supabase-client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const startTime = Date.now();
  console.log("\n=== POST /api/improve ===");
  console.log(`[${new Date().toISOString()}] Request received`);

  try {
    // 1) Authenticate the user.
    const token = getTokenFromRequest(request);
    if (!token) {
      console.log("[improve] ❌ No auth token");
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const supabase = getServerSupabase(token);
    console.log("[improve] Verifying user token...");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("[improve] ❌ Invalid session:", userError);
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    console.log(`[improve] ✓ User authenticated: ${user.email}`);

    // 2) Read and validate the body.
    const body = await request.json();
    const memoryId: string = body?.memoryId ?? "";
    const correction: string = body?.correction ?? "";

    console.log(`[improve] Memory ID: ${memoryId}`);
    console.log(`[improve] Correction: "${correction}"`);

    if (!memoryId || !correction.trim()) {
      console.log("[improve] ❌ Missing memoryId or correction");
      return NextResponse.json(
        { error: "Both 'memoryId' and 'correction' are required." },
        { status: 400 }
      );
    }

    // 3) Find the memory so we know its Cognee id and current text.
    console.log("[improve] Fetching existing memory...");
    const { data: existing, error: findError } = await supabase
      .from("memories")
      .select("*")
      .eq("id", memoryId)
      .eq("user_id", user.id) // make sure the memory belongs to this user
      .single();

    if (findError || !existing) {
      console.log("[improve] ❌ Memory not found:", findError);
      return NextResponse.json(
        { error: "Memory not found." },
        { status: 404 }
      );
    }

    console.log(`[improve] ✓ Found memory, cognee_id: ${existing.cognee_id}`);

    // 4) Ask Cognee to refine the memory with the correction.
    console.log("[improve] Calling cogneeImprove...");
    await cogneeImprove(existing.cognee_id ?? memoryId, correction);
    console.log("[improve] ✓ Cognee improve complete");

    // 5) Update our own copy: append the correction so the history is kept.
    const updatedText = `${existing.text}\n\n[Correction]: ${correction}`;
    console.log("[improve] Updating Supabase...");
    const { data: memory, error: updateError } = await supabase
      .from("memories")
      .update({ text: updatedText })
      .eq("id", memoryId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.log("[improve] ❌ Database update failed:", updateError);
      return NextResponse.json(
        { error: `Updating memory failed: ${updateError.message}` },
        { status: 500 }
      );
    }

    const elapsed = Date.now() - startTime;
    console.log(`[improve] ✓ Success! Completed in ${elapsed}ms\n`);

    return NextResponse.json({ memory });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error.";
    console.error(`[improve] ❌ Exception after ${elapsed}ms:`, error);
    return NextResponse.json(
      { error: `Improve failed: ${message}` },
      { status: 500 }
    );
  }
}
