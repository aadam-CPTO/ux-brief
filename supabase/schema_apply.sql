-- ─────────────────────────────────────────────────────────────────────────────
-- UX Brief · Supabase schema (IDEMPOTENT)
-- Safe to re-run: skips objects that already exist, creates only what's missing.
-- Generated from schema.sql after a partial apply left some tables in place.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists sessions (
  id                        uuid primary key default gen_random_uuid(),
  project_name              text not null,
  created_by                text not null,
  status                    text not null default 'collecting'
                              check (status in ('collecting','ready_to_diff','diffed','exported_to_figma')),
  min_respondents_for_diff  int  not null default 2,
  figma_file_key            text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create table if not exists respondents (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references sessions(id) on delete cascade,
  name          text not null,
  role          text not null,
  layer         text not null,
  answers       jsonb not null default '{}',
  submitted_at  timestamptz not null default now()
);

create table if not exists concepts (
  id              uuid primary key default gen_random_uuid(),
  respondent_id   uuid not null unique references respondents(id) on delete cascade,
  session_id      uuid not null references sessions(id) on delete cascade,
  concept_json    jsonb not null,
  raw_text        text not null,
  figma_node_id   text,
  generated_at    timestamptz not null default now()
);

create table if not exists diffs (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references sessions(id) on delete cascade,
  items         jsonb not null default '[]',
  raw_text      text not null,
  generated_at  timestamptz not null default now()
);

create table if not exists invite_tokens (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  email       text not null,
  token       text not null unique default encode(gen_random_bytes(32), 'hex'),
  used        boolean not null default false,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create unique index if not exists diffs_session_id_idx     on diffs(session_id);
create index        if not exists respondents_session_id_idx on respondents(session_id);
create index        if not exists concepts_session_id_idx    on concepts(session_id);
create index        if not exists invite_tokens_token_idx    on invite_tokens(token);
create index        if not exists invite_tokens_session_idx  on invite_tokens(session_id);

-- ─── updated_at trigger ──────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger language plpgsql
set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sessions_updated_at on sessions;
create trigger sessions_updated_at
  before update on sessions
  for each row execute function update_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table sessions       enable row level security;
alter table respondents    enable row level security;
alter table concepts       enable row level security;
alter table diffs          enable row level security;
alter table invite_tokens  enable row level security;

drop policy if exists "token holders can read session" on sessions;
create policy "token holders can read session"
  on sessions for select
  using (
    exists (
      select 1 from invite_tokens
      where invite_tokens.session_id = sessions.id
        and invite_tokens.token = current_setting('request.jwt.claims', true)::json->>'token'
        and invite_tokens.expires_at > now()
    )
  );

drop policy if exists "token holders can insert respondent" on respondents;
create policy "token holders can insert respondent"
  on respondents for insert
  with check (
    exists (
      select 1 from invite_tokens
      where invite_tokens.session_id = respondents.session_id
        and invite_tokens.token = current_setting('request.jwt.claims', true)::json->>'token'
        and invite_tokens.used = false
        and invite_tokens.expires_at > now()
    )
  );

drop policy if exists "token holders can read diff" on diffs;
create policy "token holders can read diff"
  on diffs for select
  using (
    exists (
      select 1 from invite_tokens
      where invite_tokens.session_id = diffs.session_id
        and invite_tokens.token = current_setting('request.jwt.claims', true)::json->>'token'
        and invite_tokens.expires_at > now()
    )
  );
