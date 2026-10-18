create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''), 'Creator'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''), '')
  );
  return new;
end;
$$;
create trigger auth_user_profile_created after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 3000),
  identity text not null default '' check (char_length(identity) <= 3000),
  "references" text not null default '' check (char_length("references") <= 3000),
  created_at timestamptz not null default now(),
  unique (owner_id, id)
);

create table public.social_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid,
  platform text not null check (platform in ('Instagram','TikTok','Facebook','LinkedIn','YouTube','Pinterest','Altro')),
  handle text not null check (char_length(handle) between 1 and 120),
  url text not null default '' check (char_length(url) <= 2048 and (url = '' or url ~* '^https?://')),
  created_at timestamptz not null default now(),
  unique (owner_id, id),
  unique (owner_id, id, brand_id),
  foreign key (owner_id, brand_id) references public.brands(owner_id, id) on delete set null (brand_id)
);

create table public.contents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid,
  social_profile_id uuid,
  title text not null check (char_length(title) between 1 and 200),
  platform text not null check (platform in ('Instagram','TikTok','Facebook','LinkedIn','YouTube','Pinterest','Altro')),
  format text not null check (format in ('Reel','Post','Carousel','Story','Video','Articolo','Altro')),
  pillar text not null default '' check (char_length(pillar) <= 120),
  status text not null default 'idea' check (status in ('idea','draft','ready','published')),
  scheduled_at timestamptz,
  script text not null default '' check (char_length(script) <= 30000),
  notes text not null default '' check (char_length(notes) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (owner_id, brand_id) references public.brands(owner_id, id) on delete set null (brand_id),
  foreign key (owner_id, social_profile_id, brand_id) references public.social_profiles(owner_id, id, brand_id) on delete set null (social_profile_id)
);

create index brands_owner_id_idx on public.brands(owner_id);
create index social_profiles_owner_id_idx on public.social_profiles(owner_id);
create index social_profiles_brand_idx on public.social_profiles(owner_id, brand_id);
create index contents_owner_schedule_idx on public.contents(owner_id, scheduled_at);
create index contents_owner_status_idx on public.contents(owner_id, status);
create index contents_owner_brand_idx on public.contents(owner_id, brand_id);

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.social_profiles enable row level security;
alter table public.contents enable row level security;

create policy "profile_select_own" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profile_insert_own" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "profile_update_own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profile_delete_own" on public.profiles for delete to authenticated using (id = (select auth.uid()));

create policy "brands_select_own" on public.brands for select to authenticated using (owner_id = (select auth.uid()));
create policy "brands_insert_own" on public.brands for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "brands_update_own" on public.brands for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "brands_delete_own" on public.brands for delete to authenticated using (owner_id = (select auth.uid()));

create policy "social_profiles_select_own" on public.social_profiles for select to authenticated using (owner_id = (select auth.uid()));
create policy "social_profiles_insert_own" on public.social_profiles for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "social_profiles_update_own" on public.social_profiles for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "social_profiles_delete_own" on public.social_profiles for delete to authenticated using (owner_id = (select auth.uid()));

create policy "contents_select_own" on public.contents for select to authenticated using (owner_id = (select auth.uid()));
create policy "contents_insert_own" on public.contents for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "contents_update_own" on public.contents for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "contents_delete_own" on public.contents for delete to authenticated using (owner_id = (select auth.uid()));

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;
create trigger contents_updated_at before update on public.contents
for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
