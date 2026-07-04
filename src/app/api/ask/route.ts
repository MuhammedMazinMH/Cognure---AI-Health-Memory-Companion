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
    console.log(`[ask] ✓ Cognee context length: ${recall.context.length} chars`);

    let context = recall.context;

    // Fallback: If Cognee returns empty context, search Supabase memories table
    // directly using keyword matching on the stored text and entity names.
    if (!context || context.trim().length === 0) {
      console.log("[ask] Cognee returned empty context, searching Supabase memories...");

      // Pull ALL memories for this user (memories are user-scoped and typically
      // small in number, so fetching all and filtering in JS is safe and avoids
      // broken PostgREST JSONB array syntax).
      const { data: allMemories, error: memoryError } = await supabase
        .from("memories")
        .select("id, text, entities")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (memoryError) {
        console.log("[ask] ❌ Supabase memories query error:", memoryError.message);
      }

      if (!memoryError && allMemories && allMemories.length > 0) {
        // Extract meaningful keywords from the question (length >= 3, skip
        // common stop words so "are", "the", "what" don't pollute the search).
        const STOP_WORDS = new Set([
          "are", "the", "what", "which", "when", "how", "many", "much",
          "did", "does", "have", "has", "had", "been", "was", "were",
          "can", "could", "should", "would", "will", "may", "might",
          "for", "and", "but", "not", "you", "your", "that", "this",
          "with", "from", "any", "all", "some", "there", "about",
          "its", "our", "they", "them", "their",
        ]);

        const keywords = question
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

        console.log(`[ask] Keywords for memory search:`, keywords);

        type MemoryRow = {
          id: string;
          text: string;
          entities: Array<{ name: string; type: string; confidence: number }>;
        };

        // Score each memory by how many keywords it matches (in text OR in
        // entity names). Return only memories with at least one match.
        const scored = (allMemories as MemoryRow[])
          .map((mem) => {
            const textLower = (mem.text ?? "").toLowerCase();
            const entityNames = (mem.entities ?? [])
              .map((e) => e.name.toLowerCase())
              .join(" ");
            const searchable = `${textLower} ${entityNames}`;

            const hits = keywords.filter((kw) => searchable.includes(kw)).length;
            return { mem, hits };
          })
          .filter(({ hits }) => hits > 0)
          .sort((a, b) => b.hits - a.hits)
          .slice(0, 10);

        if (scored.length > 0) {
          console.log(`[ask] ✓ Found ${scored.length} relevant memories in Supabase`);
          // Build context: include both the raw text and any entity names/types
          // so Groq has rich structured info to answer from.
          context = scored
            .map(({ mem }) => {
              const entitySummary =
                mem.entities && mem.entities.length > 0
                  ? `\nEntities: ${mem.entities.map((e) => `${e.name} (${e.type})`).join(", ")}`
                  : "";
              return `${mem.text}${entitySummary}`;
            })
            .join("\n\n---\n\n");
        } else {
          // No keyword match — try returning all memories as broad context
          // so Groq can still attempt an answer from everything the user stored.
          if (keywords.length === 0) {
            console.log("[ask] No keywords extracted; using all memories as context");
            context = (allMemories as MemoryRow[])
              .slice(0, 10)
              .map((m) => m.text)
              .join("\n\n---\n\n");
          } else {
            console.log("[ask] No keyword-matching memories found");

            // Check if user has documents that haven't been memorized yet.
            const { data: documents } = await supabase
              .from("documents")
              .select("id")
              .eq("user_id", user.id)
              .limit(1);

            if (documents && documents.length > 0) {
              context =
                "I can see your documents, but I haven't been able to find the specific information you're asking about. " +
                "Try re-uploading your document and clicking 'Memorize' again.";
            } else {
              context =
                "I don't have any medical documents yet. Upload some documents and click 'Memorize' to get started!";
            }
          }
        }
      } else {
        // No memories at all in the database for this user.
        console.log("[ask] No memories found in Supabase for this user");

        const { data: documents } = await supabase
          .from("documents")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (documents && documents.length > 0) {
          context =
            "I can see your documents, but I haven't extracted the details yet. " +
            "Please click 'Memorize' on your uploaded files so I can learn from them.";
        } else {
          context =
            "I don't have any medical documents yet. Upload a document and click 'Memorize' to get started!";
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
