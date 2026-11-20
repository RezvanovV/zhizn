import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useLoad } from '../lib/useLoad';
import { plural, platformLabel, typeLabel } from '../lib/format';
import type { CardWithSource } from '../lib/types';
import { SearchIcon } from '../components/Icons';
import { ErrorBox, Loading } from '../components/Status';

// Палитра для новых сфер (в тон макету)
export const AREA_COLORS = ['#E3F1EA', '#E6EEFF', '#FCE4E4', '#FCEBDD', '#EEE6FB', '#F5F0D8', '#DDF1F4', '#F1E4D6'];

export default function Base() {
  const { data, error, reload } = useLoad(async () => {
    const [areas, counts, stats] = await Promise.all([api.areas(), api.areaCounts(), api.stats()]);
    return { areas, counts, stats };
  }, []);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CardWithSource[] | null>(null);
  const [searchError, setSearchError] = useState('');

  // Поиск с небольшой задержкой, чтобы не дёргать базу на каждую букву
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      api
        .search(text)
        .then((r) => {
          setResults(r);
          setSearchError('');
        })
        .catch((e) => setSearchError(e instanceof Error ? e.message : String(e)));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <main className="screen">
      <div className="head">
        <h1 className="h1">База знаний</h1>
        {data && (
          <span className="sub">
            {data.stats.cards} {plural(data.stats.cards, ['карточка', 'карточки', 'карточек'])} из {data.stats.sources}{' '}
            {plural(data.stats.sources, ['видео', 'видео', 'видео'])}
          </span>
        )}
      </div>

      <div className="search">
        <span className="muted">
          <SearchIcon size={18} />
        </span>
        <input
          type="search"
          placeholder="Что я сохранял про спину?"
          aria-label="Поиск по базе"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {searchError && <span className="error-text">Поиск не сработал: {searchError}</span>}

      {results ? (
        <SearchResults results={results} />
      ) : (
        <>
          {error && <ErrorBox error={error} />}
          {!data && !error && <Loading />}
          {data && (
            <>
              <div className="list">
                {data.areas.map((a) => (
                  <Link key={a.id} to={`/area/${a.id}`} className="row">
                    <span className="swatch" style={{ background: a.color }} />
                    <span className="row-title">{a.name}</span>
                    <span className="sub">{data.counts[a.id] ?? 0}</span>
                  </Link>
                ))}
              </div>
              <AddArea onAdded={reload} />
            </>
          )}
          <button className="btn ghost" onClick={() => confirm('Выйти из аккаунта на этом устройстве?') && supabase.auth.signOut()}>
            Выйти
          </button>
        </>
      )}
    </main>
  );
}

function SearchResults({ results }: { results: CardWithSource[] }) {
  if (results.length === 0) return <div className="empty">Ничего не нашлось. Попробуй другое слово.</div>;
  return (
    <div className="list">
      {results.map((c) => (
        <Link key={c.id} to={`/card/${c.id}`} className="row">
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{c.title}</span>
            <span className="sub">
              {typeLabel[c.type]}
              {c.sources ? ` · ${platformLabel[c.sources.platform]}` : ''}
            </span>
          </span>
          <span className="sub">→</span>
        </Link>
      ))}
    </div>
  );
}

function AddArea({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(AREA_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.addArea(name, color);
      setName('');
      setOpen(false);
      onAdded();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('duplicate') ? 'Такая сфера уже есть' : msg);
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button
        className="btn"
        style={{ border: '1px dashed #A9AEB7', background: 'transparent', color: 'var(--muted-2)', height: 48, fontSize: 14, fontWeight: 600 }}
        onClick={() => setOpen(true)}
      >
        + Добавить сферу
      </button>
    );

  return (
    <form className="card" onSubmit={submit} style={{ gap: 12 }}>
      <span className="label">Новая сфера</span>
      <input className="input" autoFocus placeholder="Например, Финансы" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="palette" role="radiogroup" aria-label="Цвет">
        {AREA_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={color === c ? 'on' : ''}
            style={{ background: c }}
            aria-label={`Цвет ${c}`}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      {error && <span className="error-text">{error}</span>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary small" disabled={busy || !name.trim()}>
          Добавить
        </button>
        <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>
          Отмена
        </button>
      </div>
    </form>
  );
}
