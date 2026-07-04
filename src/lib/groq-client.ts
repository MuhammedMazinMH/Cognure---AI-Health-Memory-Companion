// Groq runs open models VERY fast. We use it for two jobs:
//   1) extractEntities(): pull medications/symptoms/etc. out of raw text.
//   2) generateAnswer(): write a chat answer using ONLY the recalled context.
//
// This file runs on the SERVER only (inside API routes), because it uses the
// secret GROQ_API_KEY which must never be exposed to the browser.

import type { HealthEntity, HealthEntityType } from "@/types";

// Groq is OpenAI-compatible, so we hit the chat completions endpoint.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// A single message in a chat request.
interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Low-level helper that sends messages to Groq and returns the text reply.
 * Everything else in this file builds on top of it.
 *
 * @param messages - The conversation to send.
 * @param jsonMode - When true, we ask Groq to reply with valid JSON only.
 */
async function callGroq(
  messages: GroqMessage[],
  jsonMode = false
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing. Add it to .env.local.");
  }

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.2, // low temperature = focused, factual answers
      // response_format forces the model to return parseable JSON.
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  // The reply text lives at choices[0].message.content.
  return data?.choices?.[0]?.message?.content ?? "";
}

// The only entity types we accept. Anything else from the model is dropped.
const VALID_TYPES: HealthEntityType[] = [
  "medication",
  "symptom",
  "diagnosis",
  "procedure",
  "provider",
];

/**
 * Reads free-form medical text and returns a clean list of health entities.
 *
 * Example return value:
 * [
 *   { name: "Metformin", type: "medication", confidence: 0.95 },
 *   { name: "fatigue",   type: "symptom",    confidence: 0.4  }
 * ]
 */
export async function extractEntities(text: string): Promise<HealthEntity[]> {
  // The system prompt tells the model exactly what to do and what shape to
  // return. We wrap the array in an object because JSON mode requires an object.
  const systemPrompt =
    "Extract medications, symptoms, diagnoses, procedures, providers from text. " +
    'Return JSON array of {name, type, confidence}. ' +
    'Respond with a JSON object shaped like {"entities": [...]}. ' +
    '"type" must be one of: medication, symptom, diagnosis, procedure, provider. ' +
    '"confidence" is a number between 0 and 1.';

  const raw = await callGroq(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    true // JSON mode
  );

  // Parsing can fail if the model returns something odd, so we guard it.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // If we cannot parse, return an empty list instead of crashing.
    return [];
  }

  // The model may return either { entities: [...] } or a bare [...].
  const list = Array.isArray(parsed)
    ? parsed
    : ((parsed as { entities?: unknown })?.entities ?? []);

  if (!Array.isArray(list)) return [];

  // Clean and validate every item so the rest of the app can trust the data.
  const entities: HealthEntity[] = [];
  for (const item of list) {
    const candidate = item as Partial<HealthEntity>;
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    const type = candidate.type as HealthEntityType;
    let confidence =
      typeof candidate.confidence === "number" ? candidate.confidence : 0.5;

    // Keep confidence inside the 0..1 range.
    if (confidence < 0) confidence = 0;
    if (confidence > 1) confidence = 1;

    if (name && VALID_TYPES.includes(type)) {
      entities.push({ name, type, confidence });
    }
  }

  return entities;
}

/**
 * Interaction severity levels.
 */
export type InteractionSeverity = "mild" | "moderate" | "severe";

export interface MedicationInteraction {
  medications: string[]; // the two (or more) drugs involved
  severity: InteractionSeverity;
  description: string;
}

export interface InteractionCheckResult {
  hasInteractions: boolean;
  interactions: MedicationInteraction[];
  summary: string;
}

/**
 * Given a list of medication names, asks Groq to identify any dangerous
 * interactions between them. Returns structured results.
 */
export async function checkInteractions(
  medications: string[]
): Promise<InteractionCheckResult> {
  if (medications.length < 2) {
    return { hasInteractions: false, interactions: [], summary: "" };
  }

  const list = medications.map((m) => `- ${m}`).join("\n");
  const systemPrompt =
    "You are a clinical pharmacist. Given a list of medications, identify any " +
    "known drug-drug interactions. For each interaction specify: medications " +
    "(array of names), severity (mild|moderate|severe), and description. " +
    'Return a JSON object: {"hasInteractions": boolean, "interactions": ' +
    '[{"medications": [...], "severity": "...", "description": "..."}], ' +
    '"summary": "One-sentence plain-English summary or empty string"}. ' +
    "If no interactions, return hasInteractions: false with empty interactions array.";

  const raw = await callGroq(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Check these medications for interactions:\n${list}`,
      },
    ],
    true
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { hasInteractions: false, interactions: [], summary: "" };
  }

  const result = parsed as Partial<InteractionCheckResult>;
  return {
    hasInteractions: result.hasInteractions ?? false,
    interactions: Array.isArray(result.interactions) ? result.interactions : [],
    summary: typeof result.summary === "string" ? result.summary : "",
  };
}

/**
 * Writes a chat answer for the user's question, grounded ONLY in the provided
 * context that Cognee recalled. If the answer is not in the context, the model
 * is told to say so rather than make something up.
 */
export async function generateAnswer(
  question: string,
  context: string
): Promise<string> {
  const systemPrompt =
    "You are Cognure, a medical memory assistant. Answer ONLY from context. " +
    "If the answer is not in the context, say you don't have that information " +
    "yet. Be clear, kind, and concise. Do not give medical advice or diagnoses.";

  // We hand the model the recalled context and the question together.
  const userPrompt =
    `Context from the user's health memory:\n${context || "(no memories found)"}\n\n` +
    `Question: ${question}`;

  return callGroq([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);
}
