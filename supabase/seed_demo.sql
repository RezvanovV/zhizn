-- =====================================================================
-- Демо-данные, чтобы увидеть экраны наполненными (этап 2).
-- Запуск: Supabase → SQL Editor → вставить → Run.
--
-- Убрать демо потом одной командой:
--   delete from public.cards where model = 'demo';
--   delete from public.sources where url like '%#demo' or url like '%TESTzhizn%';
-- =====================================================================
do $$
declare
  uid uuid;
  a_food uuid; a_sport uuid; a_ai uuid; a_health uuid;
  s_mass uuid; s_shak uuid; s_proc uuid; s_push uuid; s_old uuid; s_ai uuid; s_err uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception 'Сначала создай пользователя в Authentication → Users'; end if;

  select id into a_food   from public.areas where user_id = uid and name = 'Питание';
  select id into a_sport  from public.areas where user_id = uid and name = 'Спорт';
  select id into a_health from public.areas where user_id = uid and name = 'Здоровье';
  select id into a_ai     from public.areas where user_id = uid and name = 'ИИ и обучение';

  -- ---------- Входящие ----------
  -- 1. Готово — проверь (YouTube, 5 находок)
  insert into public.sources (user_id, url, platform, title, author, duration_sec, status, progress, transcript_source, processed_at, created_at)
  values (uid, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ#demo', 'youtube', 'Как я питаюсь на массе: 5 правил и 3 рецепта', 'Демо-канал', 761, 'done', 100, 'captions', now() - interval '1 hour', now() - interval '5 hours')
  returning id into s_mass;

  insert into public.cards (user_id, source_id, area_id, type, title, summary, content, status, timecode_sec, unverified, model) values
  (uid, s_mass, a_food, 'recipe', 'Овсянка с арахисовой пастой', 'Калорийный завтрак за 5 минут',
   '{"time_min":5,"meal":"breakfast","ingredients":[{"product":"овсяные хлопья","amount":80,"unit":"г"},{"product":"молоко","amount":250,"unit":"мл"},{"product":"арахисовая паста","amount":1,"unit":"ст. л."},{"product":"банан","amount":1,"unit":"шт"}],"steps":["Залить хлопья молоком и варить 3 минуты.","Добавить пасту, перемешать.","Сверху нарезать банан."]}',
   'draft', 252, false, 'demo'),
  (uid, s_mass, a_food, 'recipe', 'Курица терияки с рисом', 'Обед на 3 дня вперёд',
   '{"time_min":30,"meal":"lunch","servings":3,"ingredients":[{"product":"куриное филе","amount":600,"unit":"г"},{"product":"рис","amount":300,"unit":"г"},{"product":"соус терияки","amount":4,"unit":"ст. л."}],"steps":["Сварить рис.","Обжарить курицу кусочками 7–8 минут.","Добавить соус, выпарить 2 минуты."]}',
   'draft', 450, false, 'demo'),
  (uid, s_mass, a_food, 'recipe', 'Творожная запеканка', 'Белковый ужин',
   '{"time_min":45,"meal":"dinner","ingredients":[{"product":"творог","amount":500,"unit":"г"},{"product":"яйцо","amount":2,"unit":"шт"},{"product":"манка","amount":2,"unit":"ст. л."}],"steps":["Смешать всё до однородности.","Выпекать 35 минут при 180°."]}',
   'draft', 605, false, 'demo'),
  (uid, s_mass, a_food, 'rule', 'Белок в каждом приёме пищи', null,
   '{"statement":"В каждом приёме пищи 25–40 г белка — так проще добрать норму на массе.","basis":"research"}',
   'draft', 130, false, 'demo'),
  (uid, s_mass, a_food, 'rule', '5 приёмов пищи в день', null,
   '{"statement":"Есть 5 раз в день небольшими порциями.","basis":"author_opinion"}',
   'draft', 348, true, 'demo');

  -- 2. Готово — проверь (Instagram, 1 рецепт)
  insert into public.sources (user_id, url, platform, title, status, progress, transcript_source, processed_at, created_at)
  values (uid, 'https://www.instagram.com/reel/DEMO1/#demo', 'instagram', 'Шакшука за 10 минут', 'done', 100, 'whisper', now() - interval '30 minutes', now() - interval '3 hours')
  returning id into s_shak;

  insert into public.cards (user_id, source_id, area_id, type, title, summary, content, status, timecode_sec, model) values
  (uid, s_shak, a_food, 'recipe', 'Шакшука за 10 минут', 'Яйца в томатном соусе с перцем',
   '{"time_min":10,"meal":"breakfast","ingredients":[{"product":"яйцо","amount":4,"unit":"шт"},{"product":"помидор","amount":3,"unit":"шт"},{"product":"болгарский перец","amount":1,"unit":"шт"},{"product":"лук","amount":1,"unit":"шт"},{"product":"паприка, зира, соль"}],"steps":["Обжарить лук и перец 3–4 минуты.","Добавить помидоры и специи, тушить 5 минут.","Сделать лунки, вбить яйца, накрыть крышкой до готовности."]}',
   'draft', 0, 'demo');

  -- 3. Обрабатывается
  insert into public.sources (user_id, url, platform, title, duration_sec, status, progress, step, created_at)
  values (uid, 'https://www.youtube.com/watch?v=DEMO2#demo', 'youtube', 'Claude Code: автоматизация с нуля', 1685, 'processing', 60, 'Текст получен, собираю карточку', now() - interval '2 hours')
  returning id into s_proc;

  -- 4. Ждёт ПК (заголовка ещё нет — его узнает обработчик)
  insert into public.sources (user_id, url, platform, status, created_at)
  values (uid, 'https://www.instagram.com/reel/DEMO3/#demo', 'instagram', 'pending', now() - interval '20 minutes')
  returning id into s_push;

  -- 5. Ошибка
  insert into public.sources (user_id, url, platform, status, error, created_at)
  values (uid, 'https://www.instagram.com/reel/DEMO4/#demo', 'instagram', 'error', 'Instagram не отдал видео: нужен вход. Попробуй позже или вставь описание вручную.', now() - interval '1 day')
  returning id into s_err;

  -- ---------- Уже в базе ----------
  insert into public.sources (user_id, url, platform, title, duration_sec, status, progress, processed_at, created_at)
  values (uid, 'https://www.youtube.com/shorts/DEMO5#demo', 'youtube_shorts', 'Отжимания: 3 ошибки в технике', 58, 'done', 100, now() - interval '22 days', now() - interval '22 days')
  returning id into s_old;

  insert into public.cards (user_id, source_id, area_id, type, title, summary, content, status, action_status, timecode_sec, model, approved_at, created_at) values
  (uid, s_old, a_sport, 'exercise', 'Отжимания с паузой', 'Пауза 2 секунды внизу — больше нагрузки на грудь',
   '{"duration_min":10,"equipment":["без инвентаря"],"muscle_group":"грудь, трицепс","sets":"4 × 8","steps":["Опуститься медленно за 3 секунды.","Задержаться внизу на 2 секунды, не касаясь пола.","Мощно выжать вверх."],"mistakes":["Проваливается поясница","Локти разведены в стороны на 90°","Неполная амплитуда"]}',
   'approved', 'want', 12, 'demo', now() - interval '22 days', now() - interval '22 days'),
  (uid, s_old, a_sport, 'exercise', 'Негативные подтягивания', 'Для тех, кто подтягивается меньше 5 раз',
   '{"duration_min":8,"equipment":["турник"],"muscle_group":"спина, бицепс","sets":"3 × 5","steps":["Запрыгнуть в верхнюю точку.","Опускаться 4–5 секунд."]}',
   'approved', 'none', 35, 'demo', now() - interval '20 days', now() - interval '20 days'),
  (uid, s_old, a_sport, 'exercise', 'Махи гирей', 'Зарядка на 10 минут',
   '{"duration_min":10,"equipment":["гиря"],"muscle_group":"ягодицы, спина","sets":"5 × 15","steps":["Ноги шире плеч, гиря между ног.","Толчок тазом, гиря до уровня груди.","Спина прямая всё время."],"mistakes":["Поднимает гирю руками","Круглая спина"]}',
   'approved', 'done', 44, 'demo', now() - interval '10 days', now() - interval '10 days');

  insert into public.cards (user_id, source_id, area_id, type, title, summary, content, status, action_status, model, approved_at, created_at) values
  (uid, s_old, a_health, 'tip', 'Свет утром', 'Выйти на улицу в первый час после пробуждения',
   '{"essence":"10 минут дневного света утром помогают проснуться и выровнять сон.","context":"Совет из того же ролика, между делом."}',
   'approved', 'none', 'demo', now() - interval '9 days', now() - interval '9 days');

  insert into public.sources (user_id, url, platform, title, duration_sec, status, progress, processed_at, created_at)
  values (uid, 'https://www.youtube.com/watch?v=DEMO6#demo', 'youtube', 'Как разбирать входящие с помощью ИИ', 912, 'done', 100, now() - interval '5 days', now() - interval '5 days')
  returning id into s_ai;

  insert into public.cards (user_id, source_id, area_id, type, title, summary, content, status, action_status, timecode_sec, model, approved_at, created_at) values
  (uid, s_ai, a_ai, 'idea', 'Разбирать входящие раз в день', 'Копить ссылки и обрабатывать пачкой',
   '{"essence":"Не смотреть сохранённое сразу, а раз в день разбирать пачкой и превращать в действия.","context":"Ровно то, что делает «Жизнь»."}',
   'approved', 'want', 301, 'demo', now() - interval '5 days', now() - interval '5 days');
end $$;
