// Supabase gives us authentication, a Postgres database, and file storage.
// We need TWO ways to talk to it:
//   1) From the BROWSER (login, signup, reading the current session).
//      This uses @supabase/ssr which automatically attaches the user's JWT
//      token to every request, so Row Level Security works correctly.
//   2) From the SERVER (inside API routes that save data on the user's behalf).
//
// Both use the PUBLIC anon key. The anon key is safe to expose in the browser
// because Supabase Row Level Security (RLS) decides what each user can do.

import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// These come from .env.local. The NEXT_PUBLIC_ prefix means they are allowed
// to be sent to the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// `createClient` throws immediately if the URL is not a real http(s) URL.
// Before you fill in .env.local the value is the placeholder "your_supabase_url",
// which would crash the build. To stay friendly we fall back to a harmless
// placeholder URL/key. Once you add your real Supabase values, those are used
// instead. (Network calls simply won't work until real values are set.)
const FALLBACK_URL = "https://placeholder.supabase.co";
const FALLBACK_KEY = "placeholder-anon-key";

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const safeUrl = isValidHttpUrl(supabaseUrl) ? supabaseUrl : FALLBACK_URL;
const safeKey = supabaseAnonKey || FALLBACK_KEY;

// We keep a single browser client instead of making a new one on every render.
let browserClient: SupabaseClient | null = null;

/**
 * Returns the Supabase client for use in the BROWSER (client components).
 * 
 * IMPORTANT: This uses @supabase/ssr's createBrowserClient which automatically:
 * 1. Reads the user's session from cookies
 * 2. Attaches the JWT token to every database/storage request
 * 3. Handles token refresh automatically
 * 
 * This ensures that Row Level Security (RLS) works correctly - each user
 * can only see their own data when querying directly from the frontend.
 */
export function getBrowserSupabase(): SupabaseClient {
  if (!browserClient) {
    // createBrowserClient from @supabase/ssr handles cookies and JWT tokens
    // automatically. It's the correct way to use Supabase from the browser.
    browserClient = createBrowserClient(safeUrl, safeKey, {
      // cookieOptions are handled automatically by @supabase/ssr
      // It reads from document.cookie and includes the session in every request
    });
    
    console.log("[Browser Supabase] Client initialized with SSR support");
  }
  return browserClient;
}

/**
 * Creates a Supabase client for use on the SERVER (inside API routes).
 *
 * @param accessToken - The logged-in user's access token (a JWT). The browser
 *   sends this in the `Authorization` header. Passing it here makes Supabase
 *   treat database/storage requests as that specific user, so Row Level
 *   Security rules apply correctly. If omitted, the client acts as an
 *   anonymous visitor.
 */
export function getServerSupabase(accessToken?: string): SupabaseClient {
  return createClient(safeUrl, safeKey, {
    auth: {
      // The server is stateless: it should not try to persist or refresh
      // sessions. Each request brings its own token.
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

/**
 * Small helper used by API routes to read the access token out of the
 * incoming request's `Authorization: Bearer <token>` header.
 * Returns undefined if there is no token.
 */
export function getTokenFromRequest(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  if (!header) return undefined;
  // Header looks like "Bearer eyJhbGci..." – we want just the token part.
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return undefined;
  return token;
}
