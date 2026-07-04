// The signup screen. Like login, it is a CLIENT component.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // After signup, Supabase may require email confirmation, so we show a notice.
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // Create the account. We pass full_name into user metadata so it is stored
    // alongside the account and available later.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // If a session was returned, the user is logged in immediately.
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // Otherwise, email confirmation is required.
    setMessage(
      "Account created! Please check your email to confirm, then sign in."
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-charcoal">
            Cognure
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Start building your health memory.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

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
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-md bg-sage/10 px-3 py-2 text-sm text-sage">
              {message}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-sage text-white hover:bg-sage/90"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-sage hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
