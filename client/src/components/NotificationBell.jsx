import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setCount(0);
      return undefined;
    }
    let cancelled = false;
    async function load() {
      try {
        const { data } = await api.get('/notifications/unread-count');
        if (!cancelled) setCount(data.count ?? 0);
      } catch {
        if (!cancelled) setCount(0);
      }
    }
    load();
    const t = setInterval(load, 15000);
    function onRefresh() {
      load();
    }
    window.addEventListener('cyl-notifications-refresh', onRefresh);
    return () => {
      cancelled = true;
      clearInterval(t);
      window.removeEventListener('cyl-notifications-refresh', onRefresh);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <Link
      to="/dashboard"
      state={{ scrollTo: 'notifications' }}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl hover:bg-slate-100"
      aria-label="Notifications"
    >
      🔔
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-brand-red text-white text-[10px] font-bold">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
