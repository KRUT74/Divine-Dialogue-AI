-- Usage log behind Divine Dialogue's free daily limits and spending ceiling.
-- One row per billable action, with its estimated cost in US dollars.
--   visitor  a new anonymous visitor cookie was issued (no cost)
--   chat     a typed reply from a guide          voice   a spoken reply from a guide
--   compare  one "Ask all six traditions"        read    one passage explanation
--   blessing a daily blessing was written (shared by everyone, so no visitor)
--   listen   a block of speech-to-text minutes   speak   text-to-speech for part of a reply
-- ip_hash is a keyed hash of the visitor's IP address, never the address itself.

create table public.usage_events (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('visitor', 'chat', 'voice', 'compare', 'read', 'blessing', 'listen', 'speak')),
  visitor_id text,
  ip_hash text,
  cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index usage_events_created_idx on public.usage_events (created_at);
create index usage_events_visitor_idx on public.usage_events (visitor_id, created_at);
create index usage_events_ip_idx on public.usage_events (ip_hash, created_at);

-- No policies: only the server, with the secret key, can read or write.
alter table public.usage_events enable row level security;

-- Everything a limit check needs, in one round trip. Counts cover the last 24 hours.
create or replace function public.usage_summary(p_visitor_id text, p_ip_hash text)
returns table (
  visitor_chat int,
  visitor_voice int,
  visitor_compare int,
  visitor_read int,
  visitor_last_minute int,
  visitor_cost numeric,
  ip_questions int,
  ip_visitors int,
  total_cost numeric
)
language sql stable
set search_path = public
as $$
  select
    count(*) filter (where visitor_id = p_visitor_id and kind = 'chat')::int,
    count(*) filter (where visitor_id = p_visitor_id and kind = 'voice')::int,
    count(*) filter (where visitor_id = p_visitor_id and kind = 'compare')::int,
    count(*) filter (where visitor_id = p_visitor_id and kind = 'read')::int,
    count(*) filter (where visitor_id = p_visitor_id and kind in ('chat', 'voice', 'compare', 'read')
                     and created_at > now() - interval '1 minute')::int,
    coalesce(sum(cost_usd) filter (where visitor_id = p_visitor_id), 0),
    count(*) filter (where ip_hash = p_ip_hash and kind in ('chat', 'voice', 'compare', 'read'))::int,
    count(*) filter (where ip_hash = p_ip_hash and kind = 'visitor')::int,
    coalesce(sum(cost_usd), 0)
  from public.usage_events
  where created_at > now() - interval '1 day';
$$;

revoke execute on function public.usage_summary from public, anon, authenticated;
