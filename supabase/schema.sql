-- ElearnMath – skema Supabase. Jalankan di: Supabase > SQL Editor > New query > Run

create table if not exists public.app_state (
  key         text primary key,                 -- nama bagian data: users, classes, submissions, ...
  data        jsonb,
  updated_at  timestamptz not null default now()
);

-- updated_at selalu diisi server (dipakai untuk sinkron antar pengguna)
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_app_state_updated on public.app_state;
create trigger trg_app_state_updated
  before insert or update on public.app_state
  for each row execute function public.set_updated_at();

create index if not exists app_state_updated_idx on public.app_state (updated_at);

-- Row Level Security
alter table public.app_state enable row level security;

drop policy if exists "anon_select" on public.app_state;
drop policy if exists "anon_insert" on public.app_state;
drop policy if exists "anon_update" on public.app_state;

-- PERINGATAN: aplikasi ini login-nya buatan sendiri (bukan Supabase Auth),
-- jadi anon key harus boleh baca/tulis. Cukup untuk prototipe/tugas kuliah,
-- BELUM aman untuk data sungguhan (lihat README bagian Keamanan).
create policy "anon_select" on public.app_state for select to anon using (true);
create policy "anon_insert" on public.app_state for insert to anon with check (true);
create policy "anon_update" on public.app_state for update to anon using (true) with check (true);
