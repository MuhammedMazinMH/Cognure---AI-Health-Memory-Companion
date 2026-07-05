"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen bg-background">
      {/* Left decorative panel — hidden on mobile */}
      <aside className="hidden w-1/2 flex-col justify-between bg-sage/8 p-14 lg:flex border-r border-border">
        <Link href="/" className="font-heading text-xl font-bold text-charcoal">
          Cognure
        </Link>
        <div>
          <blockquote className="space-y-3">
            <p className="font-heading text-2xl font-semibold leading-snug text-charcoal text-balance">
              &ldquo;Finally an AI health tool that doesn&apos;t make things up.
              Every answer it gives me points back to something I actually
              uploaded.&rdquo;
            </p>
            <footer className="text-sm text-charcoal/50">
              — Priya L., Patient advocate
            </footer>
          </blockquote>
        </div>
        <p className="text-xs text-charcoal/30">
          Your health history, privately kept.
        </p>
      </aside>

      {/* Right: form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <Link
            href="/"
            className="mb-10 block font-heading text-xl font-bold text-charcoal lg:hidden"
          >
            Cognure
          </Link>

          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold text-charcoal">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-charcoal/50">
              Sign in to your health memory.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-charcoal">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl border-border bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-charcoal">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl border-border bg-card"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-coral">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sage text-sm font-semibold text-white shadow-sm transition-all hover:bg-sage/90 hover:shadow-md"
            >
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-charcoal/50">
            New to Cognure?{" "}
            <Link
              href="/signup"
              className="font-medium text-sage transition-colors hover:text-sage/80 hover:underline"
            >
              Create a free account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
