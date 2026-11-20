import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { SunIcon } from '../components/Icons';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setError(
        error.message.includes('Invalid login')
          ? 'Неверная почта или пароль'
          : `Не получилось войти: ${error.message}`,
      );
    }
    // при успехе App сам переключится на приложение
  }

  return (
    <form className="login" onSubmit={submit}>
      <div className="logo">
        <SunIcon size={34} />
      </div>
      <div className="head">
        <h1 className="h1">Жизнь</h1>
        <span className="sub">Твоя база знаний из видео</span>
      </div>
      <input
        className="input"
        type="email"
        autoComplete="username"
        placeholder="Почта"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="input"
        type="password"
        autoComplete="current-password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <span className="error-text">{error}</span>}
      <button className="btn primary" disabled={busy}>
        {busy ? 'Вхожу…' : 'Войти'}
      </button>
    </form>
  );
}
