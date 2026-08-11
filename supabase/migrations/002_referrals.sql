-- Referral links + lottery tickets.
-- A referrer's referral_code is just their netid (the part of their wisc.edu
-- email before the @), which is already unique since email is unique and the
-- domain is fixed. When a new user signs up through /register?ref=<netid>
-- and later confirms their wisc.edu email, the referrer is credited with a
-- referral row whose auto-incrementing lottery_number is their ticket. The
-- actual prize draw is out of scope here — this only records the tickets.

alter table public.profiles
  add column if not exists referral_code text generated always as (split_part(email::text, '@', 1)) stored;

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  lottery_number bigint generated always as identity,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referral_code text not null,
  created_at timestamptz not null default now(),
  constraint referrals_no_self_referral check (referrer_id <> referred_user_id)
);

create index if not exists referrals_referrer_created_idx
  on public.referrals (referrer_id, created_at desc);

create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ref_code text;
  referrer_id uuid;
begin
  ref_code := nullif(lower(trim(new.raw_user_meta_data->>'referral_code')), '');
  if ref_code is null then
    return new;
  end if;

  select id into referrer_id from public.profiles where referral_code = ref_code;
  if referrer_id is null or referrer_id = new.id then
    return new;
  end if;

  insert into public.referrals (referrer_id, referred_user_id, referral_code)
  values (referrer_id, new.id, ref_code)
  on conflict (referred_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
after update on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.handle_user_confirmed();

alter table public.referrals enable row level security;

drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own"
on public.referrals for select
to authenticated
using (auth.uid() = referrer_id);
