-- Divine Dialogue Plus: one Stripe subscription per account, kept in sync by the
-- Stripe webhook. Only the server (secret key) can reach it: RLS on, no policies.

create table public.subscriptions (
  account_id text primary key references public.accounts (id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  -- Stripe's status: active, trialing, past_due, canceled, incomplete, unpaid, ...
  status text not null default 'none',
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Adds a 30-day count of voice replies, for Plus members' monthly voice allowance.
drop function public.usage_summary(text, text);

create function public.usage_summary(p_visitor_id text, p_ip_hash text)
returns table (
  visitor_chat int,
  visitor_voice int,
  visitor_compare int,
  visitor_read int,
  visitor_last_minute int,
  visitor_cost numeric,
  ip_questions int,
  ip_visitors int,
  total_cost numeric,
  visitor_voice_month int
)
language sql stable
set search_path = public
as $$
  with day as (
    select
      count(*) filter (where visitor_id = p_visitor_id and kind = 'chat')::int as visitor_chat,
      count(*) filter (where visitor_id = p_visitor_id and kind = 'voice')::int as visitor_voice,
      count(*) filter (where visitor_id = p_visitor_id and kind = 'compare')::int as visitor_compare,
      count(*) filter (where visitor_id = p_visitor_id and kind = 'read')::int as visitor_read,
      count(*) filter (where visitor_id = p_visitor_id and kind in ('chat', 'voice', 'compare', 'read')
                       and created_at > now() - interval '1 minute')::int as visitor_last_minute,
      coalesce(sum(cost_usd) filter (where visitor_id = p_visitor_id), 0) as visitor_cost,
      count(*) filter (where ip_hash = p_ip_hash and kind in ('chat', 'voice', 'compare', 'read'))::int as ip_questions,
      count(*) filter (where ip_hash = p_ip_hash and kind = 'visitor')::int as ip_visitors,
      coalesce(sum(cost_usd), 0) as total_cost
    from public.usage_events
    where created_at > now() - interval '1 day'
  )
  select day.*,
    (select count(*)::int from public.usage_events
     where visitor_id = p_visitor_id and kind = 'voice' and created_at > now() - interval '30 days')
  from day;
$$;

revoke execute on function public.usage_summary from public, anon, authenticated;
