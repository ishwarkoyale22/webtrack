import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { notificationApi } from '../lib/api';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [alerts, setAlerts]     = useState([]);
  const { pathname }            = useLocation();

  const loadAlerts = useCallback(() => {
    notificationApi
      .list()
      .then((d) => setAlerts(d.alerts || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadAlerts();
    // Refresh alerts in the background every 2 minutes without hammering the API.
    const id = setInterval(loadAlerts, 120_000);
    return () => clearInterval(id);
  }, [loadAlerts, pathname]);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return (
    <div className="min-h-dvh">
      {/* Mobile slide-in drawer (hamburger → opens this) */}
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} alertCount={alerts.length} />

      {/* Two-tier sticky top navigation — full viewport width */}
      <Navbar onMenu={() => setMenuOpen(true)} alerts={alerts} />

      {/* Page content — full width, no left-sidebar offset */}
      <div className="mx-auto w-full max-w-[1500px] px-3 pt-5 pb-10 sm:px-5 sm:pt-6">
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
  );
}
