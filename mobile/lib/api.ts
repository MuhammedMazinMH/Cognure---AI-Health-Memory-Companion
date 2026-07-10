// Typed API layer for the Cognure mobile app.
//
// Every function here talks to the EXISTING production Next.js API routes —
// no duplicate backend logic. The contracts below are mirrored 1:1 from the
// web route handlers in src/app/api/*/route.ts:
//
//   POST /api/ask          { question }              -> { answer, context }
//   GET  /api/documents                              -> { documents }
//   GET  /api/memories                               -> { memories }
//   GET  /api/interactions                           -> { interactions }
//   POST /api/remember     { text, documentId }      -> { success, memoryId, entities, count, interactions, interactionSummary }
//   POST /api/improve      { memoryId, correction }  -> { memory }
//   POST /api/forget       { memoryId }              -> { success }
//   POST /api/upload       FormData(file, content)   -> { document }
//
// Auth: identical to the web app — `Authorization: Bearer <access_token>`,
// where the token comes from the shared Supabase session.

import { getSupabase } from "./supabase";
import type {
  AskResponse,
  Document,
  MedInteraction,
  Memory,
  RememberResponse,
} from "./types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

/** Error thrown for any non-2xx API response, carrying the server message. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Reads the current Supabase access token, or throws if signed out. */
async function getAccessToken(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new ApiError("Not signed in.", 401);
  }
  return token;
}

/**
 * Core request helper. Mirrors the web app's fetch pattern:
 * Bearer token auth + JSON body + `{ error }` message extraction on failure.
 */
async function request<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown; formData?: FormData } = {}
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  // Let fetch set the multipart boundary itself for FormData bodies.
  if (!options.formData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.formData ?? (options.body ? JSON.stringify(options.body) : undefined),
  });

  let json: Record<string, unknown> = {};
  try {
    json = await response.json();
  } catch {
    // Non-JSON response (e.g. gateway error page) — fall through to status check.
  }

  if (!response.ok) {
    const message =
      typeof json.error === "string" ? json.error : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }

  return json as T;
}

/** GET /api/memories — all extracted memories for the signed-in user. */
export async function fetchMemories(): Promise<Memory[]> {
  const json = await request<{ memories: Memory[] }>("/api/memories");
  return json.memories ?? [];
}

/** GET /api/documents — all uploaded documents for the signed-in user. */
export async function fetchDocuments(): Promise<Document[]> {
  const json = await request<{ documents: Document[] }>("/api/documents");
  return json.documents ?? [];
}

/** GET /api/interactions — medication interaction warnings. */
export async function fetchInteractions(): Promise<MedInteraction[]> {
  const json = await request<{ interactions: MedInteraction[] }>("/api/interactions");
  return json.interactions ?? [];
}

/** POST /api/ask — ask a question grounded in the user's own records. */
export async function askQuestion(question: string): Promise<AskResponse> {
  return request<AskResponse>("/api/ask", { method: "POST", body: { question } });
}

/**
 * POST /api/upload — upload a document.
 * `extractedText` is only sent for PDFs (extracted client-side, same as web);
 * for TXT files the server reads the text itself.
 */
export async function uploadDocument(
  fileName: string,
  mimeType: string,
  fileUri: string,
  extractedText?: string
): Promise<Document> {
  const formData = new FormData();
  // React Native FormData file part: { uri, name, type } object.
  formData.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
  if (extractedText !== undefined) {
    formData.append("content", extractedText);
  }

  const json = await request<{ document: Document }>("/api/upload", {
    method: "POST",
    formData,
  });
  return json.document;
}

/** POST /api/remember — extract entities from text and store memories. */
export async function rememberText(
  text: string,
  documentId: string | null
): Promise<RememberResponse> {
  return request<RememberResponse>("/api/remember", {
    method: "POST",
    body: { text, documentId },
  });
}

/** POST /api/improve — correct a memory with user feedback. */
export async function improveMemory(
  memoryId: string,
  correction: string
): Promise<Memory> {
  const json = await request<{ memory: Memory }>("/api/improve", {
    method: "POST",
    body: { memoryId, correction },
  });
  return json.memory;
}

/** POST /api/forget — permanently delete a memory. */
export async function forgetMemory(memoryId: string): Promise<void> {
  await request<{ success: boolean }>("/api/forget", {
    method: "POST",
    body: { memoryId },
  });
}
