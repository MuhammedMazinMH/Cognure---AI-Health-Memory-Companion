// Shared TypeScript types for the mobile app.
// EXACT mirror of the web app's src/types/index.ts — the web app is the
// source of truth. If a shape changes there, change it here identically.

/**
 * The kinds of health entities Cognure understands.
 * Each one maps to a colored node in the memory graph.
 */
export type HealthEntityType =
  | "medication"
  | "symptom"
  | "diagnosis"
  | "procedure"
  | "provider";

/**
 * A logged-in person. Mirrors the basic fields we get back from Supabase Auth.
 */
export interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at?: string;
}

/**
 * A file the user uploaded (PDF or TXT). We keep the extracted text in
 * `content` so we can feed it to the AI without re-reading the file.
 */
export interface Document {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string; // path inside the Supabase Storage bucket
  file_type: string; // e.g. "application/pdf" or "text/plain"
  content: string; // extracted plain text
  created_at: string;
}

/**
 * A single extracted health fact (one node in the graph).
 * `confidence` is 0..1. Anything below 0.5 is rendered as a faint
 * "shadow" node to show the AI is not fully sure yet.
 */
export interface HealthEntity {
  name: string;
  type: HealthEntityType;
  confidence: number;
}

/**
 * A "memory" is a chunk of remembered text plus the entities we pulled from it.
 * `cognee_id` is the id returned by the Cognee Cloud API so we can later
 * improve or forget that exact memory.
 */
export interface Memory {
  id: string;
  user_id: string;
  document_id: string | null;
  text: string;
  cognee_id: string | null;
  entities: HealthEntity[];
  created_at: string;
}

/**
 * A connection between two memory/entity nodes in the graph
 * (for example: a medication that treats a diagnosis).
 */
export interface MemoryEdge {
  id: string;
  source: string; // id of the source node
  target: string; // id of the target node
  label?: string; // human-readable relationship, e.g. "treats"
}

/**
 * One bubble in the chat window.
 * `role` tells us whether the user or Cognure wrote it.
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  // Optional snippet of the memory the answer was based on (for transparency).
  context?: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// API response shapes — mirrored from the web route handlers and components.
// ---------------------------------------------------------------------------

/**
 * A known interaction between two or more of the user's medications.
 * Mirrors `MedInteraction` in the web memory-graph component and the
 * `medication_interactions` table selected by /api/interactions.
 */
export interface MedInteraction {
  id: string;
  medications: string[];
  severity: string;
  description: string;
  created_at?: string;
}

/** Response of POST /api/ask. */
export interface AskResponse {
  answer: string;
  context: string;
}

/** Response of POST /api/remember. */
export interface RememberResponse {
  success: boolean;
  memoryId: string;
  entities: HealthEntity[];
  count: number;
  interactions: MedInteraction[];
  interactionSummary: string | null;
}
