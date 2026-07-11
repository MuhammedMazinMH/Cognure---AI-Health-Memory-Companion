# Cognure

**AI-Powered Health Memory Companion**

Turn your scattered medical records into a living, intelligent memory graph. Upload a PDF or text document, and Cognure reads it, extracts key health facts, stores them in a semantic memory network, and lets you ask natural language questions grounded entirely in your own medical history.

> Your health story deserves to be remembered. Cognure helps you own it.

---

## Overview

Most people carry their health history in a pile of PDFs, printouts, and half-remembered conversations with doctors. Cognure solves this by treating every document you upload as a memory — structured, searchable, and always available through a conversational interface.

There is no hallucination, no external web search, no guessing. Every answer the AI gives is pulled directly from your own records.

---

## Features

### Memory Graph
An interactive visualization of your entire health network. Every entity extracted from your documents — medications, symptoms, diagnoses, procedures, and providers — becomes a node. Edges represent relationships. Color-coding distinguishes entity types at a glance. Low-confidence mentions appear as faint shadow nodes. Medication interaction warnings are flagged in real time with severity details.

### AI Chat
A private assistant that only answers from your memories. Ask anything in plain English — "What medications am I on?", "When did my back pain start?", "Which specialists have I seen?" — and receive answers grounded exclusively in your uploaded documents, with source citations.

### Health Timeline
A chronological journal of every health event extracted from your documents. Grouped by month, with confidence scores, document references, and symptom trend sparklines showing patterns of improvement or decline over time.

### Symptom Trends
Visual tracking of how symptoms evolve across your document history. Mini-charts show confidence over time. Each symptom is automatically classified as Worsening, Improving, or Stable based on the delta between earliest and latest mention.

### PDF Health Reports
Generate a printable, professional PDF summary of your health record on demand — current medications with interactions, known diagnoses, recent procedures, and extracted facts. Designed for bringing to a new specialist or keeping in your own records.

### Documents Hub
A centralized library of every file you have uploaded, with upload dates, extraction status, and direct access to source documents.

---

## Tech Stack

### Web Application

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS v4, shadcn/ui |
| Auth & Database | Supabase (PostgreSQL, Auth, Row Level Security) |
| File Storage | Supabase Storage (encrypted, private buckets) |
| Memory Engine | Cognee Cloud REST API |
| AI / LLM | Groq API — `llama-3.3-70b-versatile` |
| Graph Visualization | React Flow with custom node styling |
| PDF Parsing | pdfjs-dist (client-side, no server parsing) |
| Charts | Recharts (sparklines, trend visualization) |
| Icons | lucide-react |
| Deployment | Vercel |

### Mobile Application (In Progress)

| Layer | Technology |
| --- | --- |
| Framework | Expo SDK 57 (React Native 0.86, TypeScript) |
| Navigation | Expo Router (file-based, tab + stack) |
| Auth & Database | Supabase (same backend as web) |
| Gestures | react-native-gesture-handler + react-native-reanimated |
| Graph Visualization | react-native-svg (pan / pinch gesture navigation) |
| PDF Export | expo-print + expo-sharing |
| Fonts | Playfair Display + Inter via @expo-google-fonts |
| Icons | lucide-react-native |

---

## Privacy and Security

