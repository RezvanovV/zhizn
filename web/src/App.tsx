import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Layout, { ScrollToTop } from './components/Layout';
import Login from './pages/Login';
import Today from './pages/Today';
import Inbox from './pages/Inbox';
import Review from './pages/Review';
import Base from './pages/Base';
import Sphere from './pages/Sphere';
import CardPage from './pages/CardPage';
import Calendar from './pages/Calendar';

export default function App() {
  // undefined — ещё проверяем, вошёл ли пользователь
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="center">Жизнь</div>;
  if (!session) return <Login />;

  // HashRouter (адреса вида /#/inbox) работает на любом статическом хостинге без настроек
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="base" element={<Base />} />
          <Route path="area/:id" element={<Sphere />} />
          <Route path="calendar" element={<Calendar />} />
        </Route>
        <Route path="review/:id" element={<><ScrollToTop /><Review /></>} />
        <Route path="card/:id" element={<><ScrollToTop /><CardPage /></>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
