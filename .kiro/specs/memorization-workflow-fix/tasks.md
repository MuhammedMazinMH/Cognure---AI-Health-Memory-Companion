# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Document Upload Without Entity Extraction
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Test concrete failing case where document uploads successfully but entities are not extracted/saved
  - Test implementation details from Bug Condition in design:
    - Upload a valid PDF or TXT document with medical content (e.g., "Metformin 500mg twice daily")
    - Verify document saved to Supabase Storage and `documents` table
    - Call `/api/remember` with document text and document ID
    - Query `memories` table for entities with matching `document_id`
    - Assert that entities exist, are properly formatted JSONB, and are retrievable by chat
  - The test assertions should match the Expected Behavior Properties from design:
    - Entities extracted using Groq API with system prompt requesting JSON array
    - Each entity saved with proper `user_id`, `document_id`, `text`, and `entities` fields
    - Chat interface can retrieve memories using fallback search
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - `/api/remember` may return success but `memories` table has no rows
    - Entities may be malformed JSONB that cannot be queried
    - Chat returns "no memories found" even after upload
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [-] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Upload and Integration Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (file uploads without entity extraction):
    - Test file upload to Supabase Storage saves to path `<user_id>/<filename>`
    - Test document record created with all fields (id, user_id, file_name, file_path, file_type, content, created_at)
    - Test Cognee integration: `cogneeRemember()` called and `cognee_id` stored
    - Test authentication: API endpoints return 401 without JWT token
    - Test file type validation: non-PDF/TXT files rejected with "Please upload a PDF or TXT file."
    - Test entity validation: invalid types or confidence scores filtered
    - Test graph rendering: sample data displays when no entities
    - Test shadow nodes: low-confidence symptoms (<0.5) render with dashed border
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - For all valid PDF/TXT uploads, file path matches pattern `<user_id>/<filename>`
    - For all `/api/remember` calls, `cognee_id` is non-null in database
    - For all unauthenticated requests, response status is 401
    - For all invalid file types, error message is exact match
    - For all graph renders with no entities, SAMPLE_ENTITIES displayed
    - For all symptom entities with confidence < 0.5, node style includes dashed border
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 3. Fix memorization workflow

  - [ ] 3.1 Add "Memorize" button to upload modal with state management
    - Open `src/components/upload-modal.tsx`
    - Add new state variable: `memorized: boolean` (tracks entity extraction completion)
    - Add new status value: `"memorizing"` and `"memorized"` to existing status type
    - Modify `handleFile` to NOT close modal immediately after upload success
    - After upload succeeds, set `memorized: false` and display "Memorize" button
    - Add `handleMemorize` async function that:
      - Sets status to `"memorizing"`
      - Calls `/api/remember` with `{ text: uploadedDocument.content, documentId: uploadedDocument.id }`
      - On success, parse entity counts from response
      - Set status to `"memorized"` with message: "✓ Memorized! Found X medications, Y symptoms, Z diagnoses"
      - On error, set status to `"error"` with extraction error message
    - Update status messages:
      - `"uploading"`: "Reading your document…"
      - `"memorizing"`: "Extracting medical entities..."
      - `"memorized"`: "✓ Memorized! Found 3 medications, 2 symptoms, 1 diagnosis"
    - Add retry capability: if memorization fails, keep "Memorize" button visible for retry
    - _Bug_Condition: isBugCondition(input) where document uploaded but entities not extracted_
    - _Expected_Behavior: Modal displays "Memorize" button, triggers entity extraction, shows entity counts_
    - _Preservation: Existing upload flow to Storage and documents table unchanged_
    - _Requirements: 2.1, 2.2_

  - [ ] 3.2 Rewrite `/api/remember` to extract and save entities properly
    - Open `src/app/api/remember/route.ts`
    - Update request body type to accept: `{ text: string, documentId: string }`
    - In POST handler, extract `text` and `documentId` from request body
    - Call existing `extractEntities(text)` function with Groq API
    - Verify entities array format: each entity has `{name, type, confidence}`
    - Calculate entity counts by type: `{ medication: X, symptom: Y, diagnosis: Z, procedure: A, provider: B }`
    - Insert into `memories` table with proper fields:
      - `user_id`: from authenticated user (supabase.auth.getUser())
      - `document_id`: from request body
      - `text`: from request body (the document content)
      - `entities`: JSONB array of entity objects
      - `cognee_id`: from existing `cogneeRemember()` call
    - Update response format to: `{ success: true, memoryId: memory.id, entities: entities, count: { medication: X, symptom: Y, ... } }`
    - Add specific error handling:
      - If Groq extraction fails: `{ error: "Failed to extract entities: <reason>" }`
      - If database insert fails: `{ error: "Failed to save memory: <reason>" }`
    - Test with empty text input: should return `{ success: true, entities: [], count: {} }`
    - _Bug_Condition: isBugCondition(input) where entities not saved in retrievable format_
    - _Expected_Behavior: Entities extracted with Groq, saved to memories table, counts returned_
    - _Preservation: Cognee integration and cognee_id storage unchanged_
    - _Requirements: 2.3, 3.3, 3.4_

  - [ ] 3.3 Add fallback memory search to `/api/ask`
    - Open `src/app/api/ask/route.ts`
    - After `cogneeRecall()` call, check if `context` is empty or Cognee failed
    - If empty, implement Supabase fallback search:
      - Extract keywords from question (split on whitespace, filter words < 3 chars)
      - Build SQL query: `SELECT * FROM memories WHERE user_id = ? AND (text ILIKE '%keyword%' OR entities::text ILIKE '%keyword%') ORDER BY created_at DESC LIMIT 10`
      - Execute query for each keyword with OR conditions
      - Concatenate `text` fields from found memories to build context
    - If fallback also returns no results, check if user has any documents:
      - Query: `SELECT COUNT(*) FROM documents WHERE user_id = ?`
      - If count > 0, return helpful message: "I can see your documents, but I need to extract the medical details first. Please go to Documents and click 'Memorize' on each uploaded file."
      - If count = 0, return: "I don't have any medical documents yet. Upload some documents to get started!"
    - Test with:
      - Question "What medications do I take?" with memories containing "Metformin" → should find via fallback
      - Question after upload without memorization → should return helpful guidance message
    - _Bug_Condition: isBugCondition(input) where Cognee recall fails but memories exist in Supabase_
    - _Expected_Behavior: Fallback searches Supabase memories table using ILIKE keyword matching_
    - _Preservation: Cognee recall as primary source unchanged, existing chat response format preserved_
    - _Requirements: 2.4_

  - [ ] 3.4 Fix graph circular layout algorithm
    - Open `src/components/memory-graph.tsx`
    - Locate node position calculation in `useMemo` hook
    - Update circular layout algorithm:
      - Change radius calculation from fixed `260` to dynamic: `Math.max(260, (data.length * 140) / (2 * Math.PI))`
      - This ensures 140px spacing between node centers regardless of entity count
      - Adjust node dimensions: width from 130px to 120px, height to 60px
      - Keep font size at 14px for readability
    - Update node positioning logic:
      - Center "You" node at (0, 0)
      - Position entity nodes in circle: `x = radius * cos(angle)`, `y = radius * sin(angle)`
      - Calculate angle: `(2 * π * i) / entityCount`
    - Test with different entity counts:
      - 5 entities: verify no overlap with radius 260px
      - 10 entities: verify no overlap with increased radius
      - 20 entities: verify proper spacing maintained
      - 50 entities: verify circle expands appropriately
    - _Bug_Condition: isBugCondition(input) where entity count causes node overlap_
    - _Expected_Behavior: Circular layout with dynamic radius preventing overlap_
    - _Preservation: Sample data rendering, shadow node styling, TYPE_COLORS unchanged_
    - _Requirements: 2.5, 3.6, 3.7_

  - [ ] 3.5 Add click handler with entity details dialog
    - Open `src/components/memory-graph.tsx`
    - Add state for dialog: `const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)`
    - Create `handleNodeClick` function:
      - Extract entity from node data: `const entity = nodeData.entity`
      - Set selected entity: `setSelectedEntity(entity)`
    - Update node data structure to include full entity object:
      - Current: `data: { label: \`${entity.name}\n${Math.round(entity.confidence * 100)}%\` }`
      - New: `data: { label: ..., entity: entity }`
    - Add `onClick` handler to each node element
    - Import Dialog components from `src/components/ui/dialog.tsx`
    - Create entity details dialog JSX:
      ```tsx
      <Dialog open={selectedEntity !== null} onOpenChange={() => setSelectedEntity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEntity?.name}</DialogTitle>
          </DialogHeader>
          <div>
            <Badge color={TYPE_COLORS[selectedEntity?.type]}>{selectedEntity?.type}</Badge>
            <div>Confidence: {Math.round((selectedEntity?.confidence ?? 0) * 100)}%</div>
            <Progress value={(selectedEntity?.confidence ?? 0) * 100} />
            <div>Source: {selectedEntity?.documentName}</div>
            <div>Extracted: {new Date(selectedEntity?.createdAt).toLocaleDateString()}</div>
          </div>
        </DialogContent>
      </Dialog>
      ```
    - Add related entities section (placeholder for future):
      - Display "Related Entities: Coming soon"
    - Test click interactions:
      - Click medication node → dialog shows medication details
      - Click symptom node with low confidence → dialog shows confidence bar
      - Close dialog → selectedEntity set to null
    - _Bug_Condition: isBugCondition(input) where node clicks have no effect_
    - _Expected_Behavior: Clicking node opens Dialog with entity name, type badge, confidence, source document, date_
    - _Preservation: Graph rendering and node styling unchanged_
    - _Requirements: 2.6_

  - [ ] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Entity Extraction and Retrieval
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1:
      - Upload document with medical content
      - Verify entities saved to `memories` table with proper format
      - Verify chat can retrieve memories via fallback search
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Document results:
      - `/api/remember` returns success with entity counts
      - `memories` table contains properly formatted JSONB entities
      - Chat retrieves memories and includes them in context
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - No Regressions in Existing Functionality
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2:
      - File upload to Supabase Storage at correct path
      - Document record creation with all fields
      - Cognee integration with cognee_id storage
      - Authentication 401 responses for unauthenticated requests
      - File type validation rejecting invalid files
      - Entity validation filtering invalid data
      - Graph sample data rendering
      - Shadow node styling for low-confidence symptoms
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - If any preservation test fails, investigate and fix without breaking bug condition test
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run full test suite (bug condition + preservation tests)
  - Verify all tests pass:
    - Bug condition test passes (entities extracted and retrievable)
    - Preservation tests pass (no regressions in existing functionality)
  - Manually test end-to-end workflow:
    - Upload PDF document with medical content
    - Click "Memorize" button in modal
    - Verify success message with entity counts
    - Navigate to chat interface
    - Ask question about medical entity
    - Verify chat returns relevant answer using extracted memories
    - Navigate to memory graph
    - Verify entities displayed in circular layout without overlap
    - Click on entity node
    - Verify dialog displays entity details
  - If any issues arise, document them and ask the user for guidance
  - Ensure all code changes are committed with descriptive commit messages
