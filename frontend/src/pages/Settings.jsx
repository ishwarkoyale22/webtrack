import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Lock, Palette, Percent, Save, Loader2, Eye, EyeOff, ShieldCheck, Sun, Moon,
  Building2, BellRing,
} from 'lucide-react';
import { PageTransition, Input, Switch, SectionTitle } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../lib/api';

function Card({ icon, title, subtitle, children, delay = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card p-5"
    >
      <SectionTitle icon={icon} title={title} subtitle={subtitle} />
      {children}
    </motion.section>
  );
}

export default function Settings() {
  const { admin, setAdmin } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const toast = useToast();

  const [profile, setProfile] = useState({ name: '', email: '', company: '', phone: '', address: '' });
  const [settings, setSettings] = useState({
    gstDefault: false, gstRate: 18, paymentDueDays: 7, deadlineAlertDays: 7,
  });
  const [pass, setPass] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    if (!admin) return;
    setProfile({
      name: admin.name || '', email: admin.email || '', company: admin.company || '',
      phone: admin.phone || '', address: admin.address || '',
    });
    setSettings({
      gstDefault: !!admin.settings?.gstDefault,
      gstRate: admin.settings?.gstRate ?? 18,
      paymentDueDays: admin.settings?.paymentDueDays ?? 7,
      deadlineAlertDays: admin.settings?.deadlineAlertDays ?? 7,
    });
  }, [admin]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving((s) => ({ ...s, profile: true }));
    try {
      setAdmin(await authApi.updateProfile(profile));
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err.friendlyMessage || 'Could not update your profile');
    } finally {
      setSaving((s) => ({ ...s, profile: false }));
    }
  };

  const saveSettings = async (next = settings) => {
    setSaving((s) => ({ ...s, settings: true }));
    try {
      setAdmin(await authApi.updateProfile({ settings: next }));
      toast.success('Defaults saved.');
    } catch (err) {
      toast.error(err.friendlyMessage || 'Could not save your defaults');
    } finally {
      setSaving((s) => ({ ...s, settings: false }));
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pass.newPassword.length < 6) return toast.error('The new password must be at least 6 characters.');
    if (pass.newPassword !== pass.confirm) return toast.error('The two new passwords do not match.');

    setSaving((s) => ({ ...s, password: true }));
    try {
      await authApi.changePassword({ currentPassword: pass.currentPassword, newPassword: pass.newPassword });
      setPass({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed successfully.');
    } catch (err) {
      toast.error(err.friendlyMessage || 'Could not change your password');
    } finally {
      setSaving((s) => ({ ...s, password: false }));
    }
    return undefined;
  };

  return (
    <PageTransition className="grid gap-4 lg:grid-cols-2">
      {/* ── Profile ── */}
      <Card icon={User} title="Admin Profile" subtitle="Shown on every invoice and quotation you generate">
        <form onSubmit={saveProfile} className="space-y-3.5">
          <div className="flex items-center gap-4 rounded-xl bg-white/5 p-3.5 ring-1 ring-white/8">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyanic-400 font-display text-base font-bold text-white shadow-glow">
              {(admin?.name || 'A').slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{admin?.name}</p>
              <p className="truncate text-[11px] text-faint">{admin?.email}</p>
            </div>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input label="Your name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
            <Input label="Email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required />
            <Input label="Business name" placeholder="WebTrack Studio" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
            <Input label="Phone" placeholder="+91 …" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            <Input
              wrapClass="sm:col-span-2"
              label="Business address"
              placeholder="Shown in the invoice header"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            />
          </div>

          <button type="submit" disabled={saving.profile} className="btn-primary">
            {saving.profile ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save profile
          </button>
        </form>
      </Card>

      {/* ── Password ── */}
      <Card icon={Lock} title="Change Password" subtitle="Your current password is required" delay={0.06}>
        <form onSubmit={changePassword} className="space-y-3.5">
          <div className="relative">
            <Input
              label="Current password"
              type={showPass ? 'text' : 'password'}
              value={pass.currentPassword}
              onChange={(e) => setPass({ ...pass, currentPassword: e.target.value })}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              aria-label={showPass ? 'Hide passwords' : 'Show passwords'}
              className="absolute right-3 top-[30px] rounded-lg p-1 text-faint transition hover:text-current"
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input
              label="New password"
              type={showPass ? 'text' : 'password'}
              value={pass.newPassword}
              onChange={(e) => setPass({ ...pass, newPassword: e.target.value })}
              minLength={6}
              required
              hint="At least 6 characters"
              autoComplete="new-password"
            />
            <Input
              label="Confirm new password"
              type={showPass ? 'text' : 'password'}
              value={pass.confirm}
              onChange={(e) => setPass({ ...pass, confirm: e.target.value })}
              minLength={6}
              required
              error={pass.confirm && pass.confirm !== pass.newPassword ? 'Passwords do not match' : ''}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" disabled={saving.password} className="btn-primary">
            {saving.password ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
            Update password
          </button>
        </form>
      </Card>

      {/* ── Appearance ── */}
      <Card icon={Palette} title="Appearance" subtitle="Dark and light are both first-class here" delay={0.12}>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['dark', 'Dark', Moon, 'from-[#0b0f2a] to-[#1a1145]'],
            ['light', 'Light', Sun, 'from-[#f8faff] to-[#e6edff]'],
          ].map(([value, label, Icon, grad]) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`group relative overflow-hidden rounded-2xl p-4 text-left ring-1 transition-all duration-400 ${
                theme === value ? 'ring-brand-400/70 shadow-glow' : 'ring-white/10 hover:ring-white/25'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
              <div className="relative flex items-center justify-between">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${value === 'dark' ? 'bg-white/10 text-brand-300' : 'bg-slate-900/10 text-amber-500'}`}>
                  <Icon size={17} />
                </span>
                {theme === value && (
                  <motion.span
                    layoutId="theme-check"
                    className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-cyanic-400 text-[11px] font-bold text-white"
                  >
                    ✓
                  </motion.span>
                )}
              </div>
              <p className={`relative mt-8 text-sm font-semibold ${value === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {label}
              </p>
              <p className={`relative text-[11px] ${value === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {value === 'dark' ? 'Deep navy & purple' : 'Soft white & blue'}
              </p>
            </button>
          ))}
        </div>

        <p className="mt-3 text-[11px] text-faint">
          Currently using <span className="font-semibold">{isDark ? 'dark' : 'light'}</span> mode. Your choice is
          remembered on this device.
        </p>
      </Card>

      {/* ── Defaults ── */}
      <Card icon={Percent} title="Billing & Alert Defaults" subtitle="Applied to new clients and the alerts feed" delay={0.18}>
        <div className="space-y-4">
          <div className="glass rounded-xl p-3.5">
            <Switch
              checked={settings.gstDefault}
              onChange={(v) => {
                const next = { ...settings, gstDefault: v };
                setSettings(next);
                saveSettings(next);
              }}
              label="Charge GST by default"
              hint="New clients start with the GST toggle already on"
            />
          </div>

          <div className="grid gap-3.5 sm:grid-cols-3">
            <Input
              label="Default GST rate (%)"
              type="number"
              min="0"
              max="100"
              value={settings.gstRate}
              onChange={(e) => setSettings({ ...settings, gstRate: e.target.value })}
            />
            <Input
              label="Payment reminder (days)"
              type="number"
              min="0"
              max="90"
              value={settings.paymentDueDays}
              onChange={(e) => setSettings({ ...settings, paymentDueDays: e.target.value })}
              hint="Warn this far ahead"
            />
            <Input
              label="Deadline alert (days)"
              type="number"
              min="0"
              max="90"
              value={settings.deadlineAlertDays}
              onChange={(e) => setSettings({ ...settings, deadlineAlertDays: e.target.value })}
              hint="Warn this far ahead"
            />
          </div>

          <button
            onClick={() =>
              saveSettings({
                ...settings,
                gstRate: Number(settings.gstRate) || 0,
                paymentDueDays: Number(settings.paymentDueDays) || 0,
                deadlineAlertDays: Number(settings.deadlineAlertDays) || 0,
              })
            }
            disabled={saving.settings}
            className="btn-primary"
          >
            {saving.settings ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save defaults
          </button>

          <p className="flex items-start gap-2 rounded-xl bg-white/5 p-3 text-[11px] leading-relaxed text-faint ring-1 ring-white/8">
            <BellRing size={13} className="mt-0.5 shrink-0 text-brand-300" />
            Payment reminders and deadline alerts use these windows to decide what shows up on the dashboard and in the
            notification bell.
          </p>
        </div>
      </Card>

      {/* ── Account ── */}
      <Card icon={Building2} title="Account" subtitle="This is a single-admin panel" delay={0.24}>
        <div>
          <p className="text-sm font-medium">Signed in as {admin?.email}</p>
          <p className="mt-1 text-xs text-faint">
            The panel opens directly — no login screen. To require a password instead, set{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px]">AUTO_LOGIN=false</code> in{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px]">backend/.env</code> and restart the API.
          </p>
        </div>
      </Card>
    </PageTransition>
  );
}
