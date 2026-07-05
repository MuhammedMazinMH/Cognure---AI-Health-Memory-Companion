"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Check } from "lucide-react";

const SELLING_POINTS = [
  "Upload PDFs and text files securely",
  "Automatic entity extraction in seconds",
  "Medication interaction warnings",
  "Chat with your health history",
];

export default function SignupPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

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

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setMessage(
      "Account created! Check your email to confirm, then sign in."
    );
  }

  return (
    <main className="flex min-h-screen bg-background">
      {/* Left decorative panel */}
      <aside className="hidden w-1/2 flex-col justify-between bg-sage/8 p-14 lg:flex border-r border-border">
        <Link href="/" className="font-heading text-xl font-bold text-charcoal">
          Cognure
        </Link>
        <div className="space-y-6">
          <h2 className="font-heading text-3xl font-bold leading-snug text-charcoal text-balance">
            Everything your health history needs, in one place.
          </h2>
          <ul className="space-y-3">
            {SELLING_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm text-charcoal/65">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage/20">
                  <Check className="h-3 w-3 text-sage" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-charcoal/30">
          Free to start. No credit card required.
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
              Create your account
            </h1>
            <p className="mt-2 text-sm text-charcoal/50">
              Start building your health memory today.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-medium text-charcoal">
                Full name
              </Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-11 rounded-xl border-border bg-card"
              />
            </div>

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
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                className="h-11 rounded-xl border-border bg-card"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-coral">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-xl border border-sage/30 bg-sage/8 px-4 py-3 text-sm text-sage">
                {message}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sage text-sm font-semibold text-white shadow-sm transition-all hover:bg-sage/90 hover:shadow-md"
            >
              {loading ? "Creating account…" : "Create free account"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-charcoal/50">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-sage transition-colors hover:text-sage/80 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
