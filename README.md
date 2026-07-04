# Cognure — Your Health Memory AI

Cognure turns your scattered medical documents into a **living memory graph** you
can talk to. Upload a PDF or text file, and Cognure reads it, extracts the
important health facts (medications, symptoms, diagnoses, procedures, providers),
stores them as long-term memory, and lets you ask questions in plain language.

Built for a hackathon — beginner-friendly, fully commented code, no placeholders.

## ✨ Features

- **Memory Graph** — an interactive React Flow graph of your health, color-coded
  by entity type. Low-confidence symptoms appear as faint "shadow" nodes.
- **Chat** — ask questions and get answers grounded **only** in your own memories.
- **Timeline** — a chronological journal of everything Cognure has remembered.
- **Documents** — every file you have uploaded, in one place.
- **Settings** — manage your profile and sign out.
- **Remember / Recall / Improve / Forget** — full memory lifecycle powered by
  the Cognee Cloud API.

## 🧱 Tech Stack

| Layer        | Technology                                             |
| ------------ | ------------------------------------------------------ |
| Framework    | Next.js 16 (App Router, TypeScript)                    |
| Styling      | Tailwind CSS v4 + shadcn/ui                            |
| Auth & Data  | Supabase (Auth, Postgres, Storage)                     |
| Memory       | Cognee Cloud REST API                                  |
| AI           | Groq API (`llama-3.3-70b-versatile`)                   |
| Graph        | React Flow                                             |
| PDF parsing  | pdf-parse                                              |
| Animation    | framer-motion                                          |
| Icons        | lucide-react                                           |

> Note: `create-next-app@latest` installed **Next.js 16** (newer than the
> Next.js 14 originally requested). The code uses the current App Router APIs.

## 🔐 Environment Variables

Create a `.env.local` file in the project root (a template is already included):

| Variable                        | Sent to browser? | What it is                                  |
| ------------------------------- | ---------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅ Yes           | Your Supabase project URL                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes           | Supabase public anon key                    |
| `GROQ_API_KEY`                  | ❌ No (secret)   | Your Groq API key                           |
| `COGNEE_API_KEY`                | ❌ No (secret)   | Your Cognee Cloud API key                   |
| `COGNEE_BASE_URL`               | ❌ No (secret)   | Base URL of your Cognee Cloud API           |

Anything starting with `NEXT_PUBLIC_` is exposed to the browser. The Groq and
Cognee keys have **no prefix** so they stay server-only.

## 🚀 Setup

1. **Install dependencies** (already done if you scaffolded the project):

   ```bash
   npm install
   ```

2. **Fill in `.env.local`** with your real keys (see the table above).

3. **Set up the database.** Open the Supabase Dashboard → **SQL Editor**, paste
   the contents of [`supabase-schema.sql`](./supabase-schema.sql), and run it.
   This creates the `documents` and `memories` tables, enables Row Level
   Security, and creates the private `documents` storage bucket.

4. **Run the dev server:**

   ```bash
   npm run dev
   ```

   Then open <http://localhost:3000>.

## 🗺️ How it works

1. **Upload** a PDF/TXT → `/api/upload` extracts the text (pdf-parse), stores the
   file in Supabase Storage, and saves a row in `documents`.
2. **Remember** → `/api/remember` sends the text to Cognee (`cogneeRemember`),
   extracts entities with Groq, and saves a row in `memories`.
3. **Ask** → `/api/ask` recalls relevant context from Cognee (`cogneeRecall`) and
   asks Groq to answer using only that context.
4. **Improve / Forget** → `/api/improve` and `/api/forget` refine or delete a
   memory in both Cognee and Supabase.

## ⚠️ Adjusting the Cognee endpoints

The Cognee REST paths in [`src/lib/cognee-client.ts`](./src/lib/cognee-client.ts)
(`/add`, `/cognify`, `/remember`, `/recall`, `/improve`, `/forget`) are sensible
placeholders. Search the file for the comment:

```
>>> ADJUST THESE PATHS TO MATCH COGNEE'S ACTUAL API DOCS <<<
```

and line them up with your Cognee Cloud documentation.

## 📁 Project structure

```
src/
  app/
    (auth)/login, (auth)/signup    Auth screens
    dashboard/                     App shell + pages (graph, chat, timeline, …)
    api/                           Server routes (upload, remember, ask, improve, forget)
  components/                      Sidebar, header, upload modal, chat, graph, ui/
  lib/                             Supabase, Groq, and Cognee clients
  types/                           Shared TypeScript interfaces
```

Made with care for people who want to remember their health story.
