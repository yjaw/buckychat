-- MadFriends Supabase schema and signup policy.
-- Run this in Supabase, then configure Authentication > Hooks >
-- Before User Created to call public.madfriends_before_user_created.

create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  status text not null default 'active' check (status in ('active', 'banned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  room_id text,
  reason text not null,
  details text,
  created_at timestamptz not null default now()
);

create index if not exists reports_reporter_created_idx
  on public.reports (reporter_id, created_at desc);

create index if not exists reports_reported_created_idx
  on public.reports (reported_user_id, created_at desc);

create table if not exists public.bans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  banned_by uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  alter column email type citext using lower(email)::citext;

alter table public.profiles
  drop column if exists banned_at,
  drop column if exists banned_reason;

create index if not exists bans_user_created_idx
  on public.bans (user_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.madfriends_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  email text;
  parts text[];
  domain text;
begin
  email := lower(trim(coalesce(event->'user'->>'email', '')));
  parts := string_to_array(email, '@');
  domain := case when array_length(parts, 1) = 2 then parts[2] else '' end;

  if parts[1] <> '' and domain = 'wisc.edu' then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Only wisc.edu email addresses can sign up.'
    )
  );
end;
$$;

grant execute on function public.madfriends_before_user_created(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
revoke execute on function public.madfriends_before_user_created(jsonb) from authenticated, anon, public;

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.bans enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
on public.reports for insert
to authenticated
with check (auth.uid() = reporter_id);
