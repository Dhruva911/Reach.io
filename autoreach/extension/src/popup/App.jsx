import React, { useState, useEffect } from 'react';

const STATUSES = ['new', 'enriched', 'contacted', 'replied', 'interested', 'qualified', 'meeting_booked', 'closed_won'];
const STATUS_COLORS = {
  new: 'bg-slate-100 text-slate-600',
  contacted: 'bg-blue-100 text-blue-700',
  replied: 'bg-yellow-100 text-yellow-700',
  interested: 'bg-orange-100 text-orange-700',
  qualified: 'bg-purple-100 text-purple-700',
  meeting_booked: 'bg-green-100 text-green-700',
  closed_won: 'bg-emerald-100 text-emerald-700',
};

function sendMessage(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(res || {});
    });
  });
}

export default function PopupApp() {
  const [view, setView] = useState('main'); // main | login | quickAdd
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentProspects, setRecentProspects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);
    try {
      const stored = await new Promise((r) => chrome.storage.local.get(['currentUser', 'localStats', 'cachedProspects'], r));
      if (stored.currentUser) {
        setUser(stored.currentUser);
        setStats(stored.localStats || {});
        setRecentProspects((stored.cachedProspects || []).slice(0, 5));
        // Try refresh from backend
        try {
          const analyticsData = await sendMessage({ type: 'GET_ANALYTICS' });
          if (analyticsData.stats) setStats(analyticsData.stats);
          const prospectsData = await sendMessage({ type: 'GET_PROSPECTS', payload: { limit: 5 } });
          if (prospectsData.prospects) setRecentProspects(prospectsData.prospects);
        } catch {}
      } else {
        setView('login');
      }
    } catch {
      setView('login');
    }
    setLoading(false);
  }

  function openSidePanel() {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.sidePanel.open({ tabId: tab.id });
      window.close();
    });
  }

  function openOptions() {
    chrome.runtime.openOptionsPage();
    window.close();
  }

  if (loading) return <LoadingScreen />;
  if (view === 'login') return <LoginView onLogin={(u) => { setUser(u); setView('main'); init(); }} />;
  if (view === 'quickAdd') return <QuickAddView onBack={() => setView('main')} onSaved={() => { setView('main'); init(); }} />;

  return (
    <div style={{ width: 360, minHeight: 480, background: 'white' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </div>
          <span className="font-semibold text-slate-800 text-sm">Reach.io</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setView('quickAdd')} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Quick add prospect">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </button>
          <button onClick={openOptions} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 p-3 border-b border-slate-100">
        <StatCard label="This Week" value={stats?.prospectsAdded || 0} sub="prospects" color="sky" />
        <StatCard label="Replied" value={stats?.repliesReceived || 0} sub="total" color="orange" />
        <StatCard label="Meetings" value={stats?.meetingsBooked || 0} sub="booked" color="green" />
      </div>

      {/* Recent Prospects */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recent Prospects</span>
          <button onClick={openSidePanel} className="text-xs text-sky-500 hover:text-sky-600 font-medium">View all →</button>
        </div>
        {recentProspects.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-slate-400 text-xs mb-3">No prospects yet.</p>
            <p className="text-slate-400 text-xs">Go to LinkedIn and click the ➕ button to start!</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentProspects.map((p, i) => (
              <ProspectRow key={p.id || i} prospect={p} />
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="p-3 pt-0">
        <button onClick={openSidePanel} className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-colors">
          Open Full CRM Panel →
        </button>
      </div>

      {/* Footer */}
      <div className="px-3 pb-2 text-center">
        <span className="text-xs text-slate-400">Logged in as {user?.email || 'you'}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  const colorMap = {
    sky: 'text-sky-600 bg-sky-50',
    orange: 'text-orange-600 bg-orange-50',
    green: 'text-emerald-600 bg-emerald-50',
  };
  return (
    <div className={`rounded-lg p-2.5 ${colorMap[color]}`}>
      <div className={`text-xl font-bold ${colorMap[color].split(' ')[0]}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xs text-slate-400">{sub}</div>
    </div>
  );
}

function ProspectRow({ prospect }) {
  const statusClass = STATUS_COLORS[prospect.status] || 'bg-slate-100 text-slate-600';
  const initials = (prospect.full_name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const score = prospect.lead_score;

  return (
    <div className="flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-slate-50">
      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-800 text-xs truncate">{prospect.full_name || 'Unknown'}</div>
        <div className="text-slate-400 text-xs truncate">{prospect.title ? `${prospect.title} @ ${prospect.company_name || ''}` : prospect.company_name || ''}</div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {score !== null && score !== undefined && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${score >= 80 ? 'bg-red-100 text-red-600' : score >= 50 ? 'bg-orange-100 text-orange-600' : 'bg-sky-100 text-sky-600'}`}>
            {score}
          </span>
        )}
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusClass}`}>{prospect.status || 'new'}</span>
      </div>
    </div>
  );
}

function LoginView({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'LOGIN', payload: { email, password } }, (r) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(r);
        });
      });
      if (res.success) onLogin(res.user);
      else setError(res.error || 'Login failed');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ width: 360 }} className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
          </svg>
        </div>
        <div>
          <div className="font-bold text-slate-800">Reach.io</div>
          <div className="text-xs text-slate-400">B2B Prospecting</div>
        </div>
      </div>
      <form onSubmit={handleLogin} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="you@company.com" required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="••••••••" required
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm disabled:opacity-50 transition-colors">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <p className="text-center text-xs text-slate-400 mt-4">
        No account?{' '}
        <button onClick={() => chrome.runtime.openOptionsPage()} className="text-sky-500 hover:underline">
          Set up backend in Options
        </button>
      </p>
    </div>
  );
}

function QuickAddView({ onBack, onSaved }) {
  const [form, setForm] = useState({ full_name: '', title: '', company_name: '', email: '', linkedin_url: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e) {
    e.preventDefault();
    if (!form.full_name && !form.email) { setError('Name or email required'); return; }
    setLoading(true);
    try {
      const res = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'SAVE_PROSPECT', payload: { ...form, source: 'manual' } }, (r) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(r);
        });
      });
      if (res.success) onSaved();
      else setError(res.error || 'Failed to save');
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  return (
    <div style={{ width: 360 }} className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-1 text-slate-400 hover:text-slate-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <span className="font-semibold text-slate-800 text-sm">Quick Add Prospect</span>
      </div>
      <form onSubmit={handleSave} className="space-y-2.5">
        {[
          { label: 'Full Name', key: 'full_name', placeholder: 'Jane Smith' },
          { label: 'Job Title', key: 'title', placeholder: 'Head of Marketing' },
          { label: 'Company', key: 'company_name', placeholder: 'Acme Corp' },
          { label: 'Email', key: 'email', type: 'email', placeholder: 'jane@acme.com' },
          { label: 'LinkedIn URL', key: 'linkedin_url', placeholder: 'linkedin.com/in/janesmith' },
        ].map(({ label, key, type = 'text', placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
            <input
              type={type} value={form[key]} placeholder={placeholder}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        ))}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm disabled:opacity-50">
          {loading ? 'Saving...' : '➕ Add Prospect'}
        </button>
      </form>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ width: 360, height: 200 }} className="flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center mx-auto mb-2 animate-pulse">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
          </svg>
        </div>
        <p className="text-xs text-slate-400">Loading...</p>
      </div>
    </div>
  );
}
