# Memorization Workflow Fix - Bugfix Design

## Overview

The memorization workflow in Cognure Health Memory AI is broken at a critical junction: documents upload successfully but entity extraction never executes, leaving the `memories` table empty and rendering the chat interface non-functional. This bug affects the core value proposition of the application—users cannot leverage their medical documents because the system fails to extract and memorize the medical entities (medications, symptoms, diagnoses, procedures, providers) contained within them.

The fix requires five key changes:
1. Add a "Memorize" button to the upload modal with proper state management
2. Rewrite `/api/remember` to properly extract entities with Groq and save them to Supabase in the correct format
3. Implement fallback memory search in `/api/ask` when Cognee recall fails
4. Fix the memory graph circular layout algorithm to prevent node overlap
5. Add click handlers to graph nodes with entity details dialog

This design uses the bug condition methodology to ensure the fix works for all buggy inputs (uploaded documents without extracted entities) while preserving all existing functionality (file uploads, Cognee integration, graph rendering).

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a document is uploaded successfully but entity extraction never happens, leaving memories empty
- **Property (P)**: The desired behavior when the bug condition holds - entities should be extracted from document text and saved to the `memories` table, enabling chat functionality
- **Preservation**: Existing upload behavior, Cognee integration, authentication, and graph rendering that must remain unchanged
- **Entity Extraction**: The process of using Groq API (`llama-3.3-70b-versatile`) to parse medical text and identify structured entities with types (medication, symptom, diagnosis, procedure, provider) and confidence scores (0..1)
- **UploadModal**: React component (`src/components/upload-modal.tsx`) that renders the "Add Memory" dialog and handles file uploads
- **Memory Graph**: React Flow visualization (`src/components/memory-graph.tsx`) that displays health entities as circular nodes around a center "You" node
- **Cognee Fallback**: The existing fallback mechanism in `cognee-client.ts` that uses Supabase when Cognee Cloud is unavailable

## Bug Details

### Bug Condition

The bug manifests when a user uploads a PDF or TXT document via the upload modal. The `handleFile` function successfully sends the file to `/api/upload` (which saves it to Supabase Storage and extracts text), then calls `/api/remember` with the document text, but the entity extraction and database save either fail silently or produce malformed data that cannot be retrieved later.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { file: File, documentText: string, documentId: string }
  OUTPUT: boolean
  
  RETURN input.file.type IN ['application/pdf', 'text/plain']
         AND documentSavedToStorage(input.documentId)
         AND (
           NOT entitiesExtractedFromText(input.documentText) OR
           NOT entitiesSavedToMemoriesTable(input.documentId) OR
           entitiesNotRetrievableByChat()
         )
END FUNCTION
```

### Examples

- **Upload medical record PDF**: User uploads "lab-results-2024.pdf" → file saves to Storage → `/api/remember` is called → Groq extracts entities but they are not saved to `memories` table correctly → chat returns "no memories found"
- **Upload medication list TXT**: User uploads "medications.txt" containing "Metformin 500mg twice daily" → file saves → `/api/remember` extracts "Metformin" as medication entity → save to `memories` fails due to missing `document_id` field → memory graph shows empty sample data
- **Upload diagnosis letter**: User uploads doctor's letter with "Type 2 Diabetes" diagnosis → upload succeeds → entity extraction never runs because modal closes immediately → `memories` table remains empty → chat non-functional
- **Edge case - empty document**: User uploads empty TXT file → upload succeeds → `/api/remember` is called with empty text → should gracefully handle with "No entities found" message

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- File upload to Supabase Storage under path `<user_id>/<filename>` with document record creation must continue working exactly as before
- Cognee Cloud integration via `cogneeRemember()` must continue sending text and storing returned `cognee_id` in `memories` table
- Authentication flow with JWT tokens and 401 responses for unauthenticated requests must remain unchanged
- Memory graph rendering with sample data (before uploads) and shadow node styling (confidence < 0.5) must continue working
- File type validation rejecting non-PDF/TXT files with specific error message must be preserved
- Entity validation filtering out invalid types or malformed confidence scores must continue

**Scope:**
All inputs that do NOT involve completing a document upload and triggering entity extraction should be completely unaffected by this fix. This includes:
- Direct navigation to pages without uploading
- Viewing existing documents or memories
- Manual API calls outside the upload flow
- Authentication and authorization flows
- Graph interactions with sample data

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Missing Memorize Trigger**: The `upload-modal.tsx` component calls `/api/remember` immediately after upload completes, but the user has no visibility into the extraction process or ability to retry if it fails. The modal closes immediately on success, hiding any extraction errors.

2. **Malformed Entity Save**: The `/api/remember` endpoint receives entities from `extractEntities()` but may not be formatting the database insert correctly. The schema expects `entities` as JSONB, but if the format doesn't match what the chat interface expects, retrieval fails.

3. **No Fallback in Chat**: When Cognee recall fails (returns empty context), the `/api/ask` endpoint immediately generates an answer with "(no memories found)" context instead of searching the Supabase `memories` table as a fallback.

4. **Graph Layout Algorithm**: The circular layout calculation in `memory-graph.tsx` uses radius 260px but doesn't account for node width (130px), causing overlapping at certain entity counts.

5. **Missing Click Handlers**: The React Flow nodes are rendered but have no `onClick` handler, so clicking does nothing even though the design calls for entity details dialogs.

## Correctness Properties

Property 1: Bug Condition - Entity Extraction and Save

_For any_ document upload where the bug condition holds (file successfully uploaded to Storage and document record created, but entities not extracted or saved), the fixed workflow SHALL extract medical entities using Groq API, save them to the `memories` table with proper `user_id`, `document_id`, `text`, and `entities` fields, and return a success response with entity count that enables the chat interface to retrieve and use those memories.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - File Upload and Storage

_For any_ file upload input where the bug condition does NOT hold (uploads that complete successfully and don't involve entity extraction), the fixed code SHALL produce exactly the same behavior as the original code, preserving Supabase Storage saves, document table inserts, Cognee integration, authentication checks, file type validation, and error handling.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/components/upload-modal.tsx`

