// Supabase client for the Cognure mobile app.
// Mirrors src/lib/supabase-client.ts from the web app: same Supabase project,
// same PUBLIC anon key (safe to expose — Row Level Security decides access).
//
// The only mobile-specific difference: sessions persist in AsyncStorage
// instead of browser cookies, which is the standard React Native pattern.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Same friendly fallback behaviour as the web client: don't crash when env
// vars are missing — network calls simply won't work until real values exist.
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

// Single shared client (same singleton pattern as getBrowserSupabase on web).
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(safeUrl, safeKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // No URL-based auth callbacks in a native app.
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
