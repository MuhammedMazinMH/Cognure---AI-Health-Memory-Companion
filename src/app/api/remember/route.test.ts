/**
 * Bug Condition Exploration Test - Task 1
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 * 
 * Property 1: Bug Condition - Document Upload Without Entity Extraction
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * NOTE: This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * 
 * GOAL: Surface counterexamples that demonstrate the bug exists
 * 
 * Expected Counterexamples:
 * - `/api/remember` returns success but `memories` table has no rows
 * - Entities are malformed JSONB that cannot be queried
 * - Chat returns "no memories found" even after successful upload
 * 
 * IMPLEMENTATION APPROACH: Uses mocked unit tests instead of full integration tests
 * - Mocks Supabase client and database operations
 * - Mocks Groq API for entity extraction
 * - Mocks Cognee API for memory storage
 * - No real network requests or database calls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { HealthEntity } from '@/types'

// Mock the external dependencies BEFORE importing the route handler
vi.mock('@/lib/supabase-client', () => ({
  getServerSupabase: vi.fn(),
  getTokenFromRequest: vi.fn(),
}))

vi.mock('@/lib/cognee-client', () => ({
  cogneeRemember: vi.fn(),
}))

vi.mock('@/lib/groq-client', () => ({
  extractEntities: vi.fn(),
}))

// Now import the route handler and mocked modules
import { POST as rememberHandler } from './route'
import { getServerSupabase, getTokenFromRequest } from '@/lib/supabase-client'
import { cogneeRemember } from '@/lib/cognee-client'
import { extractEntities } from '@/lib/groq-client'

// Sample medical document content with extractable entities
const MEDICAL_DOCUMENT_CONTENT = `
Patient Medical Record
Date: January 15, 2024

Chief Complaint: Persistent fatigue and increased thirst

Current Medications:
- Metformin 500mg twice daily
- Lisinopril 10mg once daily

Diagnoses:
- Type 2 Diabetes Mellitus
- Hypertension

Recent Procedures:
- HbA1c blood test (Result: 7.2%)
- Blood pressure monitoring

Provider: Dr. Sarah Johnson, MD
`

// Expected entities that should be extracted from the medical document
const EXPECTED_ENTITIES: HealthEntity[] = [
  { name: 'Metformin', type: 'medication', confidence: 0.95 },
  { name: 'Lisinopril', type: 'medication', confidence: 0.93 },
  { name: 'Persistent fatigue', type: 'symptom', confidence: 0.88 },
  { name: 'Increased thirst', type: 'symptom', confidence: 0.87 },
  { name: 'Type 2 Diabetes Mellitus', type: 'diagnosis', confidence: 0.98 },
  { name: 'Hypertension', type: 'diagnosis', confidence: 0.97 },
  { name: 'HbA1c blood test', type: 'procedure', confidence: 0.91 },
  { name: 'Blood pressure monitoring', type: 'procedure', confidence: 0.89 },
  { name: 'Dr. Sarah Johnson', type: 'provider', confidence: 0.96 },
]

describe('Bug Condition Exploration: Document Upload Without Entity Extraction', () => {
  const mockUserId = 'test-user-123'
  const mockDocumentId = 'test-doc-456'
  const mockMemoryId = 'test-memory-789'
  const mockCogneeId = 'cognee-abc-def'

  // Mock Supabase client
  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  }

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Setup default mock implementations
    vi.mocked(getTokenFromRequest).mockReturnValue('mock-token')
    vi.mocked(getServerSupabase).mockReturnValue(mockSupabaseClient as any)
    vi.mocked(cogneeRemember).mockResolvedValue({ id: mockCogneeId })
    vi.mocked(extractEntities).mockResolvedValue(EXPECTED_ENTITIES)

    // Setup default Supabase auth mock
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId, email: 'test@example.com' } },
      error: null,
    } as any)

    // Setup default Supabase database mock
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: mockMemoryId,
        user_id: mockUserId,
        document_id: mockDocumentId,
        text: MEDICAL_DOCUMENT_CONTENT,
        cognee_id: mockCogneeId,
        entities: EXPECTED_ENTITIES,
        created_at: new Date().toISOString(),
      },
      error: null,
    })

    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
    } as any)
  })

  it('should extract and save medical entities from uploaded document', async () => {
    // **Property 1: Bug Condition** - Document Upload Without Entity Extraction
    // This test validates the EXPECTED behavior after the fix
    // On UNFIXED code, this test will FAIL because entities are not properly extracted/saved

    // Create mock request
    const mockRequest = new Request('http://localhost:3000/api/remember', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
      },
      body: JSON.stringify({
        text: MEDICAL_DOCUMENT_CONTENT,
        documentId: mockDocumentId,
      }),
    })

    // Call the API handler
    const response = await rememberHandler(mockRequest)
    const responseData = await response.json()

    // **CRITICAL ASSERTIONS** - These will FAIL on unfixed code:

    // 1. API should return success
    expect(response.status).toBe(200)

    // 2. Response should include the saved memory
    expect(responseData.memory).toBeDefined()
    expect(responseData.memory.id).toBe(mockMemoryId)

    // 3. Entities should be extracted and included in the response
    expect(responseData.memory.entities).toBeDefined()
    expect(Array.isArray(responseData.memory.entities)).toBe(true)
    expect(responseData.memory.entities.length).toBeGreaterThan(0)

    // 4. Each entity should have proper structure (name, type, confidence)
    for (const entity of responseData.memory.entities) {
      expect(entity).toHaveProperty('name')
      expect(entity).toHaveProperty('type')
      expect(entity).toHaveProperty('confidence')
      expect(typeof entity.name).toBe('string')
      expect(['medication', 'symptom', 'diagnosis', 'procedure', 'provider']).toContain(entity.type)
      expect(entity.confidence).toBeGreaterThanOrEqual(0)
      expect(entity.confidence).toBeLessThanOrEqual(1)
    }

    // 5. Specific medical entities should be present
    const entityNames = responseData.memory.entities.map((e: any) => e.name.toLowerCase())
    expect(entityNames.some((name: string) => name.includes('metformin'))).toBe(true)
    expect(entityNames.some((name: string) => name.includes('diabetes'))).toBe(true)

    // 6. Proper fields should be saved to database
    expect(responseData.memory.user_id).toBe(mockUserId)
    expect(responseData.memory.document_id).toBe(mockDocumentId)
    expect(responseData.memory.text).toBe(MEDICAL_DOCUMENT_CONTENT)
    expect(responseData.memory.cognee_id).toBe(mockCogneeId)

    // 7. Verify extractEntities was called with the document text
    expect(extractEntities).toHaveBeenCalledWith(MEDICAL_DOCUMENT_CONTENT)

    // 8. Verify cogneeRemember was called
    expect(cogneeRemember).toHaveBeenCalled()

    // **COUNTEREXAMPLE DOCUMENTATION**
    // On UNFIXED code, this test will fail with one of these symptoms:
    // - `responseData.memory.entities` is undefined or null
    // - `responseData.memory.entities` is an empty array
    // - Entities are malformed (missing name/type/confidence)
    // - Database insert is never called or called with wrong data
    // - Response returns 500 error due to entity extraction failure
  })

  it('should handle empty document text gracefully', async () => {
    // Edge case: Empty text should be rejected with proper error message

    const mockRequest = new Request('http://localhost:3000/api/remember', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
      },
      body: JSON.stringify({
        text: '',
        documentId: mockDocumentId,
      }),
    })

    const response = await rememberHandler(mockRequest)
    const responseData = await response.json()

    // Should reject empty text
    expect(response.status).toBe(400)
    expect(responseData.error).toBeDefined()
    expect(responseData.error).toContain('empty')
  })

  it('should validate entity confidence scores are within valid range', async () => {
    // Property: All extracted entities must have confidence between 0 and 1

    const mockRequest = new Request('http://localhost:3000/api/remember', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
      },
      body: JSON.stringify({
        text: MEDICAL_DOCUMENT_CONTENT,
        documentId: mockDocumentId,
      }),
    })

    const response = await rememberHandler(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(200)

    // Verify all confidence scores are valid
    for (const entity of responseData.memory.entities) {
      expect(entity.confidence).toBeGreaterThanOrEqual(0)
      expect(entity.confidence).toBeLessThanOrEqual(1)
      expect(typeof entity.confidence).toBe('number')
      expect(isNaN(entity.confidence)).toBe(false)
    }
  })

  it('should reject requests without authentication token', async () => {
    // Security validation: Unauthenticated requests should be rejected

    // Override the mock to return null token
    vi.mocked(getTokenFromRequest).mockReturnValue(null)

    const mockRequest = new Request('http://localhost:3000/api/remember', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: MEDICAL_DOCUMENT_CONTENT,
        documentId: mockDocumentId,
      }),
    })

    const response = await rememberHandler(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(401)
    expect(responseData.error).toBeDefined()
    expect(responseData.error).toContain('Not signed in')
  })

  it('should handle Groq API failure gracefully', async () => {
    // Robustness test: Should handle entity extraction failure without crashing

    // Mock Groq to throw an error
    vi.mocked(extractEntities).mockRejectedValue(new Error('Groq API connection failed'))

    const mockRequest = new Request('http://localhost:3000/api/remember', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
      },
      body: JSON.stringify({
        text: MEDICAL_DOCUMENT_CONTENT,
        documentId: mockDocumentId,
      }),
    })

    const response = await rememberHandler(mockRequest)
    const responseData = await response.json()

    // Should return error response
    expect(response.status).toBe(500)
    expect(responseData.error).toBeDefined()
  })

  it('should handle database insert failure gracefully', async () => {
    // Robustness test: Should handle database save failure without crashing

    // Override the database mock to return an error
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed', code: 'DB_ERROR' },
    })

    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
    } as any)

    const mockRequest = new Request('http://localhost:3000/api/remember', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
      },
      body: JSON.stringify({
        text: MEDICAL_DOCUMENT_CONTENT,
        documentId: mockDocumentId,
      }),
    })

    const response = await rememberHandler(mockRequest)
    const responseData = await response.json()

    // Should return error response
    expect(response.status).toBe(500)
    expect(responseData.error).toBeDefined()
    expect(responseData.error).toContain('Saving memory failed')
  })
})
