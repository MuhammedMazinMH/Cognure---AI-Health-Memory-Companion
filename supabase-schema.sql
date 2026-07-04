-- Cognure database setup for Supabase.
-- Paste this whole file into the Supabase Dashboard → SQL Editor → "New query"
-- and click "Run". It creates the two tables Cognure uses, turns on Row Level
-- Security (so users only see their own data), and sets up the storage bucket.

-- ---------------------------------------------------------------------------
-- 1) documents table: one row per uploaded file.
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  content text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2) memories table: one row per remembered chunk of text.
-- ---------------------------------------------------------------------------
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  text text not null,
  cognee_id text,
  entities jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3) Row Level Security: each user can only touch their own rows.
-- ---------------------------------------------------------------------------
alter table public.documents enable row level security;
alter table public.memories enable row level security;

-- Documents policies
create policy "Users manage their own documents"
  on public.documents
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Memories policies
create policy "Users manage their own memories"
  on public.memories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3.5) cognee_fallback table: stores memories when Cognee API is unavailable.
-- ---------------------------------------------------------------------------
create table if not exists public.cognee_fallback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  text text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.cognee_fallback enable row level security;

create policy "Users manage their own fallback memories"
  on public.cognee_fallback
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Helper function to create the table if it doesn't exist (called from fallback code)
create or replace function create_cognee_fallback_table_if_not_exists()
returns void
language plpgsql
as $$
begin
  -- Table creation is already handled above, this is a no-op
  -- but allows the code to call it without error
  return;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Storage bucket for the original files.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Allow users to read/write only files inside their own folder
-- (we upload files under "<user_id>/<filename>").
create policy "Users read their own files"
  on storage.objects for select
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users upload their own files"
  on storage.objects for insert
  with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete their own files"
  on storage.objects for delete
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