**Function**: `handleFile` and component state

**Specific Changes**:
1. **Add Memorize Button State**: Add `memorized` boolean state to track whether entity extraction has completed after upload
   - After upload succeeds, set `memorized: false` and show "Memorize" button instead of closing modal
   - When "Memorize" clicked, call `/api/remember` with document text and ID
   - Show "Extracting medical entities..." loading state during extraction
   - On success, show "✓ Memorized! Found X medications, Y symptoms, Z diagnoses" with entity counts
   
2. **Improve Error Visibility**: Change status states to include `"memorizing"` and `"memorized"` alongside existing states
   - Display any entity extraction errors in the error banner instead of silent failures
   - Allow user to retry memorization if it fails

3. **Status Message Updates**: Update status messages to distinguish upload vs memorization phases
   - `"uploading"`: "Reading your document…"
   - `"memorizing"`: "Extracting medical entities..."
   - `"memorized"`: "✓ Memorized! Found 3 medications, 2 symptoms, 1 diagnosis"

**File**: `src/app/api/remember/route.ts`

**Function**: `POST` handler

**Specific Changes**:
1. **Fix Entity Save Format**: Ensure the `entities` field in the database insert uses the exact format returned by `extractEntities()`
   - Current code: `entities,` (direct pass-through)
   - Expected: entities should be array of `{name, type, confidence}` objects
   - Verify JSONB serialization is correct

2. **Add Response Format**: Change response to include entity counts for UI display
   - Current: `{ memory }`
   - New: `{ success: true, memoryId: memory.id, entities: entities, count: { medication: X, symptom: Y, ... } }`

3. **Error Handling**: Add specific error messages for Groq failures vs database failures
   - If Groq extraction fails: return `{ error: "Failed to extract entities: <reason>" }`
   - If database insert fails: return `{ error: "Failed to save memory: <reason>" }`

**File**: `src/app/api/ask/route.ts`

**Function**: `POST` handler

**Specific Changes**:
1. **Add Fallback Memory Search**: After `cogneeRecall()` returns, check if context is empty
   - If empty, query Supabase: `SELECT * FROM memories WHERE user_id = ? AND (text ILIKE '%keyword%' OR entities::text ILIKE '%keyword%') LIMIT 10`
   - Extract keywords from question (split on whitespace, filter short words)
   - Build context from found memories: concatenate `text` fields

2. **Add Helpful No-Memory Message**: If both Cognee and fallback return empty, return specific guidance
   - Message: "I can see your documents, but I need to extract the medical details first. Please go to Documents and click 'Memorize' on each uploaded file."

**File**: `src/components/memory-graph.tsx`

**Function**: Node position calculation in `useMemo`

**Specific Changes**:
1. **Fix Circular Layout Algorithm**: Adjust radius calculation to account for node dimensions
   - Current: `radius = 260`
   - New: `radius = Math.max(260, (data.length * 140) / (2 * Math.PI))` (ensures 140px spacing between node centers)
   
2. **Adjust Node Sizing**: Reduce node width from 130px to 120px and height to 60px to prevent overlap

3. **Add Click Handler**: Add `onClick` handler to each entity node
   - Handler opens shadcn Dialog with entity details
   - Dialog content: entity name (heading), type badge (colored), confidence bar, source document, date extracted
   
4. **Create Entity Details Dialog**: Add new dialog component structure within the graph
   - Use `<Dialog>` from `src/components/ui/dialog.tsx`
   - Display: name, type (badge), confidence (progress indicator), document link, timestamp
   - Add "Related Entities" section (for future enhancement)

5. **Node Data Enhancement**: Pass full entity object to node data instead of just label string
   - Current: `data: { label: \`${entity.name}\n${Math.round(entity.confidence * 100)}%\` }`
   - New: `data: { label: ..., entity: entity, onClick: handleNodeClick }`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Manually test the upload flow with real medical documents on the UNFIXED code, observing network requests and database state to understand where the extraction fails.

