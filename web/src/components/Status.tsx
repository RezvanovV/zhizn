// Общие заглушки: загрузка и ошибка
export function Loading() {
  return <div className="empty">Загружаю…</div>;
}

export function ErrorBox({ error }: { error: string }) {
  return (
    <div className="card">
      <span className="error-text">Не получилось загрузить: {error}</span>
      <span className="sub">Проверь интернет и обнови страницу.</span>
    </div>
  );
}
