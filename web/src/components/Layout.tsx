import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarIcon, InboxIcon, LayersIcon, SunIcon } from './Icons';

/** Экраны с нижним меню: Сегодня · Входящие · База · Календарь */
export default function Layout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
      <nav className="tabbar" aria-label="Основное меню">
        <div className="tabbar-inner">
          <NavLink to="/" end>
            <SunIcon />
            Сегодня
          </NavLink>
          <NavLink to="/inbox">
            <InboxIcon />
            Входящие
          </NavLink>
          <NavLink to="/base" className={({ isActive }) => (isActive || isAreaPath() ? 'active' : '')}>
            <LayersIcon />
            База
          </NavLink>
          <NavLink to="/calendar">
            <CalendarIcon />
            Календарь
          </NavLink>
        </div>
      </nav>
    </>
  );
}

// Экран сферы относится к разделу «База»
function isAreaPath() {
  return window.location.hash.startsWith('#/area/');
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}
