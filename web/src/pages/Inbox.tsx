import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { countByType, fmtTime, isUrl, platformColor, platformLabel, shortUrl, timeAgo } from '../lib/format';
import type { SourceWithCards } from '../lib/types';
import { ErrorBox, Loading } from '../components/Status';

type Filter = 'all' | 'review' | 'queue';

const needsReview = (s: SourceWithCards) => s.status === 'done' && s.cards.some((c) => c.status === 'draft');
const inQueue = (s: SourceWithCards) => s.status === 'pending' || s.status === 'processing';

export default function Inbox() {
  const { data, error, reload } = useLoad(() => api.sources(), []);
  const [filter, setFilter] = useState<Filter>('all');
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!isUrl(url)) {
      setAddError('Это не похоже на ссылку. Она должна начинаться с https://');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      await api.addSource(url);
      setUrl('');
      reload();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  }

  const sources = data ?? [];
  const reviewCount = sources.filter(needsReview).length;
  const queueCount = sources.filter(inQueue).length;
  const shown = sources.filter((s) => (filter === 'review' ? needsReview(s) : filter === 'queue' ? inQueue(s) : true));

  return (
    <main className="screen">
      <div className="head">
        <h1 className="h1">Входящие</h1>
        <span className="sub">Всё, что ты отправил через «Поделиться»</span>
      </div>

      <form className="inline-form" onSubmit={add}>
        <input
          className="input"
          type="url"
          inputMode="url"
          placeholder="Вставь ссылку вручную"
          aria-label="Ссылка на видео"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className="btn primary" style={{ width: 'auto', height: 48, padding: '0 16px', borderRadius: 12 }} disabled={adding || !url}>
          {adding ? '…' : 'Добавить'}
        </button>
      </form>
      {addError && <span className="error-text">{addError}</span>}

      <div className="chips">
        <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
          Все {sources.length}
        </button>
        <button className={`chip ${filter === 'review' ? 'on' : ''}`} onClick={() => setFilter('review')}>
          На проверку {reviewCount}
        </button>
        <button className={`chip ${filter === 'queue' ? 'on' : ''}`} onClick={() => setFilter('queue')}>
          В очереди {queueCount}
        </button>
      </div>

      {error && <ErrorBox error={error} />}
      {!data && !error && <Loading />}
      {data && shown.length === 0 && (
        <div className="empty">
          {filter === 'all'
            ? 'Пока пусто. Отправь сюда видео через «Поделиться» или вставь ссылку выше.'
            : 'Здесь ничего нет.'}
        </div>
      )}

      {shown.map((s) => (
        <SourceItem key={s.id} source={s} onChanged={reload} />
      ))}
    </main>
  );
}

function SourceItem({ source: s, onChanged }: { source: SourceWithCards; onChanged: () => void }) {
  const drafts = s.cards.filter((c) => c.status === 'draft');
  const approved = s.cards.filter((c) => c.status === 'approved');

  const top = (
    <span className="card-row">
      <span style={{ fontSize: 12, fontWeight: 700, color: platformColor[s.platform] }}>
        {platformLabel[s.platform]}
        {s.duration_sec ? ` · ${fmtTime(s.duration_sec)}` : ''}
      </span>
      <StatusBadge source={s} drafts={drafts.length} />
    </span>
  );
  const title = <span className="card-title">{s.title || shortUrl(s.url)}</span>;

  // Готово — ведёт на проверку
  if (s.status === 'done') {
    return (
      <Link to={`/review/${s.id}`} className="card">
        {top}
        {title}
        <span className="sub">
          {drafts.length
            ? `Нашлось: ${countByType(drafts)}`
            : approved.length
              ? `В базе: ${countByType(approved)}`
              : 'Полезного не нашлось'}
        </span>
      </Link>
    );
  }

  return (
    <div className="card">
      {top}
      {title}
      {s.status === 'processing' && (
        <>
          <span className="progress">
            <span style={{ width: `${s.progress}%` }} />
          </span>
          <span className="sub">{s.step || 'Обрабатываю…'}</span>
        </>
      )}
      {s.status === 'pending' && <span className="sub">Обработается, когда включишь компьютер · {timeAgo(s.created_at)}</span>}
      {s.status === 'error' && (
        <>
          <span className="error-text">{s.error || 'Неизвестная ошибка'}</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button className="btn secondary small" onClick={() => api.retrySource(s.id).then(onChanged)}>
              Повторить
            </button>
            <button
              className="btn danger small"
              onClick={() => confirm('Удалить эту ссылку из входящих?') && api.deleteSource(s.id).then(onChanged)}
            >
              Удалить
            </button>
          </span>
        </>
      )}
    </div>
  );
}

function StatusBadge({ source: s, drafts }: { source: SourceWithCards; drafts: number }) {
  if (s.status === 'pending') return <span className="badge grey">Ждёт ПК</span>;
  if (s.status === 'processing') return <span className="badge blue">Обрабатывается</span>;
  if (s.status === 'error') return <span className="badge red">Ошибка</span>;
  if (drafts) return <span className="badge green">Готово — проверь</span>;
  return <span className="badge grey">Разобрано</span>;
}
