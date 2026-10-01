create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant all on public.analytics_events to service_role;

alter table public.analytics_events enable row level security;

create index analytics_events_event_created_idx on public.analytics_events (event, created_at desc);