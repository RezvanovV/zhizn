import type { ActionStatus, CardType, Ingredient, Platform } from './types';

export const platformLabel: Record<Platform, string> = {
  youtube: 'YouTube',
  youtube_shorts: 'YouTube · шортс',
  instagram: 'Instagram · рилс',
  other: 'Ссылка',
};

export const platformColor: Record<Platform, string> = {
  youtube: '#B42318',
  youtube_shorts: '#B42318',
  instagram: '#9B2C8F',
  other: '#3F4550',
};

export function detectPlatform(url: string): Platform {
  const u = url.toLowerCase();
  if (/youtube\.com\/shorts\//.test(u)) return 'youtube_shorts';
  if (/(youtube\.com|youtu\.be)/.test(u)) return 'youtube';
  if (/instagram\.com/.test(u)) return 'instagram';
  return 'other';
}

export function isUrl(text: string): boolean {
  try {
    const u = new URL(text.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Склонение: plural(3, ['рецепт','рецепта','рецептов']) → 'рецепта' */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export const typeForms: Record<CardType, [string, string, string]> = {
  recipe: ['рецепт', 'рецепта', 'рецептов'],
  exercise: ['упражнение', 'упражнения', 'упражнений'],
  rule: ['правило', 'правила', 'правил'],
  idea: ['идея', 'идеи', 'идей'],
  tip: ['совет', 'совета', 'советов'],
};

export const typeLabel: Record<CardType, string> = {
  recipe: 'Рецепт',
  exercise: 'Упражнение',
  rule: 'Правило',
  idea: 'Идея',
  tip: 'Совет',
};

export const typeLabelPlural: Record<CardType, string> = {
  recipe: 'Рецепты',
  exercise: 'Упражнения',
  rule: 'Правила',
  idea: 'Идеи',
  tip: 'Советы',
};

/** Цвет «обложки» карточки по типу */
export const typeTint: Record<CardType, string> = {
  recipe: '#F3D9C4',
  exercise: '#DCE6FB',
  rule: '#DDEFE5',
  idea: '#F5F0D8',
  tip: '#EEE6FB',
};

const TYPE_ORDER: CardType[] = ['recipe', 'exercise', 'rule', 'tip', 'idea'];

/** «3 рецепта · 5 правил» */
export function countByType(cards: { type: CardType }[]): string {
  const counts = new Map<CardType, number>();
  for (const c of cards) counts.set(c.type, (counts.get(c.type) ?? 0) + 1);
  return TYPE_ORDER.filter((t) => counts.has(t))
    .map((t) => `${counts.get(t)} ${plural(counts.get(t)!, typeForms[t])}`)
    .join(' · ');
}

export function typesPresent(cards: { type: CardType }[]): CardType[] {
  const set = new Set(cards.map((c) => c.type));
  return TYPE_ORDER.filter((t) => set.has(t));
}

/** 754 → «12:34», 3725 → «1:02:05» */
export function fmtTime(sec: number | null | undefined): string {
  if (sec == null) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
}

const rtf = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' });

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  if (diff < 86400 * 7) return rtf.format(-Math.round(diff / 86400), 'day');
  if (diff < 86400 * 30) return rtf.format(-Math.round(diff / 86400 / 7), 'week');
  if (diff < 86400 * 365) return rtf.format(-Math.round(diff / 86400 / 30), 'month');
  return rtf.format(-Math.round(diff / 86400 / 365), 'year');
}

export function todayLabel(d = new Date()): string {
  const s = new Intl.DateTimeFormat('ru', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Надпись на плашке статуса действия */
export function actionLabel(type: CardType, action: ActionStatus): string | null {
  if (action === 'want') return 'Хочу попробовать';
  if (action === 'done') return type === 'recipe' ? 'Готовил' : type === 'exercise' ? 'Делал' : 'Применил';
  return null;
}

/** Надпись на кнопке «сделал» */
export function doneButtonLabel(type: CardType): string {
  return type === 'recipe' ? 'Приготовил' : type === 'exercise' ? 'Сделал' : 'Применил';
}

/** Фильтр «сделано» в сфере */
export function doneFilterLabel(types: CardType[]): string {
  if (types.length === 1 && types[0] === 'recipe') return 'Готовил';
  return 'Сделано';
}

/** Ссылка на оригинал, для YouTube — сразу на нужную секунду */
export function sourceLink(url: string, platform: Platform, sec?: number | null): string {
  if (!sec || (platform !== 'youtube' && platform !== 'youtube_shorts')) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('t', `${sec}s`);
    return u.toString();
  } catch {
    return url;
  }
}

export function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const s = u.host.replace(/^www\./, '') + u.pathname;
    return s.length > 42 ? s.slice(0, 41) + '…' : s;
  } catch {
    return url;
  }
}

export function fmtIngredient(i: Ingredient): string {
  if (i.amount == null || i.amount === '') return i.product;
  return `${i.product} — ${i.amount}${i.unit ? ' ' + i.unit : ''}`;
}

export const mealLabel: Record<string, string> = {
  breakfast: 'завтрак',
  lunch: 'обед',
  dinner: 'ужин',
  snack: 'перекус',
};
