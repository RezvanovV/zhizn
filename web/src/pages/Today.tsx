import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { plural, timeAgo, todayLabel } from '../lib/format';
import { ChevronIcon, SearchIcon } from '../components/Icons';
import { ErrorBox, Loading } from '../components/Status';

export default function Today() {
  const { data, error } = useLoad(async () => {
    const [areas, counts, sources, stale] = await Promise.all([
      api.areas(),
      api.areaCounts(),
      api.sources(),
      api.staleWant(),
    ]);
    return { areas, counts, sources, stale };
  }, []);

  return (
    <main className="screen">
      <div className="head-row">
        <div className="head">
          <span className="sub">{todayLabel()}</span>
          <h1 className="h1">Сегодня</h1>
        </div>
        <Link to="/base" className="icon-btn" aria-label="Поиск по базе">
          <SearchIcon />
        </Link>
      </div>

      {/* Утренний помощник — этап 7. Пока объясняем, что здесь будет. */}
      <div className="card">
        <div className="card-row">
          <span className="section-title">План на день</span>
          <Link to="/calendar" style={{ fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Календарь →
          </Link>
        </div>
        <span className="card-text muted">
          Скоро здесь утром будет помощник: спросит, что в холодильнике и сколько времени до выхода, и предложит
          завтрак и зарядку из твоей базы.
        </span>
      </div>

      {error && <ErrorBox error={error} />}
      {!data && !error && <Loading />}

      {data && (
        <>
          <InboxSummary sources={data.sources} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="section-title">Сферы</span>
            <div className="grid3">
              {data.areas.map((a) => (
                <Link key={a.id} to={`/area/${a.id}`} className="tile">
                  <span className="swatch" style={{ background: a.color }} />
                  <span className="tile-name">
                    {a.name} <span>{data.counts[a.id] ?? 0}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {data.stale && (
            <div className="dark-card">
              <span className="label">Давно лежит</span>
              <span style={{ fontSize: 15, lineHeight: 1.4 }}>
                «{data.stale.title}» сохранено {timeAgo(data.stale.created_at)}, но ещё не опробовано.
              </span>
              <Link to={`/card/${data.stale.id}`} className="btn light">
                Открыть
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function InboxSummary({ sources }: { sources: Awaited<ReturnType<typeof api.sources>> }) {
  const review = sources.filter((s) => s.status === 'done' && s.cards.some((c) => c.status === 'draft')).length;
  const waiting = sources.filter((s) => s.status === 'pending' || s.status === 'processing').length;
  const errors = sources.filter((s) => s.status === 'error').length;
  const total = review + waiting + errors;

  const parts: string[] = [];
  if (review) parts.push(`${review} ${plural(review, ['готово', 'готовы', 'готовы'])} к проверке`);
  if (waiting) parts.push(`${waiting} ждёт ПК`);
  if (errors) parts.push(`${errors} ${plural(errors, ['ошибка', 'ошибки', 'ошибок'])}`);

  return (
    <Link to="/inbox" className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: total ? 'var(--orange-soft)' : 'var(--grey-soft)',
          color: total ? 'var(--orange)' : 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontFamily: 'var(--font-head)',
        }}
      >
        {total}
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{total ? 'Новое во входящих' : 'Входящие разобраны'}</span>
        <span className="sub">{total ? parts.join(' · ') : 'Отправь видео через «Поделиться»'}</span>
      </span>
      <span className="muted">
        <ChevronIcon />
      </span>
    </Link>
  );
}
