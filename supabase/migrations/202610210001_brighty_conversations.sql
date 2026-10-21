create table if not exists brighty_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  messages jsonb not null default '[]'::jsonb,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists brighty_conversations_expires_at_idx on brighty_conversations (expires_at);
alter table brighty_conversations enable row level security;
