import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { fmtTime, platformColor, platformLabel, shortUrl, sourceLink, typeLabel } from '../lib/format';
import type { Card } from '../lib/types';
import { PlayIcon } from '../components/Icons';
import { ErrorBox, Loading } from '../components/Status';

/** Проверка: что ИИ нашёл в видео → галочки → сохранить в сферу */
export default function Review() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, error } = useLoad(async () => {
    const [source, cards, areas] = await Promise.all([api.source(id), api.cardsBySource(id), api.areas()]);
    return { source, cards, areas };
  }, [id]);

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [areaId, setAreaId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');

  const drafts = data?.cards.filter((c) => c.status === 'draft') ?? [];

  // Начальное состояние: отмечено всё, кроме непроверенных утверждений; сфера — та, что предложил ИИ
  useEffect(() => {
    if (!data) return;
    const d = data.cards.filter((c) => c.status === 'draft');
    setChecked(new Set(d.filter((c) => !c.unverified).map((c) => c.id)));
    setAreaId(mostCommonArea(d) ?? data.areas[0]?.id ?? '');
  }, [data]);

  function toggle(cardId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    setSaveError('');
    try {
      const approve = drafts.filter((c) => checked.has(c.id)).map((c) => c.id);
      const reject = drafts.filter((c) => !checked.has(c.id)).map((c) => c.id);
      await api.reviewCards(approve, reject, areaId);
      navigate(approve.length ? `/area/${areaId}` : '/inbox');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function rejectAll() {
    if (!confirm('Отклонить всё, что нашлось в этом видео?')) return;
    setBusy(true);
    try {
      await api.reviewCards([], drafts.map((c) => c.id), areaId);
      navigate('/inbox');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <main className="screen no-nav">
      <Link to="/inbox" className="back">
        ← Входящие
      </Link>

      {error && <ErrorBox error={error} />}
      {!data && !error && <Loading />}

      {data && (
        <>
          <a href={data.source.url} target="_blank" rel="noreferrer" className="video-head">
            <span
              className="thumb"
              style={data.source.thumbnail_url ? { backgroundImage: `url(${data.source.thumbnail_url})` } : undefined}
            >
              <PlayIcon />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: platformColor[data.source.platform] }}>
                {platformLabel[data.source.platform]}
                {data.source.duration_sec ? ` · ${fmtTime(data.source.duration_sec)}` : ''}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
                {data.source.title || shortUrl(data.source.url)}
              </span>
            </span>
          </a>

          {drafts.length === 0 ? (
            <AlreadyReviewed cards={data.cards} />
          ) : (
            <>
              <div className="card" style={{ gap: 10 }}>
                <span className="label">Сфера</span>
                <div className="chips wrap">
                  {data.areas.map((a) => (
                    <button
                      key={a.id}
                      className={`chip outline accent ${areaId === a.id ? 'on' : ''}`}
                      onClick={() => setAreaId(a.id)}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: '6px 16px', gap: 0 }}>
                <span className="label" style={{ padding: '10px 0 4px' }}>
                  Что нашлось в видео
                </span>
                {drafts.map((c) => (
                  <label key={c.id} className="check-row">
                    <input type="checkbox" checked={checked.has(c.id)} onChange={() => toggle(c.id)} />
                    <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span>
                        <b style={{ fontWeight: 600 }}>{typeLabel[c.type]}:</b> {c.title}
                      </span>
                      {c.summary && <span className="sub">{c.summary}</span>}
                      {c.unverified && <span className="warn">мнение автора, не проверено</span>}
                    </span>
                    {c.timecode_sec != null && (
                      <a
                        className="tc"
                        href={sourceLink(data.source.url, data.source.platform, c.timecode_sec)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {fmtTime(c.timecode_sec)}
                      </a>
                    )}
                  </label>
                ))}
              </div>

              {saveError && <span className="error-text">{saveError}</span>}

              <div className="actions">
                <button className="btn primary" onClick={save} disabled={busy || !areaId}>
                  {checked.size ? `Сохранить в базу (${checked.size})` : 'Ничего не сохранять'}
                </button>
                <button className="btn ghost" onClick={rejectAll} disabled={busy}>
                  Отклонить
                </button>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}

function AlreadyReviewed({ cards }: { cards: Card[] }) {
  const approved = cards.filter((c) => c.status === 'approved');
  if (cards.length === 0) return <div className="empty">ИИ не нашёл в этом видео ничего полезного.</div>;
  return (
    <div className="card" style={{ padding: '6px 16px', gap: 0 }}>
      <span className="label" style={{ padding: '10px 0 4px' }}>
        Уже разобрано
      </span>
      {approved.length === 0 && <span className="empty">Всё отклонено.</span>}
      {approved.map((c) => (
        <Link key={c.id} to={`/card/${c.id}`} className="row">
          <span className="row-title" style={{ fontWeight: 500, fontSize: 14 }}>
            <b style={{ fontWeight: 600 }}>{typeLabel[c.type]}:</b> {c.title}
          </span>
          <span className="sub">→</span>
        </Link>
      ))}
    </div>
  );
}

function mostCommonArea(cards: Card[]): string | null {
  const counts = new Map<string, number>();
  for (const c of cards) if (c.area_id) counts.set(c.area_id, (counts.get(c.area_id) ?? 0) + 1);
  let best: string | null = null;
  let max = 0;
  for (const [id, n] of counts) if (n > max) [best, max] = [id, n];
  return best;
}
