import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoReview, setAutoReview] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Settings</p>
            <h1 className="text-4xl font-bold">Workspace preferences</h1>
            <p className="mt-2 text-slate-400">Manage your account, review preferences, and application behavior.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-white/10 bg-slate-950/90 p-6 shadow-xl shadow-black/20">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Account settings</p>
                <h2 className="text-2xl font-semibold text-white">Your profile</h2>
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Username</p>
                <p className="mt-3 text-lg font-semibold text-white">{user?.login || 'Loading...'}</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Email</p>
                <p className="mt-3 text-lg font-semibold text-white">{user?.email || 'Not available'}</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-white/5 p-5">
              <p className="text-sm text-slate-400 mb-4">GitHub connection</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-white">GitHub account</p>
                  <p className="text-sm text-slate-400">Connected user profile and OAuth session state.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-4 py-2 text-xs text-slate-300">
                  <ShieldCheck size={16} />
                  Connected
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-slate-950/90 p-6">
              <div className="flex items-center gap-3 text-slate-400">
                <Sparkles size={18} />
                <p className="font-semibold text-white">Preferences</p>
              </div>

              <div className="mt-6 space-y-4">
                <label className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-4">
                  <div>
                    <p className="font-semibold text-white">Dark mode</p>
                    <p className="text-sm text-slate-400">Enable immersive theme styling across the app.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(event) => setDarkMode(event.target.checked)}
                    className="h-5 w-5 rounded border border-slate-700 bg-slate-900 text-cyan-400"
                  />
                </label>

                <label className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-4">
                  <div>
                    <p className="font-semibold text-white">Email alerts</p>
                    <p className="text-sm text-slate-400">Receive notifications for new review results and warnings.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(event) => setEmailAlerts(event.target.checked)}
                    className="h-5 w-5 rounded border border-slate-700 bg-slate-900 text-cyan-400"
                  />
                </label>

                <label className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-4">
                  <div>
                    <p className="font-semibold text-white">Auto review</p>
                    <p className="text-sm text-slate-400">Automatically queue reviews for newly connected repositories.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoReview}
                    onChange={(event) => setAutoReview(event.target.checked)}
                    className="h-5 w-5 rounded border border-slate-700 bg-slate-900 text-cyan-400"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950/90 p-6">
              <p className="text-sm text-slate-400">Application</p>
              <p className="mt-4 text-slate-300 leading-relaxed">
                These settings are stored locally for now. Backend integration can be added to persist preference updates to your user profile.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