- **Row Level Security** — Supabase RLS policies ensure users can only ever read their own data, enforced at the database level.
- **Encrypted storage** — All uploaded documents are stored in private, encrypted Supabase buckets.
- **No training data** — Your health records are never used to train models or improve any third-party product.
- **Client-side PDF extraction** — PDF text is extracted in the browser using pdfjs-dist. The raw file never touches the server.
- **Open source** — Full code transparency. Self-host it if you prefer.

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- A Supabase project (the free tier is sufficient)
- A Groq API key — [groq.com](https://groq.com)
- Cognee Cloud API credentials — [cognee.io](https://cognee.io)

### 1. Clone and install

```bash
git clone https://github.com/MuhammedMazinMH/Cognure---AI-Health-Memory-Companion.git
cd Cognure---AI-Health-Memory-Companion
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```env
# Supabase — safe to expose in the browser
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Groq — server-only secret
GROQ_API_KEY=gsk_...

# Cognee — server-only secret
COGNEE_API_KEY=...
COGNEE_BASE_URL=https://api.cognee.io/v1
```

### 3. Initialize the database

1. Open your Supabase Dashboard and go to the SQL Editor.
2. Copy the contents of `supabase-schema.sql` from this repository.
3. Paste and run it. This creates the `documents`, `memories`, and `medication_interactions` tables, the `documents` storage bucket, and all RLS policies.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How It Works

**Upload** — The user selects a PDF or text file. pdfjs-dist extracts the raw text on the client. The file is stored in Supabase Storage and its metadata written to the `documents` table.

**Remember** — The extracted text is sent to `/api/remember`. Cognee ingests it into the semantic memory network. Groq parses it for structured health entities — medications, symptoms, diagnoses, procedures, providers — with confidence scores. Results are saved to the `memories` table. Any medication interactions are detected and logged.

**Ask** — The user sends a question to `/api/ask`. Cognee recalls relevant memories. Groq generates an answer grounded only in the retrieved context. If Cognee returns nothing, the system falls back to keyword search over the `memories` table.

**Explore** — The Timeline, Graph, Trends, and Report pages query the same `memories` table and present the data in different visual formats.

---

## Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── (auth)/                  # Login and signup pages
│   │   ├── dashboard/               # Protected app shell
│   │   │   ├── layout.tsx           # Sidebar and header
│   │   │   ├── page.tsx             # Memory graph
│   │   │   ├── chat/page.tsx        # AI chat
│   │   │   ├── timeline/page.tsx    # Chronological journal
│   │   │   ├── documents/page.tsx   # File library
│   │   │   ├── report/page.tsx      # PDF report generator
│   │   │   └── settings/page.tsx    # Profile and preferences
│   │   └── api/
│   │       ├── upload/route.ts      # File upload and storage
│   │       ├── remember/route.ts    # Cognee ingestion and entity extraction
│   │       ├── ask/route.ts         # Chat with memory recall
│   │       ├── interactions/route.ts
│   │       └── memories/route.ts
│   ├── components/
│   │   ├── memory-graph.tsx
│   │   ├── health-timeline.tsx
│   │   ├── symptom-trends.tsx
│   │   ├── upload-modal.tsx
│   │   └── ui/                      # shadcn/ui components
│   ├── lib/
│   │   ├── supabase-client.ts
│   │   ├── cognee-client.ts
│   │   ├── groq-client.ts
│   │   └── utils.ts
│   └── types/index.ts
│
└── mobile/                          # Expo mobile application (in progress)
    ├── app/
    │   ├── _layout.tsx              # Root layout, font loading, session provider
    │   ├── (auth)/                  # Login and signup screens
    │   └── (tabs)/                  # Tab navigator
    │       ├── index.tsx            # Memory graph
    │       ├── chat.tsx             # AI chat
    │       ├── timeline.tsx         # Health timeline
    │       ├── documents.tsx        # Documents hub
    │       └── report.tsx           # PDF report
    ├── components/
    ├── lib/
    │   ├── api.ts                   # Typed REST client for the web API
    │   ├── supabase.ts
    │   ├── session.tsx
    │   └── theme.ts
    └── app.json
```

---

## Deployment

### Vercel (recommended)

1. Push the repository to GitHub.
2. Import the project on [vercel.com](https://vercel.com).
3. Add the four environment variables in the Vercel project settings.
4. Deploy. Every push to `main` redeploys automatically.

### Self-hosted

```bash
npm run build
npm start
```

Or with Docker:

```bash
docker build -t cognure .
docker run -p 3000:3000 --env-file .env.local cognure
```

---

## Mobile Application

A native mobile application for iOS and Android is currently in active development using Expo SDK 57 and React Native. It connects to the same Supabase backend and REST API as the web application, giving full feature parity across platforms.

The mobile app includes all five core screens — Memory Graph, Chat, Timeline, Documents, and Report — built with native gestures, haptic feedback, and an interface that follows platform conventions on both iOS and Android.

It has not yet been released. A public beta is planned once the Expo EAS build pipeline and App Store / Play Store submission are complete.

If you would like to run it locally in the meantime:

```bash
cd mobile
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_API_URL
npm install
npx expo start
```

Scan the QR code with the Expo Go app on your device.

---

## Roadmap

- Mobile app public beta (iOS and Android)
- Multi-user sharing — share records with family members or caregivers with read-only access
- Voice input — dictate health updates hands-free
- EHR integration — direct import from hospital and clinic systems
- Wearable sync — automatic ingestion from Apple Health and Google Fit
- FHIR export — standard healthcare data format for interoperability
- Advanced analytics — predictive health insights based on long-term trends

---

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-idea`
3. Commit your changes with a clear message.
4. Open a pull request against `main`.

Please keep pull requests focused. One feature or fix per PR.

---

## License

MIT License. Free to use, modify, and distribute.

---

## Acknowledgments

Cognure is built on the shoulders of excellent open-source and cloud projects:

- [Cognee](https://cognee.io) — semantic memory infrastructure
- [Groq](https://groq.com) — fast LLM inference
- [Supabase](https://supabase.com) — open-source database and auth
- [Expo](https://expo.dev) — React Native toolchain
- [Vercel](https://vercel.com) — deployment and edge infrastructure
- The React, Next.js, and React Native communities
