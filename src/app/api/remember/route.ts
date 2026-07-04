// POST /api/remember
// Body: { text: string, documentId?: string }
//
// Stores a piece of text as a long-term memory:
//   1) Sends it to Cognee Cloud (cogneeRemember).
//   2) Extracts health entities from it with Groq (so the graph has nodes).
//   3) Saves a row in the `memories` table.
//   4) SMART DEDUPLICATION: merges similar entities even across documents.

import { NextResponse } from "next/server";
import { cogneeRemember } from "@/lib/cognee-client";
import { extractEntities } from "@/lib/groq-client";
import { getServerSupabase, getTokenFromRequest } from "@/lib/supabase-client";

export const runtime = "nodejs";

// Proper type for extracted entities — no 'any' allowed
interface ExtractedEntity {
  name: string;
  type: string;
  confidence: number;
}

// Aggressive, type-aware normalization to catch real-world duplicates
function normalizeEntityName(name: string, type: string): string {
  let normalized = name
    .toLowerCase()
    .trim()
    // Replace all punctuation with spaces
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Providers: strip titles so "Dr. Jennifer Chen, MD" → "jennifer chen"
  if (type === "provider") {
    normalized = normalized
      .replace(/\b(dr|md|do|phd|np|pa|rn|mr|mrs|ms|prof|doctor|professor)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Medications: strip dosage so "Metformin 500mg" → "metformin"
  if (type === "medication") {
    normalized = normalized
      .replace(/\b(mg|mcg|ml|g|units|tablets|capsules|pills|daily|twice|once|every|hour|hours|day|days|week|weeks|month|months|oral|injection|topical|as needed|prn)\b/g, "")
      .replace(/\d+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Procedures: strip common suffixes
  if (type === "procedure") {
    normalized = normalized
      .replace(/\b(test|exam|screening|check|checkup|evaluation|assessment|study|scan|x-ray|xray|ultrasound|mri|ct)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  return normalized;
}

// Smart deduplication: exact match OR containment match + keep highest confidence
function smartDeduplicate(rawEntities: ExtractedEntity[]): ExtractedEntity[] {
  const unique: ExtractedEntity[] = [];

  for (const entity of rawEntities) {
    const normName = normalizeEntityName(entity.name, entity.type);
    const type = entity.type;

    if (!normName) continue; // skip empty after normalization

    let merged = false;

    for (const kept of unique) {
      const keptNorm = normalizeEntityName(kept.name, kept.type);

      // Must be same type
      if (type !== kept.type) continue;

      // 1. Exact normalized match: "metformin" === "metformin"
      // 2. Containment match: "jennifer chen" is inside "jennifer chen md"
      const isExact = normName === keptNorm;
      const isContained = normName.includes(keptNorm) || keptNorm.includes(normName);

      if (isExact || isContained) {
        merged = true;
        // Keep the higher-confidence version, but preserve the SHORTER name
        // (shorter = more canonical, e.g. "Jennifer Chen" not "Jennifer Chen, MD")
        if (entity.confidence > kept.confidence) {
          kept.confidence = entity.confidence;
          // Prefer shorter, cleaner name
          if (entity.name.length < kept.name.length) {
            kept.name = entity.name;
          }
        }
        break;
      }
    }

    if (!merged) {
      unique.push({ ...entity });
    }
  }

  return unique;
}

export async function POST(request: Request) {
  const startTime = Date.now();
  console.log("\n=== POST /api/remember ===");
  console.log(`[${new Date().toISOString()}] Request received`);

  try {
    // 1) Authenticate the user.
    const token = getTokenFromRequest(request);
    if (!token) {
      console.log("[remember] ❌ No auth token");
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const supabase = getServerSupabase(token);
    console.log("[remember] Verifying user token...");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("[remember] ❌ Invalid session:", userError);
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    console.log(`[remember] ✓ User authenticated: ${user.email}`);

    // 2) Read and validate the request body.
    const body = await request.json();
    const text: string = body?.text ?? "";
    const documentId: string | null = body?.documentId ?? null;

    console.log(`[remember] Text length: ${text.length} chars`);
    console.log(`[remember] Document ID: ${documentId ?? "(none)"}`);

    if (!text.trim()) {
      console.log("[remember] ❌ Empty text");
      return NextResponse.json(
        { error: "Nothing to remember: 'text' is empty." },
        { status: 400 }
      );
    }

    // 3) Ask Cognee to remember the text and extract entities with Groq.
    console.log("[remember] Calling Cognee and Groq in parallel...");
    const [cogneeResult, rawEntities] = await Promise.all([
      cogneeRemember(text, { userId: user.id, documentId }),
      extractEntities(text),
    ]);

    // 4) SMART DEDUPLICATION within this document
    const entities = smartDeduplicate(rawEntities as ExtractedEntity[]);

    console.log(`[remember] ✓ Cognee returned id: ${cogneeResult.id}`);
    console.log(`[remember] ✓ Groq extracted ${rawEntities.length} raw entities`);
    console.log(`[remember] ✓ Deduplicated to ${entities.length} unique entities`);

    // Log what was removed
    if (rawEntities.length > entities.length) {
      const removed = rawEntities
        .filter((r) => !entities.some((e) => e.name === r.name && e.type === r.type))
        .map((e) => `${(e as ExtractedEntity).name} (${(e as ExtractedEntity).type})`);
      console.log(`[remember] Removed duplicates:`, removed);
    }

    // Calculate entity counts by type for the UI
    const count: Record<string, number> = {
      medication: 0,
      symptom: 0,
      diagnosis: 0,
      procedure: 0,
      provider: 0,
    };

    for (const entity of entities) {
      if (count[entity.type] !== undefined) {
        count[entity.type]++;
      }
    }

    console.log(`[remember] Entity counts:`, count);

    // 5) Save the memory in our own database too.
    console.log("[remember] Saving to memories table...");
    const { data: memory, error: insertError } = await supabase
      .from("memories")
      .insert({
        user_id: user.id,
        document_id: documentId,
        text,
        cognee_id: cogneeResult.id,
        entities, // stored as JSON
      })
      .select()
      .single();

    if (insertError) {
      console.log("[remember] ❌ Database insert failed:", insertError);
      return NextResponse.json(
        { error: `Failed to save memory: ${insertError.message}` },
        { status: 500 }
      );
    }

    const elapsed = Date.now() - startTime;
    console.log(`[remember] ✓ Success! Memory ID: ${memory.id}`);
    console.log(`[remember] Completed in ${elapsed}ms\n`);

    return NextResponse.json({
      success: true,
      memoryId: memory.id,
      entities,
      count,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error.";
    console.error(`[remember] ❌ Exception after ${elapsed}ms:`, error);

    if (message.includes("Groq") || message.includes("extract")) {
      return NextResponse.json(
        { error: `Failed to extract entities: ${message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `Remember failed: ${message}` },
      { status: 500 }
    );
  }
}