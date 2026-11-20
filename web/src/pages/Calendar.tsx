import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { ErrorBox } from '../components/Status';

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** Календарь: в MVP — неделя и события из базы. Синхронизация с iPhone и Google — после MVP. */
export default function Calendar() {
  const today = new Date();
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const { data, error } = useLoad(() => api.eventsBetween(monday, nextMonday), []);
  const month = new Intl.DateTimeFormat('ru', { month: 'long' }).format(today);

  return (
    <main className="screen">
      <div className="head">
        <h1 className="h1">Календарь</h1>
        <span className="sub">{month.charAt(0).toUpperCase() + month.slice(1)}</span>
      </div>

      <div className="week">
        {days.map((d, i) => (
          <span key={i} className={`day ${d.toDateString() === today.toDateString() ? 'today' : ''}`}>
            {DAY_NAMES[i]}
            <b>{d.getDate()}</b>
          </span>
        ))}
      </div>

      {error && <ErrorBox error={error} />}

      {data && data.length > 0 && (
        <div className="list">
          {data.map((e) => (
            <div key={e.id} className="row">
              <span style={{ width: 70, fontWeight: 700, fontSize: 14 }}>
                {new Intl.DateTimeFormat('ru', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(e.starts_at))}
              </span>
              <span style={{ flex: 1, fontSize: 14 }}>{e.title}</span>
              {e.card_id && (
                <Link to={`/card/${e.card_id}`} className="sub">
                  →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <span className="section-title">Скоро</span>
        <span className="card-text muted">
          Здесь будут дела из Напоминаний iPhone, Google Календаря и то, что ты запланировал из карточек: «приготовить
          шакшуку», «тренировка: отжимания с паузой». Подключим после того, как заработает основное.
        </span>
      </div>
    </main>
  );
}
