// Все обращения к базе — в одном месте. Страницы зовут только эти функции.
import { supabase } from './supabase';
import { detectPlatform } from './format';
import type { ActionStatus, Area, CalendarEvent, Card, CardWithSource, Source, SourceWithCards } from './types';

type Res = { data: unknown; error: { message: string } | null };

async function q<T>(p: PromiseLike<Res>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

const CARD_WITH_SOURCE = '*, sources(url, platform, title, created_at)';

export const api = {
  // ---------- сферы ----------
  areas: () => q<Area[]>(supabase.from('areas').select('*').order('position').order('name')),

  area: (id: string) => q<Area>(supabase.from('areas').select('*').eq('id', id).single()),

  addArea: async (name: string, color: string) => {
    const areas = await api.areas();
    const position = Math.max(0, ...areas.map((a) => a.position)) + 1;
    return q<Area>(supabase.from('areas').insert({ name: name.trim(), color, position }).select().single());
  },

  renameArea: (id: string, name: string) => q(supabase.from('areas').update({ name: name.trim() }).eq('id', id)),

  deleteArea: (id: string) => q(supabase.from('areas').delete().eq('id', id)),

  /** Сколько подтверждённых карточек в каждой сфере */
  areaCounts: async (): Promise<Record<string, number>> => {
    const rows = await q<{ area_id: string | null }[]>(
      supabase.from('cards').select('area_id').eq('status', 'approved'),
    );
    const counts: Record<string, number> = {};
    for (const r of rows) if (r.area_id) counts[r.area_id] = (counts[r.area_id] ?? 0) + 1;
    return counts;
  },

  // ---------- источники (входящие) ----------
  sources: () =>
    q<SourceWithCards[]>(
      supabase.from('sources').select('*, cards(id, type, status)').order('created_at', { ascending: false }),
    ),

  source: (id: string) => q<Source>(supabase.from('sources').select('*').eq('id', id).single()),

  addSource: (url: string) =>
    q<Source>(supabase.from('sources').insert({ url: url.trim(), platform: detectPlatform(url) }).select().single()),

  retrySource: (id: string) =>
    q(supabase.from('sources').update({ status: 'pending', error: null, progress: 0, step: null }).eq('id', id)),

  deleteSource: (id: string) => q(supabase.from('sources').delete().eq('id', id)),

  // ---------- карточки ----------
  cardsBySource: (sourceId: string) =>
    q<Card[]>(
      supabase.from('cards').select('*').eq('source_id', sourceId).order('timecode_sec', { nullsFirst: true }),
    ),

  cardsByArea: (areaId: string) =>
    q<CardWithSource[]>(
      supabase
        .from('cards')
        .select(CARD_WITH_SOURCE)
        .eq('area_id', areaId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
    ),

  card: (id: string) => q<CardWithSource>(supabase.from('cards').select(CARD_WITH_SOURCE).eq('id', id).single()),

  /** Подтвердить отмеченные карточки в выбранную сферу, остальные — отклонить */
  reviewCards: async (approveIds: string[], rejectIds: string[], areaId: string) => {
    if (approveIds.length)
      await q(
        supabase
          .from('cards')
          .update({ status: 'approved', area_id: areaId, approved_at: new Date().toISOString() })
          .in('id', approveIds),
      );
    if (rejectIds.length) await q(supabase.from('cards').update({ status: 'rejected' }).in('id', rejectIds));
  },

  setAction: (id: string, action: ActionStatus) =>
    q(
      supabase
        .from('cards')
        .update(action === 'done' ? { action_status: action, last_done_at: new Date().toISOString() } : { action_status: action })
        .eq('id', id),
    ),

  moveCard: (id: string, areaId: string) => q(supabase.from('cards').update({ area_id: areaId }).eq('id', id)),

  removeCard: (id: string) => q(supabase.from('cards').update({ status: 'rejected' }).eq('id', id)),

  /** Поиск по тексту карточек (русская морфология) */
  search: (text: string) =>
    q<CardWithSource[]>(
      supabase
        .from('cards')
        .select(CARD_WITH_SOURCE)
        .eq('status', 'approved')
        .textSearch('search', text, { type: 'websearch', config: 'russian' })
        .limit(30),
    ),

  /** «Давно лежит»: хотел попробовать больше 2 недель назад */
  staleWant: async () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400_000).toISOString();
    const rows = await q<Card[]>(
      supabase
        .from('cards')
        .select('*')
        .eq('status', 'approved')
        .eq('action_status', 'want')
        .lt('created_at', twoWeeksAgo)
        .order('created_at')
        .limit(1),
    );
    return rows[0] ?? null;
  },

  stats: async () => {
    const cards = await q<{ source_id: string | null }[]>(
      supabase.from('cards').select('source_id').eq('status', 'approved'),
    );
    return { cards: cards.length, sources: new Set(cards.map((c) => c.source_id).filter(Boolean)).size };
  },

  // ---------- календарь ----------
  eventsBetween: (from: Date, to: Date) =>
    q<CalendarEvent[]>(
      supabase
        .from('events')
        .select('*')
        .gte('starts_at', from.toISOString())
        .lt('starts_at', to.toISOString())
        .neq('status', 'cancelled')
        .order('starts_at'),
    ),
};
