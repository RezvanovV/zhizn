import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import {
  actionLabel,
  countByType,
  doneFilterLabel,
  plural,
  platformLabel,
  typeLabelPlural,
  typesPresent,
  typeTint,
} from '../lib/format';
import type { CardType, CardWithSource } from '../lib/types';
import { ErrorBox, Loading } from '../components/Status';

type Filter = 'all' | CardType | 'want' | 'done';

export default function Sphere() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, error, reload } = useLoad(async () => {
    const [area, cards] = await Promise.all([api.area(id), api.cardsByArea(id)]);
    return { area, cards };
  }, [id]);
  const [filter, setFilter] = useState<Filter>('all');

  const cards = data?.cards ?? [];
  const types = typesPresent(cards);
  const videos = new Set(cards.map((c) => c.source_id).filter(Boolean)).size;
  const shown = cards.filter((c) =>
    filter === 'all' ? true : filter === 'want' || filter === 'done' ? c.action_status === filter : c.type === filter,
  );

  async function rename() {
    if (!data) return;
    const name = prompt('Новое название сферы', data.area.name);
    if (!name || !name.trim() || name.trim() === data.area.name) return;
    try {
      await api.renameArea(id, name);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  async function remove() {
    if (!data) return;
    const msg = cards.length
      ? `Удалить сферу «${data.area.name}»? ${cards.length} ${plural(cards.length, ['карточка останется', 'карточки останутся', 'карточек останутся'])} в базе без сферы.`
      : `Удалить сферу «${data.area.name}»?`;
    if (!confirm(msg)) return;
    await api.deleteArea(id);
    navigate('/base');
  }

  return (
    <main className="screen">
      <Link to="/base" className="back">
        ← База
      </Link>

      {error && <ErrorBox error={error} />}
      {!data && !error && <Loading />}

      {data && (
        <>
          <div className="head">
            <h1 className="h1">{data.area.name}</h1>
            <span className="sub">
              {cards.length
                ? `${countByType(cards)} · из ${videos} ${plural(videos, ['видео', 'видео', 'видео'])}`
                : 'Пока пусто'}
            </span>
          </div>

          {cards.length > 0 && (
            <div className="chips">
              <Chip on={filter === 'all'} onClick={() => setFilter('all')}>
                Все
              </Chip>
              {types.length > 1 &&
                types.map((t) => (
                  <Chip key={t} on={filter === t} onClick={() => setFilter(t)}>
                    {typeLabelPlural[t]}
                  </Chip>
                ))}
              <Chip on={filter === 'want'} onClick={() => setFilter('want')}>
                Хочу попробовать
              </Chip>
              <Chip on={filter === 'done'} onClick={() => setFilter('done')}>
                {doneFilterLabel(types)}
              </Chip>
            </div>
          )}

          {cards.length === 0 && (
            <div className="empty">
              Здесь появятся карточки, когда ты сохранишь их на экране проверки.
            </div>
          )}
          {cards.length > 0 && shown.length === 0 && <div className="empty">Под этот фильтр ничего нет.</div>}

          <div className="grid2">
            {shown.map((c) => (
              <KCard key={c.id} card={c} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 'auto' }}>
            <button className="btn ghost small" onClick={rename}>
              Переименовать
            </button>
            <button className="btn danger small" onClick={remove}>
              Удалить сферу
            </button>
          </div>
        </>
      )}
    </main>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button className={`chip ${on ? 'on' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

function KCard({ card: c }: { card: CardWithSource }) {
  const badge = actionLabel(c.type, c.action_status);
  const time = c.content.time_min ?? c.content.duration_min;
  return (
    <Link to={`/card/${c.id}`} className="kcard">
      <span className="cover" style={{ background: typeTint[c.type] }} />
      <span className="body">
        <span className="title">{c.title}</span>
        <span className="meta">
          {c.sources ? platformLabel[c.sources.platform].split(' · ')[0] : 'Без источника'}
          {time ? ` · ${time} мин` : ''}
        </span>
        {badge && <span className={`badge sm ${c.action_status === 'done' ? 'green' : 'orange'}`}>{badge}</span>}
      </span>
    </Link>
  );
}
