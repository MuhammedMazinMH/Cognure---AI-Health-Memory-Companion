// Vitest setup file
// This file runs before each test suite

import { config } from 'dotenv'
import path from 'path'

// Load environment variables from .env.local for tests
config({ path: path.resolve(__dirname, '.env.local') })
