import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import { FullPageLoader } from './components/ui';
import { useAuth } from './context/AuthContext';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const Team = lazy(() => import('./pages/Team'));
const Overview = lazy(() => import('./pages/Overview'));
const Payments = lazy(() => import('./pages/Payments'));
const Reports = lazy(() => import('./pages/Reports'));
const Invoice = lazy(() => import('./pages/Invoice'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));

/**
 * The panel opens directly — auto-login signs the admin in silently during
 * boot, so nobody is ever redirected to a login screen. (/login still works
 * if visited by hand, e.g. with AUTO_LOGIN=false on the backend.)
 */
function Protected({ children }) {
  const { loading } = useAuth();
  if (loading) return <FullPageLoader label="Opening your dashboard" />;
  return children;
}

function PublicOnly({ children }) {
  const { isAuthed, loading } = useAuth();
  if (loading) return <FullPageLoader label="Checking session" />;
  if (isAuthed) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const location = useLocation();

  return (
    <Suspense fallback={<FullPageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname.split('/')[1] || 'root'}>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />

          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/team" element={<Team />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/payments/:id" element={<Payments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/invoice" element={<Invoice />} />
            <Route path="/invoice/:id" element={<Invoice />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}
