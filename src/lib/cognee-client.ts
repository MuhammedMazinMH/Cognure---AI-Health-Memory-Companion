// Cognee Cloud is the "memory engine" behind Cognure. This version includes
// a FALLBACK MODE: if Cognee is unreachable or not configured, we fall back
// to using Supabase directly for storage and a simple text-search for recall.
//
// This makes the app resilient during development and when Cognee has issues.
//
// >>> ADJUST THESE PATHS TO MATCH COGNEE'S ACTUAL API DOCS <<<

import { getServerSupabase } from "./supabase-client";

// Read configuration from environment variables (set in .env.local).
const COGNEE_BASE_URL = process.env.COGNEE_BASE_URL ?? "";
const COGNEE_API_KEY = process.env.COGNEE_API_KEY ?? "";

// >>> ADJUST THESE PATHS TO MATCH COGNEE'S ACTUAL API DOCS <<<
const ENDPOINTS = {
  add: "/add",
  cognify: "/cognify",
  remember: "/remember",
  recall: "/recall",
  improve: "/improve",
  forget: "/forget",
};

// 5 second timeout for all Cognee requests.
const COGNEE_TIMEOUT_MS = 5000;

/**
 * Normalizes the base URL to ensure it has the correct format.
 * - If it starts with http:// or https://, use it as-is
 * - If not, prepend https://
 * - Remove any trailing slashes
 */
