// The public landing page for Cognure — a premium, calm health memory AI.
// Sections: nav, hero, social proof, features, how-it-works, testimonials, CTA, footer.
// Server component (no interactivity needed at this level).

import Link from "next/link";
import {
  Network,
  MessageCircle,
  Brain,
  ShieldCheck,
  Clock,
  FileText,
  ArrowRight,
  Sparkles,
  Users,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background font-sans text-charcoal">
      <Nav />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <Testimonials />
      <CtaBanner />
      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <span className="font-heading text-xl font-bold tracking-tight text-charcoal">
          Cognure
        </span>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-charcoal/70 transition-colors hover:text-charcoal"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-charcoal px-5 py-2 text-sm font-medium text-cream transition-colors hover:bg-charcoal/85"
          >
            Get started free
          </Link>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-28 text-center">
      {/* Subtle decorative ring behind heading */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 h-[480px] w-[480px] rounded-full bg-sage/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-3xl">
        {/* Pill badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sage/30 bg-sage/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-sage">
          <Sparkles className="h-3 w-3" />
          Your personal health memory
        </div>

        {/* Headline */}
        <h1 className="font-heading text-5xl font-bold leading-[1.1] tracking-tight text-charcoal text-balance sm:text-6xl lg:text-7xl">
          Your health history,
          <br />
          finally{" "}
          <em className="italic text-sage not-italic" style={{ fontStyle: "italic" }}>
            understood
          </em>
          .
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-charcoal/60 text-pretty">
          Cognure turns your scattered medical documents into a living, connected
          memory graph — then lets you ask questions in plain language and get
          answers grounded in your own records.
        </p>

        {/* CTA row */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-sage px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sage/90 hover:shadow-md"
          >
            Start for free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-7 py-3.5 text-sm font-medium text-charcoal transition-colors hover:bg-accent"
          >
            Sign in to your account
          </Link>
        </div>

        {/* Trust micro-copy */}
        <p className="mt-5 text-xs text-charcoal/40">
          No credit card required &nbsp;&middot;&nbsp; Private by design &nbsp;&middot;&nbsp; Free to try
        </p>
      </div>

      {/* Dashboard preview card */}
      <div className="relative mx-auto mt-16 max-w-4xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_60px_rgba(0,0,0,0.08)]">
          {/* Fake browser chrome */}
          <div className="flex items-center gap-2 border-b border-border bg-sidebar px-4 py-3">
            <div className="h-2.5 w-2.5 rounded-full bg-coral/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-sage/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-lavender/60" />
            <div className="ml-4 flex-1 rounded-full bg-background px-3 py-1 text-xs text-charcoal/30">
              cognure.app/dashboard
            </div>
          </div>
          {/* Graph placeholder */}
          <div className="flex min-h-[240px] items-center justify-center gap-8 bg-background p-10">
            {/* Decorative node graph illustration */}
            <NodeIllustration />
          </div>
        </div>
      </div>
    </section>
  );
}

/** A decorative SVG that suggests a knowledge graph. */
function NodeIllustration() {
  const nodes = [
    { x: 200, y: 100, label: "Metformin", color: "#5b8def", r: 28 },
    { x: 360, y: 60, label: "Diabetes", color: "#9b6dc9", r: 24 },
    { x: 480, y: 130, label: "Fatigue", color: "#e07a5f", r: 22 },
    { x: 300, y: 200, label: "Dr. Chen", color: "#e8983b", r: 22 },
    { x: 120, y: 190, label: "Lipitor", color: "#5b8def", r: 24 },
    { x: 440, y: 240, label: "HbA1c test", color: "#4caf7d", r: 20 },
    { x: 560, y: 60, label: "Hypertension", color: "#9b6dc9", r: 20 },
  ];

  const edges = [
    [0, 1], [1, 2], [0, 3], [3, 2], [0, 4], [1, 3],
    [2, 5], [3, 5], [1, 6], [2, 6],
  ];

  return (
    <svg
      viewBox="0 0 680 300"
      className="w-full max-w-2xl opacity-80"
      aria-hidden="true"
    >
      {/* Edges */}
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="#ddd5c4"
          strokeWidth="1.5"
        />
      ))}
      {/* Nodes */}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} opacity={0.9} />
          <text
            x={n.x}
            y={n.y + n.r + 12}
            textAnchor="middle"
            fontSize="9"
            fill="#6b6b6b"
            fontFamily="Inter, sans-serif"
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Social proof strip
// ---------------------------------------------------------------------------

