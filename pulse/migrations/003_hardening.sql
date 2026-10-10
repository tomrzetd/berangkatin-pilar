-- PILAR Pulse migration 003 · Hardening (jalankan sekali di Supabase SQL Editor)
-- Tujuan:
--  1) Admin ditentukan oleh UUID akun (allowlist), BUKAN hanya klaim email di JWT,
--     dan akun anonim tidak pernah bisa menjadi admin.
--  2) Batas ukuran semua kolom teks/jsonb yang ditulis klien (anti-spam / anti "isi penuh database").
--  3) Rate-limit per pengguna untuk event & chat.
--  4) Pengunjung tidak bisa mengganti public_id / pulse_enabled milik orang lain atau memalsukan identitas.
--  5) Retensi otomatis telemetry (90 hari) — sesuai prinsip minimisasi data UU PDP.

begin;

-- 1. Allowlist admin --------------------------------------------------------
create table if not exists public.pilar_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);
alter table public.pilar_admins enable row level security;
revoke all on public.pilar_admins from anon, authenticated;   -- hanya bisa diubah lewat SQL Editor / service role

-- Daftarkan akun developer SEKALI (akun harus sudah ada di Authentication → Users):
-- insert into public.pilar_admins(user_id,note)
--   select id,'developer utama' from auth.users
--   where lower(email)='rizalabdurrahman05@guru.smp.belajar.id' and email_confirmed_at is not null
--   on conflict do nothing;

create or replace function public.pilar_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt()->>'is_anonymous')::boolean,false) = false
     and exists (select 1 from public.pilar_admins a where a.user_id = auth.uid());
$$;
revoke all on function public.pilar_is_admin() from public;
grant execute on function public.pilar_is_admin() to authenticated;

-- 2. Batas ukuran -----------------------------------------------------------
alter table public.pilar_profiles
  drop constraint if exists pilar_profiles_len,
  add constraint pilar_profiles_len check (
    char_length(public_id) <= 24 and char_length(current_app) <= 32
    and coalesce(char_length(device_class),0) <= 24 and coalesce(char_length(browser),0) <= 24
    and coalesce(char_length(platform),0) <= 24 and coalesce(char_length(viewport),0) <= 16
    and touch_points between 0 and 1) not valid;
alter table public.pilar_sessions
  drop constraint if exists pilar_sessions_len,
  add constraint pilar_sessions_len check (char_length(current_app) <= 32 and coalesce(char_length(page_path),0) <= 200) not valid;
alter table public.pilar_events
  drop constraint if exists pilar_events_len,
  add constraint pilar_events_len check (
    char_length(app_id) <= 32 and event_name ~ '^[a-z0-9_]{1,48}$'
    and pg_column_size(details) <= 2048) not valid;

-- 3 & 4. Trigger: identitas tetap + rate limit ------------------------------
create or replace function public.pilar_guard_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.pilar_is_admin() then return new; end if;
  -- public_id selalu diturunkan dari user_id, tidak bisa dipilih pengunjung
  new.public_id := 'PILAR-' || upper(substr(replace(new.user_id::text,'-',''),1,8));
  if tg_op = 'UPDATE' then
    new.first_seen := old.first_seen;
  end if;
  return new;
end $$;
drop trigger if exists pilar_guard_profile on public.pilar_profiles;
create trigger pilar_guard_profile before insert or update on public.pilar_profiles
  for each row execute function public.pilar_guard_profile();

create or replace function public.pilar_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare n int; lim int; who uuid;
begin
  if public.pilar_is_admin() then return new; end if;
  if tg_table_name = 'pilar_events' then
    who := new.user_id; lim := 60;              -- maks 60 event / menit / pengguna
    select count(*) into n from public.pilar_events where user_id = who and created_at > now() - interval '1 minute';
  else
    who := new.visitor_id; lim := 6;            -- maks 6 pesan / menit / pengguna
    select count(*) into n from public.pilar_messages where visitor_id = who and sender='visitor' and created_at > now() - interval '1 minute';
  end if;
  if n >= lim then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  return new;
end $$;
drop trigger if exists pilar_rate_events on public.pilar_events;
create trigger pilar_rate_events before insert on public.pilar_events for each row execute function public.pilar_rate_limit();
drop trigger if exists pilar_rate_messages on public.pilar_messages;
create trigger pilar_rate_messages before insert on public.pilar_messages for each row execute function public.pilar_rate_limit();

create index if not exists pilar_events_created_idx on public.pilar_events(created_at);

-- 5. Retensi ----------------------------------------------------------------
create or replace function public.pilar_purge_old()
returns void language sql security definer set search_path = public as $$
  delete from public.pilar_events   where created_at < now() - interval '90 days';
  delete from public.pilar_sessions where last_seen  < now() - interval '90 days';
  delete from public.pilar_messages where created_at < now() - interval '180 days';
$$;
revoke all on function public.pilar_purge_old() from public, anon, authenticated;

commit;

-- Jadwalkan retensi harian (aktifkan ekstensi pg_cron di Database → Extensions dulu):
-- select cron.schedule('pilar-purge','17 3 * * *','select public.pilar_purge_old()');

-- Setelah migrasi ini: hapus pengecekan email di developer/dashboard.js boleh tetap (UX),
-- tetapi keamanan sepenuhnya ada di RLS + pilar_admins.