**Test Cases**:
1. **PDF Upload Test**: Upload real medical PDF, observe `/api/upload` success, observe `/api/remember` call and response, check `memories` table for saved entities (will fail on unfixed code - no entities saved)
2. **TXT Upload Test**: Upload medication list TXT, observe same flow, attempt chat query for medication name (will fail on unfixed code - "no memories found")
3. **Empty Document Test**: Upload empty TXT file, observe error handling (may fail on unfixed code - crash or silent failure)
4. **Chat Fallback Test**: After upload, query chat for known entity, observe only Cognee recall (will fail on unfixed code - no Supabase fallback)
5. **Graph Rendering Test**: Upload document with 10+ entities, observe graph layout (will fail on unfixed code - overlapping nodes)
6. **Node Click Test**: Click on any graph node (will fail on unfixed code - nothing happens)

**Expected Counterexamples**:
- `/api/remember` returns success but `memories` table has no rows or malformed JSONB
- Chat returns "no memories found" even after successful upload
- Graph nodes overlap when entity count exceeds 8-10
- Node clicks have no effect

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  // Upload document
  uploadResponse := POST /api/upload WITH input.file
  ASSERT uploadResponse.ok
  
  // Click Memorize button (new behavior)
  memorizeResponse := POST /api/remember WITH { 
    text: uploadResponse.document.content, 
    documentId: uploadResponse.document.id 
  }
  ASSERT memorizeResponse.ok
  ASSERT memorizeResponse.entities.length > 0
  
  // Verify database save
  memoriesFromDB := SELECT * FROM memories WHERE document_id = uploadResponse.document.id
  ASSERT memoriesFromDB.length > 0
  ASSERT memoriesFromDB[0].entities IS VALID JSONB ARRAY
  
  // Verify chat can retrieve
  chatResponse := POST /api/ask WITH { question: "What medications do I take?" }
  ASSERT chatResponse.context.length > 0
  ASSERT chatResponse.answer CONTAINS entity names from memorizeResponse
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  // Test file upload to Storage
  uploadResult := POST /api/upload WITH validPDF
  ASSERT uploadResult.document.file_path MATCHES "<user_id>/<filename>"
  ASSERT uploadResult.document.content IS EXTRACTED TEXT
  
  // Test file type rejection
  uploadResult := POST /api/upload WITH invalidFile
  ASSERT uploadResult.error = "Please upload a PDF or TXT file."
  
  // Test authentication
  uploadResult := POST /api/upload WITHOUT auth token
  ASSERT uploadResult.status = 401
  ASSERT uploadResult.error = "Not signed in."
  
  // Test Cognee integration
  rememberResult := POST /api/remember WITH { text: "Test" }
  ASSERT rememberResult.memory.cognee_id IS NOT NULL
  
  // Test graph sample data rendering
  ASSERT graph displays SAMPLE_ENTITIES when entities prop is undefined
  
  // Test shadow node styling
  entity := { type: "symptom", confidence: 0.3 }
  node := renderNode(entity)
  ASSERT node.style.border CONTAINS "dashed"
  ASSERT node.style.border CONTAINS LAVENDER color
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss (e.g., unusual file names, very long document text, edge case confidence scores)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: First observe behavior on UNFIXED code for non-upload interactions (navigation, viewing documents, graph interactions with sample data), then write property-based tests capturing that behavior and verify they still pass on FIXED code.

**Test Cases**:
1. **File Upload Preservation**: Verify uploading PDFs/TXTs saves to Storage at correct path, creates document record with all fields, extracts text correctly
2. **Cognee Integration Preservation**: Verify `cogneeRemember()` is still called, `cognee_id` is stored, fallback mode works when Cognee unavailable
3. **Authentication Preservation**: Verify all API endpoints return 401 without valid JWT, accept Bearer tokens, verify user ownership via RLS
4. **Graph Rendering Preservation**: Verify sample data displays when no entities, shadow nodes render correctly for low-confidence symptoms, colors match TYPE_COLORS
5. **File Validation Preservation**: Verify non-PDF/TXT files rejected, empty files handled gracefully, file size limits respected (if any)
6. **Error Message Preservation**: Verify exact error message text matches for rejected file types, missing auth, empty inputs

### Unit Tests

- Test `extractEntities()` with various medical text samples (medications lists, doctor's notes, lab results)
- Test `/api/remember` database insert with valid and invalid entity formats
- Test `/api/ask` fallback search with different query keywords and memory table states
- Test circular layout algorithm with 1, 5, 10, 20, 50 entities to verify no overlap
- Test node click handler opens dialog with correct entity details
- Test "Memorize" button state transitions in upload modal

### Property-Based Tests

- Generate random medical text samples and verify `extractEntities()` always returns valid array of entities with required fields
- Generate random entity counts (1-100) and verify graph layout never produces overlapping nodes
- Generate random document uploads and verify end-to-end flow always results in searchable memories
- Generate random chat queries and verify fallback search always returns results when memories exist in database

### Integration Tests

- Test full upload → memorize → chat flow with real PDF containing medical data
- Test upload with Cognee unavailable (fallback mode) to verify Supabase fallback works end-to-end
- Test multiple document uploads and verify memory graph aggregates all entities correctly
- Test clicking graph nodes after upload and verify dialog shows correct source document links
- Test error recovery: upload failure → retry, extraction failure → re-memorize
