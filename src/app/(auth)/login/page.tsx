// The login screen. It is a CLIENT component because it has interactive form
// state and talks to Supabase directly from the browser.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  // Form state: what the user typed, plus loading/error flags for feedback.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Runs when the form is submitted.
  async function handleLogin(event: React.FormEvent) {
    event.preventDefault(); // stop the browser from reloading the page
    setLoading(true);
    setError(null);

    // Ask Supabase to sign the user in with their email and password.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    // Success! Send them to the dashboard.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-charcoal">
            Cognure
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome back to your health memory.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Show any error from Supabase. */}
          {error && (
            <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-sage text-white hover:bg-sage/90"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Cognure?{" "}
          <Link href="/signup" className="font-medium text-sage hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
