-- =====================================================================
-- Этап 3: приём ссылок с iPhone («Поделиться → Жизнь»)
--
-- Команда iOS шлёт POST на  <SUPABASE_URL>/rest/v1/rpc/add_link
--   заголовок: apikey: <publishable key>
--   тело JSON: {"p_token": "<ADD_LINK_TOKEN>", "p_url": "<ссылка или текст со ссылкой>"}
--
-- Секретный пароль хранится только в виде хэша SHA-256 в private.settings
-- (схема private не видна через API). Сам хэш и владельца задаёт отдельный
-- запрос, который в git не попадает.
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.settings (
  key   text primary key,
  value text not null
);
-- Второй замок: политик нет, значит клиентам доступа нет; функция add_link
-- работает от имени владельца таблицы и RLS не затрагивается.
alter table private.settings enable row level security;

create or replace function public.add_link(p_token text, p_url text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash     text;
  v_owner    uuid;
  v_url      text;
  v_platform text;
  v_vid      text;
  v_id       uuid;
begin
  -- 1. Проверка пароля
  select value into v_hash from private.settings where key = 'add_link_token_sha256';
  if v_hash is null or p_token is null
     or encode(sha256(convert_to(p_token, 'UTF8')), 'hex') <> v_hash then
    raise exception 'Неверный токен' using errcode = '28000';
  end if;

  select value::uuid into v_owner from private.settings where key = 'owner_id';
  if v_owner is null then
    raise exception 'Не задан владелец (owner_id)';
  end if;

  -- 2. Достаём первую ссылку из присланного текста
  v_url := substring(coalesce(p_url, '') from 'https?://[^\s<>"]+');
  if v_url is null then
    raise exception 'В присланном тексте нет ссылки' using errcode = '22023';
  end if;

  -- 3. Платформа
  v_platform := case
    when v_url ~* 'youtube\.com/shorts/'      then 'youtube_shorts'
    when v_url ~* '(youtube\.com|youtu\.be)/' then 'youtube'
    when v_url ~* 'instagram\.com/'           then 'instagram'
    else 'other'
  end;

  -- 4. Чистим ссылку от меток слежения (?igsh=, ?si=, ...)
  if v_platform = 'instagram' or v_url ~* '(youtu\.be/|youtube\.com/shorts/)' then
    v_url := split_part(v_url, '?', 1);
  elsif v_url ~* 'youtube\.com/watch' then
    v_vid := substring(v_url from '[?&]v=([A-Za-z0-9_-]+)');
    if v_vid is not null then
      v_url := 'https://www.youtube.com/watch?v=' || v_vid;
    end if;
  end if;

  -- 5. Дубли: если такая ссылка уже есть — не добавляем второй раз
  select id into v_id from public.sources where user_id = v_owner and url = v_url limit 1;
  if v_id is not null then
    return json_build_object('ok', true, 'duplicate', true, 'id', v_id, 'platform', v_platform);
  end if;

  insert into public.sources (user_id, url, platform)
  values (v_owner, v_url, v_platform)
  returning id into v_id;

  return json_build_object('ok', true, 'duplicate', false, 'id', v_id, 'platform', v_platform);
end;
$$;

revoke all on function public.add_link(text, text) from public;
grant execute on function public.add_link(text, text) to anon, authenticated;