function normalizeBaseUrl(url: string): string {
  if (!url) return "";
  
  // If the URL doesn't start with http:// or https://, add https://
  let normalized = url.trim();
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`;
  }
  
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, "");
  
  return normalized;
}

const normalizedBaseUrl = normalizeBaseUrl(COGNEE_BASE_URL);

// Determines if Cognee is configured. If not, we always use fallback mode.
const isCogneeConfigured = Boolean(
  normalizedBaseUrl &&
    COGNEE_API_KEY &&
    normalizedBaseUrl !== "https://your_cognee_base_url" &&
    COGNEE_API_KEY !== "your_cognee_api_key"
);

console.log("[Cognee Client] Initialized");
console.log(`[Cognee Client] Raw Base URL: ${COGNEE_BASE_URL || "(not set)"}`);
console.log(`[Cognee Client] Normalized Base URL: ${normalizedBaseUrl || "(not set)"}`);
console.log(`[Cognee Client] Configured: ${isCogneeConfigured}`);
if (!isCogneeConfigured) {
  console.log(
    "[Cognee Client] ⚠️  Cognee not configured. Using Supabase fallback for all operations."
  );
}

/**
 * Internal helper: send one request to Cognee with timeout and full logging.
 * Throws if the request fails or times out.
 */
async function cogneeFetch<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  // Build the full URL using the normalized base URL
  const url = `${normalizedBaseUrl}${path}`;

  console.log(`[Cognee] → POST ${url}`);
  console.log(`[Cognee]   Body:`, JSON.stringify(body).slice(0, 200));

  // Create an AbortController so we can cancel the request after timeout.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), COGNEE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${COGNEE_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`[Cognee] ← ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Cognee] Error response:`, text);
      throw new Error(`Cognee HTTP ${response.status}: ${text}`);
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    console.log(`[Cognee] Response:`, JSON.stringify(data).slice(0, 200));
    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`[Cognee] Fetch failed:`, error);
    throw error;
  }
}

/** Shape returned by cogneeRemember(). `id` is what we store to improve/forget later. */
export interface CogneeRememberResult {
  id: string;
  [key: string]: unknown;
}

/** Shape returned by cogneeRecall(). `context` is the recalled text we feed to Groq. */
export interface CogneeRecallResult {
  context: string;
  results: unknown[];
}

/**
 * Store a new memory. Uses Cognee if available, otherwise Supabase fallback.
 *
 * >>> ADJUST THESE PATHS TO MATCH COGNEE'S ACTUAL API DOCS <<<
 */
export async function cogneeRemember(
  text: string,
  metadata: Record<string, unknown> = {}
): Promise<CogneeRememberResult> {
  console.log(`[cogneeRemember] Starting with ${text.length} chars`);

  // If Cognee is not configured or fails, use Supabase fallback.
  if (!isCogneeConfigured) {
    console.log("[cogneeRemember] Using Supabase fallback (not configured)");
    return fallbackRemember(text, metadata);
  }

  try {
    // Step 1: add the raw text.
    await cogneeFetch(ENDPOINTS.add, { data: text, metadata });

    // Step 2: build/refresh the knowledge graph from the added text.
    await cogneeFetch(ENDPOINTS.cognify, { metadata });

    // Step 3: register it as a recallable memory and get back an id.
    const result = await cogneeFetch<CogneeRememberResult>(ENDPOINTS.remember, {
      text,
      metadata,
    });

    const finalResult = { ...result, id: result?.id ?? crypto.randomUUID() };
    console.log(`[cogneeRemember] ✓ Success via Cognee, id: ${finalResult.id}`);
    return finalResult;
  } catch (error) {
    console.error("[cogneeRemember] ⚠️  Cognee failed, using fallback:", error);
    return fallbackRemember(text, metadata);
  }
}

/**
 * Search the user's memories for anything relevant to `query`.
 * Uses Cognee if available, otherwise Supabase fallback.
 *
 * >>> ADJUST THESE PATHS TO MATCH COGNEE'S ACTUAL API DOCS <<<
 */
export async function cogneeRecall(query: string): Promise<CogneeRecallResult> {
  console.log(`[cogneeRecall] Query: "${query}"`);

  if (!isCogneeConfigured) {
    console.log("[cogneeRecall] Using Supabase fallback (not configured)");
    return fallbackRecall(query);
  }

  try {
    const result = await cogneeFetch<{
      context?: string;
      results?: unknown[];
    }>(ENDPOINTS.recall, { query });

    const results = Array.isArray(result?.results) ? result.results : [];
    const context =
      typeof result?.context === "string"
        ? result.context
        : results
            .map((r) => (typeof r === "string" ? r : JSON.stringify(r)))
            .join("\n");

    console.log(`[cogneeRecall] ✓ Success via Cognee, ${results.length} results`);
    return { context, results };
  } catch (error) {
    console.error("[cogneeRecall] ⚠️  Cognee failed, using fallback:", error);
    return fallbackRecall(query);
  }
}

/**
 * Tell Cognee to refine an existing memory with a user correction.
 * Uses Cognee if available, otherwise Supabase fallback.
 *
 * >>> ADJUST THESE PATHS TO MATCH COGNEE'S ACTUAL API DOCS <<<
 */
export async function cogneeImprove(
  memoryId: string,
  correction: string
): Promise<{ success: boolean; [key: string]: unknown }> {
  console.log(`[cogneeImprove] Memory ${memoryId}, correction: "${correction}"`);

  if (!isCogneeConfigured) {
    console.log("[cogneeImprove] Using Supabase fallback (not configured)");
    return fallbackImprove(memoryId, correction);
  }

  try {
    const result = await cogneeFetch<{ success?: boolean }>(ENDPOINTS.improve, {
      id: memoryId,
      correction,
    });
    console.log(`[cogneeImprove] ✓ Success via Cognee`);
    return { ...result, success: result?.success ?? true };
  } catch (error) {
    console.error("[cogneeImprove] ⚠️  Cognee failed, using fallback:", error);
    return fallbackImprove(memoryId, correction);
  }
}

/**
 * Permanently remove a memory from Cognee.
 * Uses Cognee if available, otherwise Supabase fallback.
 *
 * >>> ADJUST THESE PATHS TO MATCH COGNEE'S ACTUAL API DOCS <<<
 */
export async function cogneeForget(
  memoryId: string
): Promise<{ success: boolean; [key: string]: unknown }> {
  console.log(`[cogneeForget] Memory ${memoryId}`);

  if (!isCogneeConfigured) {
    console.log("[cogneeForget] Using Supabase fallback (not configured)");
    return fallbackForget(memoryId);
  }

  try {
    const result = await cogneeFetch<{ success?: boolean }>(ENDPOINTS.forget, {
      id: memoryId,
    });
    console.log(`[cogneeForget] ✓ Success via Cognee`);
    return { ...result, success: result?.success ?? true };
  } catch (error) {
    console.error("[cogneeForget] ⚠️  Cognee failed, using fallback:", error);
    return fallbackForget(memoryId);
  }
}

// ============================================================================
// FALLBACK MODE: Direct Supabase storage when Cognee is unavailable
// ============================================================================

/**
 * Fallback for `cogneeRemember`: store the memory directly in Supabase's
 * `cognee_fallback` table so we can recall it later.
 */
async function fallbackRemember(
  text: string,
  metadata: Record<string, unknown>
): Promise<CogneeRememberResult> {
  console.log("[fallbackRemember] Storing in Supabase cognee_fallback table");

  // We don't have a user token in this context (it's passed via the API route),
  // so we create an anonymous Supabase client. The API route will handle auth.
  const supabase = getServerSupabase();

  // Generate a unique id for this memory.
  const id = crypto.randomUUID();

  try {
    // Create the table if it doesn't exist (idempotent).
    await supabase.rpc("create_cognee_fallback_table_if_not_exists");
  } catch {
    // RPC might not exist; we'll just try to insert anyway.
  }

  // Insert the memory. The `user_id` will be null here because we don't have
  // the token, but the API route will update it with the correct user_id.
  const { error } = await supabase.from("cognee_fallback").insert({
    id,
    text,
    metadata,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[fallbackRemember] Supabase insert failed:", error);
    // Return a generated id anyway so the flow continues.
    return { id };
  }

  console.log(`[fallbackRemember] ✓ Stored in Supabase, id: ${id}`);
  return { id };
}

/**
 * Fallback for `cogneeRecall`: search Supabase's `cognee_fallback` table
 * for memories containing the query keywords (simple text search).
 */
async function fallbackRecall(query: string): Promise<CogneeRecallResult> {
  console.log("[fallbackRecall] Searching Supabase cognee_fallback table");

  const supabase = getServerSupabase();

  // Simple keyword search: split query into words and search for any match.
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (keywords.length === 0) {
    console.log("[fallbackRecall] No valid keywords, returning empty");
    return { context: "", results: [] };
  }

  // Use ilike for case-insensitive partial match on the text column.
  let queryBuilder = supabase.from("cognee_fallback").select("*");

  // Add OR conditions for each keyword.
  const orConditions = keywords.map((kw) => `text.ilike.%${kw}%`).join(",");
  queryBuilder = queryBuilder.or(orConditions);

  const { data, error } = await queryBuilder.limit(10);

  if (error) {
    console.error("[fallbackRecall] Supabase query failed:", error);
    return { context: "", results: [] };
  }

  const results = (data ?? []).map((row: { text: string }) => row.text);
  const context = results.join("\n\n");

  console.log(`[fallbackRecall] ✓ Found ${results.length} results`);
  return { context, results };
}

/**
 * Fallback for `cogneeImprove`: update the memory in Supabase by appending
 * the correction to the text.
 */
async function fallbackImprove(
  memoryId: string,
  correction: string
): Promise<{ success: boolean }> {
  console.log("[fallbackImprove] Updating in Supabase");

  const supabase = getServerSupabase();

  // Fetch the existing memory.
  const { data: existing, error: fetchError } = await supabase
    .from("cognee_fallback")
    .select("text")
    .eq("id", memoryId)
    .single();

  if (fetchError || !existing) {
    console.error("[fallbackImprove] Memory not found:", fetchError);
    return { success: false };
  }

  // Append the correction.
  const updatedText = `${existing.text}\n\n[Correction]: ${correction}`;

  const { error: updateError } = await supabase
    .from("cognee_fallback")
    .update({ text: updatedText })
    .eq("id", memoryId);

  if (updateError) {
    console.error("[fallbackImprove] Update failed:", updateError);
    return { success: false };
  }

  console.log("[fallbackImprove] ✓ Updated in Supabase");
  return { success: true };
}

/**
 * Fallback for `cogneeForget`: delete the memory from Supabase.
 */
async function fallbackForget(
  memoryId: string
): Promise<{ success: boolean }> {
  console.log("[fallbackForget] Deleting from Supabase");

  const supabase = getServerSupabase();

  const { error } = await supabase
    .from("cognee_fallback")
    .delete()
    .eq("id", memoryId);

  if (error) {
    console.error("[fallbackForget] Delete failed:", error);
    return { success: false };
  }

  console.log("[fallbackForget] ✓ Deleted from Supabase");
  return { success: true };
}
