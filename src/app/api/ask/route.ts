// POST /api/ask
// Body: { question: string }
//
// Answers a question about the user's health memory:
//   1) Recalls relevant context from Cognee (cogneeRecall).
//   2) Asks Groq to write an answer using ONLY that context.

import { NextResponse } from "next/server";
import { cogneeRecall } from "@/lib/cognee-client";
import { generateAnswer } from "@/lib/groq-client";
import { getServerSupabase, getTokenFromRequest } from "@/lib/supabase-client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const startTime = Date.now();
  console.log("\n=== POST /api/ask ===");
  console.log(`[${new Date().toISOString()}] Request received`);

  try {
    // 1) Authenticate the user.
    const token = getTokenFromRequest(request);
    if (!token) {
      console.log("[ask] ❌ No auth token");
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const supabase = getServerSupabase(token);
    console.log("[ask] Verifying user token...");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("[ask] ❌ Invalid session:", userError);
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    console.log(`[ask] ✓ User authenticated: ${user.email}`);

    // 2) Read the question from the body.
    const body = await request.json();
    const question: string = body?.question ?? "";

    console.log(`[ask] Question: "${question}"`);

    if (!question.trim()) {
      console.log("[ask] ❌ Empty question");
      return NextResponse.json(
        { error: "Please ask a question." },
        { status: 400 }
      );
    }

    // 3) Recall context from Cognee, then generate a grounded answer.
    console.log("[ask] Recalling context...");
    const recall = await cogneeRecall(question);
    console.log(`[ask] ✓ Context length: ${recall.context.length} chars`);

    let context = recall.context;
    
    // Fallback: If Cognee returns empty context, search Supabase memories table
    if (!context || context.trim().length === 0) {
      console.log("[ask] Cognee returned empty context, trying Supabase fallback...");
      
      // Extract keywords from question (split on whitespace, filter short words)
      const keywords = question
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length >= 3);
      
      console.log(`[ask] Extracted keywords:`, keywords);

      if (keywords.length > 0) {
        // Build OR conditions for ILIKE search
        const orConditions = keywords
          .map((kw) => `text.ilike.%${kw}%,entities.cs.{"name":"${kw}"}`)
          .join(",");

        const { data: memories, error: memoryError } = await supabase
          .from("memories")
          .select("*")
          .eq("user_id", user.id)
          .or(orConditions)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!memoryError && memories && memories.length > 0) {
          console.log(`[ask] ✓ Found ${memories.length} memories in fallback`);
          // Build context from found memories
          context = memories.map((m: { text: string }) => m.text).join("\n\n");
        } else {
          console.log("[ask] No memories found in fallback search");
          
          // Check if user has any documents at all
          const { data: documents, error: docError } = await supabase
            .from("documents")
            .select("id")
            .eq("user_id", user.id)
            .limit(1);

          if (!docError && documents && documents.length > 0) {
            // User has documents but no memories extracted
            context = "I can see your documents, but I need to extract the medical details first. Please go to Documents and click 'Memorize' on each uploaded file.";
          } else {
            // User has no documents at all
            context = "I don't have any medical documents yet. Upload some documents to get started!";
          }
        }
      }
    }

    console.log(`[ask] Final context length: ${context.length} chars`);
    console.log("[ask] Generating answer...");
    const answer = await generateAnswer(question, context);
    console.log(`[ask] ✓ Answer length: ${answer.length} chars`);

    const elapsed = Date.now() - startTime;
    console.log(`[ask] ✓ Success! Completed in ${elapsed}ms\n`);

    return NextResponse.json({ answer, context });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error.";
    console.error(`[ask] ❌ Exception after ${elapsed}ms:`, error);
    return NextResponse.json(
      { error: `Ask failed: ${message}` },
      { status: 500 }
    );
  }
}
