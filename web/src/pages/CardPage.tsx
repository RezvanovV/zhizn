import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import {
  actionLabel,
  doneButtonLabel,
  fmtIngredient,
  fmtTime,
  mealLabel,
  platformLabel,
  sourceLink,
  timeAgo,
  typeLabel,
  typeTint,
} from '../lib/format';
import type { ActionStatus, CardWithSource } from '../lib/types';
import { ErrorBox, Loading } from '../components/Status';

export default function CardPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, error, reload } = useLoad(async () => {
    const [card, areas] = await Promise.all([api.card(id), api.areas()]);
    return { card, areas };
  }, [id]);
  const [busy, setBusy] = useState(false);

  if (error) return <main className="screen no-nav"><ErrorBox error={error} /></main>;
  if (!data) return <main className="screen no-nav"><Loading /></main>;

  const { card: c, areas } = data;
  const area = areas.find((a) => a.id === c.area_id);
  const badge = actionLabel(c.type, c.action_status);

  async function setAction(action: ActionStatus) {
    setBusy(true);
    await api.setAction(c.id, c.action_status === action ? 'none' : action).catch((e) => alert(e.message));
    setBusy(false);
    reload();
  }

  async function move(areaId: string) {
    await api.moveCard(c.id, areaId).catch((e) => alert(e.message));
    reload();
  }

  async function remove() {
    if (!confirm('Убрать карточку из базы?')) return;
    await api.removeCard(c.id);
    navigate(area ? `/area/${area.id}` : '/base');
  }

  return (
    <div className="card-page">
      <div className="hero" style={{ background: typeTint[c.type] }}>
        <button className="back" onClick={() => (history.length > 1 ? navigate(-1) : navigate(area ? `/area/${area.id}` : '/base'))}>
          ← {area?.name ?? 'Назад'}
        </button>
        <span style={{ display: 'flex', gap: 8 }}>
          <span className="badge" style={{ background: '#fff', color: 'var(--muted-2)' }}>
            {typeLabel[c.type]}
          </span>
          {badge && (
            <span className="badge" style={{ background: '#fff', color: c.action_status === 'done' ? 'var(--accent)' : 'var(--orange)' }}>
              {badge}
            </span>
          )}
        </span>
      </div>

      <div className="content">
        <div className="head" style={{ gap: 4 }}>
          <h1 className="h2">{c.title}</h1>
          <span className="sub">
            {c.sources ? platformLabel[c.sources.platform] : 'Без источника'} · сохранено {timeAgo(c.created_at)}
            {c.sources && (
              <>
                {' · '}
                <a href={sourceLink(c.sources.url, c.sources.platform, c.timecode_sec)} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                  оригинал{c.timecode_sec != null ? ` с ${fmtTime(c.timecode_sec)}` : ''}
                </a>
              </>
            )}
          </span>
        </div>

        {c.summary && <p className="card-text" style={{ margin: 0 }}>{c.summary}</p>}

        <CardBody card={c} />

        <div className="card" style={{ gap: 10 }}>
          <span className="label">Сфера</span>
          <select className="input" value={c.area_id ?? ''} onChange={(e) => move(e.target.value)}>
            {!c.area_id && <option value="">Без сферы</option>}
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="actions row2">
          <button
            className={`btn ${c.action_status === 'want' ? 'primary' : 'secondary'}`}
            style={{ flex: 1 }}
            disabled={busy}
            onClick={() => setAction('want')}
          >
            Хочу попробовать
          </button>
          <button
            className={`btn ${c.action_status === 'done' ? 'primary' : 'secondary'}`}
            style={{ flex: 1 }}
            disabled={busy}
            onClick={() => setAction('done')}
          >
            {doneButtonLabel(c.type)}
          </button>
        </div>
        <button className="btn danger" onClick={remove}>
          Убрать из базы
        </button>
      </div>
    </div>
  );
}

/** Содержимое карточки — своё для каждого типа */
function CardBody({ card: c }: { card: CardWithSource }) {
  const x = c.content;
  const blocks: ReactNode[] = [];

  const facts: string[] = [];
  if (x.time_min) facts.push(`${x.time_min} мин`);
  if (x.meal) facts.push(mealLabel[x.meal] ?? x.meal);
  if (x.servings) facts.push(`${x.servings} порц.`);
  if (x.duration_min) facts.push(`${x.duration_min} мин`);
  if (x.muscle_group) facts.push(x.muscle_group);
  if (x.equipment?.length) facts.push(x.equipment.join(', '));
  if (x.sets) facts.push(x.sets);
  if (facts.length) blocks.push(<Section key="facts" title="Коротко">{facts.join(' · ')}</Section>);

  if (x.statement)
    blocks.push(
      <Section key="statement" title="Суть">
        <span>{x.statement}</span>
        {(c.unverified || x.basis === 'author_opinion') && <span className="warn">мнение автора, не проверено</span>}
        {x.basis === 'research' && <span className="sub">Со ссылкой на исследование{x.reference ? `: ${x.reference}` : ''}</span>}
      </Section>,
    );
  if (x.essence) blocks.push(<Section key="essence" title="Суть">{x.essence}</Section>);
  if (x.context) blocks.push(<Section key="context" title="Контекст">{x.context}</Section>);

  if (x.ingredients?.length)
    blocks.push(
      <Section key="ingr" title="Ингредиенты">
        <ul className="bullets">
          {x.ingredients.map((i, n) => (
            <li key={n}>{fmtIngredient(i)}</li>
          ))}
        </ul>
      </Section>,
    );
  if (x.steps?.length)
    blocks.push(
      <Section key="steps" title={c.type === 'recipe' ? 'Как готовить' : 'Как делать'}>
        <ol className="steps">
          {x.steps.map((s, n) => (
            <li key={n}>{s}</li>
          ))}
        </ol>
      </Section>,
    );
  if (x.mistakes?.length)
    blocks.push(
      <Section key="mistakes" title="Частые ошибки">
        <ul className="bullets">
          {x.mistakes.map((s, n) => (
            <li key={n}>{s}</li>
          ))}
        </ul>
      </Section>,
    );

  return <>{blocks}</>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card" style={{ fontSize: 14, lineHeight: 1.5, gap: 6 }}>
      <span className="label">{title}</span>
      {children}
    </div>
  );
}