function SocialProof() {
  const stats = [
    { value: "100%", label: "Private & secure" },
    { value: "< 30 s", label: "Document processing" },
    { value: "5+", label: "Entity types tracked" },
    { value: "Free", label: "To get started" },
  ];

  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-border sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="px-8 py-8 text-center">
            <p className="font-heading text-3xl font-bold text-charcoal">
              {s.value}
            </p>
            <p className="mt-1 text-sm text-charcoal/50">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: Network,
    title: "Living memory graph",
    description:
      "Medications, symptoms, diagnoses, procedures, and providers become interconnected nodes you can explore visually. Watch your health history come alive.",
  },
  {
    icon: Brain,
    title: "AI that remembers",
    description:
      "Cognure stores what it learns about you over time. Each new document refines the graph — it never starts from scratch, and it never forgets.",
  },
  {
    icon: MessageCircle,
    title: "Ask in plain language",
    description:
      "\"What medications am I on?\" \"When was my last checkup?\" Get grounded, cited answers in plain English — not a wall of medical jargon.",
  },
  {
    icon: ShieldCheck,
    title: "Interaction warnings",
    description:
      "Cognure automatically checks your medications for known drug-drug interactions and surfaces warnings directly on your graph.",
  },
  {
    icon: Clock,
    title: "Health timeline",
    description:
      "See every event, prescription, and diagnosis on a chronological timeline. Grouped by month, color-coded by entity type.",
  },
  {
    icon: FileText,
    title: "PDF health reports",
    description:
      "Generate a printable summary of your health history — great for bringing to a new specialist or sharing with a family member.",
  },
  {
    icon: Users,
    title: "Family sharing",
    description:
      "Invite a trusted person to view (but not edit) your records. Ideal for caregivers, aging parents, or managing your child's health.",
  },
  {
    icon: Sparkles,
    title: "Symptom trend tracking",
    description:
      "Confidence scores for symptoms are tracked across documents, and Cognure shows you whether each symptom is worsening, improving, or stable.",
  },
];

function Features() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-sage">
            Everything you need
          </p>
          <h2 className="font-heading text-4xl font-bold text-charcoal text-balance">
            A complete health memory system
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-charcoal/55 text-pretty">
            From raw PDFs to a structured, searchable, visual health record — in
            under a minute.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sage/10">
                  <Icon className="h-5 w-5 text-sage" />
                </div>
                <h3 className="mb-2 font-heading text-base font-semibold text-charcoal">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-charcoal/55">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// How it works
// ---------------------------------------------------------------------------

const STEPS = [
  {
    number: "01",
    title: "Upload your documents",
    description:
      "Drop in any PDF or text file — lab results, discharge summaries, prescriptions, anything. Cognure handles the rest automatically.",
  },
  {
    number: "02",
    title: "Watch the graph build",
    description:
      "In seconds, Cognure extracts medications, symptoms, diagnoses, procedures, and providers, then maps how they connect to each other.",
  },
  {
    number: "03",
    title: "Ask, explore, and share",
    description:
      "Chat with your health history, explore the timeline, generate reports, and invite family members to stay in the loop.",
  },
];

function HowItWorks() {
  return (
    <section className="bg-card px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-sage">
            Simple by design
          </p>
          <h2 className="font-heading text-4xl font-bold text-charcoal text-balance">
            Three steps to clarity
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="relative">
              {/* Number */}
              <p className="font-heading text-6xl font-bold text-sage/15 leading-none select-none">
                {step.number}
              </p>
              <div className="-mt-4 pl-2">
                <h3 className="font-heading text-lg font-semibold text-charcoal">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal/55">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

const TESTIMONIALS = [
  {
    quote:
      "I used to show up to every new specialist with a stack of papers and a foggy memory. Cognure turned five years of scattered records into one clear picture.",
    name: "Sarah M.",
    role: "Managing a chronic condition",
  },
  {
    quote:
      "The medication interaction check caught something my pharmacist missed. I genuinely believe this app is going to save lives.",
    name: "James K.",
    role: "Caregiver for aging parent",
  },
  {
    quote:
      "Finally an AI health tool that doesn't make things up. Every answer it gives me points back to something I actually uploaded.",
    name: "Priya L.",
    role: "Patient advocate",
  },
];

function Testimonials() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-sage">
            Real stories
          </p>
          <h2 className="font-heading text-4xl font-bold text-charcoal text-balance">
            People who trust Cognure
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <blockquote
              key={t.name}
              className="rounded-2xl border border-border bg-card p-7 shadow-sm"
            >
              {/* Quote mark */}
              <p className="font-heading text-4xl leading-none text-sage/30 select-none">
                &ldquo;
              </p>
              <p className="mt-1 text-sm leading-relaxed text-charcoal/70">
                {t.quote}
              </p>
              <footer className="mt-5 border-t border-border pt-4">
                <p className="font-semibold text-charcoal text-sm">{t.name}</p>
                <p className="text-xs text-charcoal/40">{t.role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CTA banner
// ---------------------------------------------------------------------------

function CtaBanner() {
  return (
    <section className="px-6 pb-24">
      <div className="mx-auto max-w-3xl rounded-3xl border border-sage/20 bg-sage/5 px-10 py-16 text-center shadow-sm">
        <h2 className="font-heading text-4xl font-bold text-charcoal text-balance">
          Take control of your health story
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base text-charcoal/55 text-pretty">
          Upload your first document in under a minute. No credit card, no setup,
          no complexity.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-sage px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sage/90 hover:shadow-md"
          >
            Create a free account
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-charcoal/55 transition-colors hover:text-charcoal"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <span className="font-heading text-lg font-bold text-charcoal">
          Cognure
        </span>
        <p className="text-xs text-charcoal/35">
          &copy; {new Date().getFullYear()} Cognure. Your health memory, privately kept.
        </p>
        <div className="flex gap-5 text-xs text-charcoal/40">
          <Link href="/login" className="hover:text-charcoal transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className="hover:text-charcoal transition-colors">
            Sign up
          </Link>
        </div>
      </div>
    </footer>
  );
}
