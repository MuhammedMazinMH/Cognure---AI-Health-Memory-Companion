// The public landing page at "/". It introduces Cognure and links to login
// and signup. This is a simple server component (no interactivity needed).

import Link from "next/link";
import { Brain, MessageCircle, Network } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-center">
      <div className="max-w-2xl">
        <h1 className="font-heading text-5xl font-bold text-charcoal">
          Cognure
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Your Health Memory AI. Upload your medical documents, watch them
          become a living memory graph, and ask questions in plain language.
        </p>

        {/* Three quick feature highlights. */}
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <Feature
            icon={<Network className="h-7 w-7 text-sage" />}
            title="Memory Graph"
            text="See how your medications, symptoms, and diagnoses connect."
          />
          <Feature
            icon={<Brain className="h-7 w-7 text-sage" />}
            title="Remembers"
            text="Cognure stores and refines what it learns over time."
          />
          <Feature
            icon={<MessageCircle className="h-7 w-7 text-sage" />}
            title="Ask Anything"
            text="Chat with your health history and get grounded answers."
          />
        </div>

        {/* Call-to-action buttons. */}
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-sage px-6 py-3 font-medium text-white transition-colors hover:bg-sage/90"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-border px-6 py-3 font-medium text-charcoal transition-colors hover:bg-accent"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

// A small presentational helper for the feature cards above.
function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-5">
      {icon}
      <h3 className="font-heading text-lg font-semibold text-charcoal">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
