import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { notificationApi } from '../lib/api';

// The floating 3D shapes are a purely decorative background — they pull in
// Three.js (~270KB gzipped) so they're loaded lazily, after the real UI is
// already interactive, instead of blocking first paint on every page.
const Background3D = lazy(() => import('./Background3D'));

const TITLES = {
  '/': ['Dashboard', 'Your studio at a glance'],
  '/clients': ['Clients', 'Every client and their website'],
  '/overview': ['Overview', 'All clients, pricing and status in one table'],
  '/payments': ['Payments', 'Manage payment history and edit log'],
  '/reports': ['Reports', 'Revenue, growth and collection insights'],
  '/invoice': ['Documents', 'Generate invoices and quotations'],
  '/notifications': ['Notifications', 'Payment and deadline alerts'],
  '/settings': ['Settings', 'Profile, security and defaults'],
};

function useTitle(pathname) {
  if (pathname.startsWith('/clients/') && pathname !== '/clients') return ['Client Detail', 'Everything in one place'];
  if (pathname.startsWith('/payments/')) return TITLES['/payments'];
  return TITLES[pathname] || ['WebTrack', ''];
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const { pathname } = useLocation();
  const [title, subtitle] = useTitle(pathname);

  const loadAlerts = useCallback(() => {
    notificationApi
      .list()
      .then((d) => setAlerts(d.alerts || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadAlerts();
    // Keep the bell honest without hammering the API.
    const id = setInterval(loadAlerts, 120000);
    return () => clearInterval(id);
  }, [loadAlerts, pathname]);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return (
    <div className="min-h-dvh">
      <Suspense fallback={null}>
        <Background3D />
      </Suspense>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} alertCount={alerts.length} />

      <div className="lg:pl-[248px]">
        <div className="mx-auto w-full max-w-[1500px] px-3 pb-10 sm:px-4">
          <Navbar onMenu={() => setMenuOpen(true)} alerts={alerts} title={title} subtitle={subtitle} />

          <main>
            <AnimatePresence mode="wait">
              <Outlet key={pathname} context={{ refreshAlerts: loadAlerts, alerts }} />
            </AnimatePresence>
          </main>

          <footer className="mt-12 flex flex-col items-center gap-1 pb-4 text-center">
            <div className="hr-soft mb-4 w-full" />
            <p className="text-[11px] text-faint">
              WebTrack — client, project, payment &amp; domain tracking in one console.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
