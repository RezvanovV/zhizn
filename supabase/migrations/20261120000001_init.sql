-- =====================================================================
-- «Жизнь» — начальная схема базы (этап 1)
-- Запуск: Supabase → SQL Editor → вставить целиком → Run.
-- Повторно запускать не нужно.
-- =====================================================================

-- ---------- Общая функция: автоматически обновлять updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Сферы (Питание, Спорт, ...) ----------
create table public.areas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null,
  color       text not null default '#E3F1EA',     -- фон плашки из макета
  position    int  not null default 0,             -- порядок на экране
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------- Источники: присланные ссылки ----------
create table public.sources (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users on delete cascade,
  url                text not null,
  platform           text not null default 'other'
                     check (platform in ('youtube','youtube_shorts','instagram','other')),
  title              text,
  author             text,
  duration_sec       int,
  thumbnail_url      text,
  transcript         text,                          -- полный текст видео («сырьё»)
  transcript_source  text check (transcript_source in ('captions','whisper','description')),
  status             text not null default 'pending'
                     check (status in ('pending','processing','done','error')),
  progress           int  not null default 0 check (progress between 0 and 100),
  step               text,                          -- «Текст получен, собираю карточку»
  error              text,
  created_at         timestamptz not null default now(),
  processed_at       timestamptz,
  updated_at         timestamptz not null default now()
);
create index sources_user_status_idx on public.sources (user_id, status, created_at desc);
create trigger sources_updated_at before update on public.sources
  for each row execute function public.set_updated_at();

-- ---------- Карточки знаний ----------
create table public.cards (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  source_id      uuid references public.sources on delete set null,
  area_id        uuid references public.areas on delete set null,
  type           text not null check (type in ('recipe','exercise','rule','idea','tip')),
  title          text not null,
  summary        text,                              -- одна-две фразы сути
  content        jsonb not null default '{}'::jsonb, -- содержимое по схеме типа (см. docs/ARCHITECTURE.md)
  status         text not null default 'draft'
                 check (status in ('draft','approved','rejected')),
  action_status  text not null default 'none'
                 check (action_status in ('none','want','done')), -- «хочу попробовать» / «сделал»
  unverified     boolean not null default false,    -- «мнение автора, не проверено»
  timecode_sec   int,                               -- где в видео это сказано
  model          text,                              -- какая нейросеть сделала карточку
  approved_at    timestamptz,
  last_done_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- для поиска по тексту (русская морфология: «рецепт» найдёт «рецепты»)
  search         tsvector generated always as (
                   to_tsvector('russian'::regconfig,
                     coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || content::text)
                 ) stored
);
create index cards_user_area_idx   on public.cards (user_id, area_id, status);
create index cards_user_status_idx on public.cards (user_id, status, created_at desc);
create index cards_source_idx      on public.cards (source_id);
create index cards_search_idx      on public.cards using gin (search);
create trigger cards_updated_at before update on public.cards
  for each row execute function public.set_updated_at();

-- ---------- Связи между чем угодно (блок «Связано» на карточке) ----------
create table public.relations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  from_type   text not null,   -- 'card', 'event', ...
  from_id     uuid not null,
  to_type     text not null,
  to_id       uuid not null,
  kind        text not null default 'related',
  created_at  timestamptz not null default now()
);
create index relations_from_idx on public.relations (user_id, from_type, from_id);
create index relations_to_idx   on public.relations (user_id, to_type, to_id);

-- ---------- События: «Запланировать» и календарь ----------
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  card_id      uuid references public.cards on delete set null,
  title        text not null,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  destination  text not null default 'app'
               check (destination in ('app','reminders','google')),
  status       text not null default 'planned'
               check (status in ('planned','done','cancelled')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index events_user_time_idx on public.events (user_id, starts_at);
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- ---------- Мой холодильник (для утреннего помощника) ----------
create table public.pantry (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  product     text not null,
  in_stock    boolean not null default true,
  updated_at  timestamptz not null default now(),
  unique (user_id, product)
);
create trigger pantry_updated_at before update on public.pantry
  for each row execute function public.set_updated_at();

-- ---------- Профиль: цель и настройки ----------
create table public.profiles (
  user_id     uuid primary key default auth.uid() references auth.users on delete cascade,
  goal        text,                              -- например «набор массы»
  settings    jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Защита (RLS): каждая строка видна и меняется только её владельцем
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['areas','sources','cards','relations','events','pantry','profiles'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "владелец" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
    -- Открываем таблицу для приложения (вошедший пользователь) и обработчика (service_role).
    -- Анонимам (anon) доступа нет вообще.
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

-- =====================================================================
-- Стартовые данные: при создании пользователя — 6 сфер и профиль
-- =====================================================================
create or replace function public.seed_user(uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.areas (user_id, name, color, position) values
    (uid, 'Питание',       '#E3F1EA', 1),
    (uid, 'Спорт',         '#E6EEFF', 2),
    (uid, 'Здоровье',      '#FCE4E4', 3),
    (uid, 'Бизнес',        '#FCEBDD', 4),
    (uid, 'ИИ и обучение', '#EEE6FB', 5),
    (uid, 'Идеи',          '#F5F0D8', 6)
  on conflict (user_id, name) do nothing;

  insert into public.profiles (user_id, goal) values (uid, 'набор массы')
  on conflict (user_id) do nothing;
end;
$$;
revoke all on function public.seed_user(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_user(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Если пользователь уже был создан до этого скрипта — засеять и его
select public.seed_user(id) from auth.users;
