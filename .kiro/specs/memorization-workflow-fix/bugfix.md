# Bugfix Requirements Document

## Introduction

The memorization workflow in Cognure Health Memory AI is incomplete. When users upload medical documents (PDF or TXT), the files are saved to Supabase Storage and recorded in the `documents` table, but the critical entity extraction step is missing. As a result, no medical entities (medications, symptoms, diagnoses, procedures, providers) are extracted and saved to the `memories` table. This causes the chat interface to return "no memories found" and leaves the memory graph empty, rendering the core memory functionality unusable.

This bug affects the entire value proposition of the application: users cannot leverage their uploaded documents because the system fails to memorize and make searchable the medical information contained within them.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user uploads a PDF or TXT document via the upload modal THEN the system saves the file to Supabase Storage and creates a row in the `documents` table but does NOT trigger any entity extraction process

1.2 WHEN a user completes a document upload THEN the upload modal closes immediately without offering a "Memorize" option to extract entities from the uploaded document

1.3 WHEN the `/api/remember` endpoint receives a request THEN it sends text to Cognee Cloud and extracts entities with Groq, but it does NOT properly save the entities to the `memories` table in a format that enables subsequent retrieval

1.4 WHEN a user asks a question in the chat interface and Cognee recall fails or returns no results THEN the system does NOT fall back to searching the Supabase `memories` table, resulting in "no memories found" responses even when documents have been uploaded

1.5 WHEN medical entities exist and are displayed in the memory graph THEN the nodes overlap each other due to insufficient spacing and lack of proper circular layout algorithm

1.6 WHEN a user clicks on a node in the memory graph THEN nothing happens because no click handler is implemented to display entity details

### Expected Behavior (Correct)

2.1 WHEN a user uploads a PDF or TXT document via the upload modal THEN the system SHALL save the file to Supabase Storage, create a row in the `documents` table, AND automatically trigger the entity extraction process by calling `/api/remember` with the document text

2.2 WHEN a user completes a document upload THEN the upload modal SHALL display a "Memorize" button that, when clicked, calls `/api/remember` with the document text and document ID, shows "Extracting medical entities..." loading state, and displays "✓ Memorized! Found X medications, Y symptoms, Z diagnoses" upon success

2.3 WHEN the `/api/remember` endpoint receives a request with `{ text: string, documentId: string }` THEN it SHALL extract medical entities using Groq API with a system prompt requesting JSON array of `[{name, type, confidence}]` objects, save each entity to the `memories` table with proper `user_id`, `document_id`, `text`, and `entities` fields, and return `{ success: true, memoryId, entities: [...], count: number }`

2.4 WHEN a user asks a question in the chat interface and Cognee recall fails or returns no results THEN the system SHALL execute a fallback search against the Supabase `memories` table using `SELECT * FROM memories WHERE user_id = ? AND (content ILIKE '%keyword%' OR entities::text ILIKE '%keyword%')`, build context from found memories, and if still no memories exist, provide a helpful message: "I can see your documents, but I need to extract the medical details first. Please go to Documents and click 'Memorize' on each uploaded file."

2.5 WHEN medical entities are displayed in the memory graph THEN the system SHALL implement a circular layout algorithm that positions nodes in a circle around a "You" center node with radius of 260px, node size of 120x60 pixels, and font size of 14px to prevent overlapping

2.6 WHEN a user clicks on a node in the memory graph THEN the system SHALL display a shadcn Dialog showing the entity name (heading), type (colored badge), confidence (progress bar), source document, date extracted, and related entities

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user uploads a PDF or TXT document THEN the system SHALL CONTINUE TO save the file to Supabase Storage under the path `<user_id>/<filename>` and create a row in the `documents` table with all existing fields (`id`, `user_id`, `file_name`, `file_path`, `file_type`, `content`, `created_at`)

3.2 WHEN a user uploads a non-PDF and non-TXT file THEN the system SHALL CONTINUE TO reject the upload with the error message "Please upload a PDF or TXT file."

3.3 WHEN the `/api/remember` endpoint successfully processes a memory THEN the system SHALL CONTINUE TO send the text to Cognee Cloud using `cogneeRemember()` and store the returned `cognee_id` in the `memories` table

3.4 WHEN Groq API extracts entities from text THEN the system SHALL CONTINUE TO validate that each entity has a valid `name`, `type` (one of: medication, symptom, diagnosis, procedure, provider), and `confidence` (0..1), and filter out any invalid entities

3.5 WHEN the chat interface displays messages THEN the system SHALL CONTINUE TO show user messages and assistant responses in the existing chat bubble format with proper styling and timestamps

3.6 WHEN the memory graph renders with sample data (before user uploads any documents) THEN the system SHALL CONTINUE TO display the sample entities defined in `SAMPLE_ENTITIES` array in `memory-graph.tsx`

3.7 WHEN a memory entity has type "symptom" and confidence below 0.5 THEN the memory graph SHALL CONTINUE TO render it as a "shadow node" with pale background, dashed lavender border, and reduced opacity

3.8 WHEN a user is not authenticated (no valid JWT token) THEN all API endpoints (`/api/upload`, `/api/remember`, `/api/ask`) SHALL CONTINUE TO return a 401 Unauthorized response with error message "Not signed in."
