export type Platform = 'youtube' | 'youtube_shorts' | 'instagram' | 'other';
export type SourceStatus = 'pending' | 'processing' | 'done' | 'error';
export type CardType = 'recipe' | 'exercise' | 'rule' | 'idea' | 'tip';
export type CardStatus = 'draft' | 'approved' | 'rejected';
export type ActionStatus = 'none' | 'want' | 'done';

export interface Area {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface Source {
  id: string;
  url: string;
  platform: Platform;
  title: string | null;
  author: string | null;
  duration_sec: number | null;
  thumbnail_url: string | null;
  status: SourceStatus;
  progress: number;
  step: string | null;
  error: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface Ingredient {
  product: string;
  amount?: number | string | null;
  unit?: string | null;
}

/** Содержимое карточки. Набор полей зависит от типа (см. docs/ARCHITECTURE.md). */
export interface CardContent {
  // recipe
  time_min?: number;
  meal?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings?: number;
  ingredients?: Ingredient[];
  steps?: string[];
  // exercise
  equipment?: string[];
  duration_min?: number;
  muscle_group?: string;
  mistakes?: string[];
  sets?: string;
  // rule
  statement?: string;
  basis?: 'author_opinion' | 'research';
  reference?: string;
  // idea / tip
  essence?: string;
  context?: string;
}

export interface Card {
  id: string;
  source_id: string | null;
  area_id: string | null;
  type: CardType;
  title: string;
  summary: string | null;
  content: CardContent;
  status: CardStatus;
  action_status: ActionStatus;
  unverified: boolean;
  timecode_sec: number | null;
  model: string | null;
  approved_at: string | null;
  last_done_at: string | null;
  created_at: string;
}

export type SourceBrief = Pick<Source, 'url' | 'platform' | 'title' | 'created_at'>;
export type CardWithSource = Card & { sources: SourceBrief | null };
export type SourceWithCards = Source & { cards: Pick<Card, 'id' | 'type' | 'status'>[] };

export interface CalendarEvent {
  id: string;
  card_id: string | null;
  title: string;
  starts_at: string;
  destination: 'app' | 'reminders' | 'google';
  status: 'planned' | 'done' | 'cancelled';
}
