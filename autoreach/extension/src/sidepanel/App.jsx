import React, { useState, useEffect, useCallback } from 'react';

function sendMessage(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(res || {});
    });
  });
}

const STATUS_LABELS = {
  new: 'New', enriched: 'Enriched', contacted: 'Contacted',
  replied: 'Replied', interested: 'Interested', qualified: 'Qualified',
  meeting_booked: 'Meeting', closed_won: 'Won', closed_lost: 'Lost',
};

const STATUS_COLORS = {
  new: 'bg-slate-100 text-slate-600', enriched: 'bg-sky-50 text-sky-600',
  contacted: 'bg-blue-100 text-blue-700', replied: 'bg-yellow-100 text-yellow-700',
  interested: 'bg-orange-100 text-orange-700', qualified: 'bg-purple-100 text-purple-700',
  meeting_booked: 'bg-green-100 text-green-700', closed_won: 'bg-emerald-100 text-emerald-700',
  closed_lost: 'bg-red-100 text-red-600',
};

export default function SidePanelApp() {
  const [tab, setTab] = useState('prospects');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get(['currentUser'], (r) => {
      setUser(r.currentUser || null);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner /></div>;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 bg-white">
        <div className="w-6 h-6 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
          </svg>
        </div>
        <span className="font-semibold text-slate-800 text-sm flex-1">Reach.io</span>
        {user && <span className="text-xs text-slate-400 truncate max-w-24">{user.email}</span>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-white">
        {['prospects', 'campaigns', 'inbox', 'analytics'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
              tab === t ? 'text-sky-600 border-b-2 border-sky-500' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'prospects' && <ProspectsTab />}
        {tab === 'campaigns' && <CampaignsTab />}
        {tab === 'inbox' && <InboxTab />}
        {tab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  );
}

// ─── Prospects Tab ────────────────────────────────────────────────────────────

function ProspectsTab() {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sendMessage({ type: 'GET_PROSPECTS', payload: {} });
      setProspects(res.prospects || res.cachedProspects || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = prospects.filter((p) => {
    if (search && !`${p.full_name} ${p.company_name} ${p.title}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== 'all' && p.status !== filter) return false;
    return true;
  });

  if (selected) return <ProspectDetail prospect={selected} onBack={() => setSelected(null)} onUpdate={(updated) => {
    setProspects((ps) => ps.map((p) => p.id === updated.id ? updated : p));
    setSelected(updated);
  }} />;

  return (
    <div className="flex flex-col h-full">
      {/* Search + filter */}
      <div className="p-2 border-b border-slate-100 space-y-2">
        <input
          type="text" placeholder="Search prospects..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {['all', 'new', 'contacted', 'replied', 'interested', 'meeting_booked'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-2 py-1 rounded-full text-xs whitespace-nowrap font-medium transition-colors ${
                filter === s ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {STATUS_LABELS[s] || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-8"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState message={search ? 'No matching prospects' : 'No prospects yet — start browsing LinkedIn!'} />
      ) : (
        <div className="divide-y divide-slate-50">
          {filtered.map((p, i) => (
            <div key={p.id || i} onClick={() => setSelected(p)} className="px-3 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-2">
              <Avatar name={p.full_name} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 text-xs truncate">{p.full_name || 'Unknown'}</div>
                <div className="text-slate-400 text-xs truncate">{p.title || ''}{p.company_name ? ` @ ${p.company_name}` : ''}</div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-1">
                {p.lead_score != null && (
                  <ScorePill score={p.lead_score} />
                )}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[p.status] || STATUS_COLORS.new}`}>
                  {STATUS_LABELS[p.status] || 'New'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProspectDetail({ prospect, onBack, onUpdate }) {
  const [status, setStatus] = useState(prospect.status || 'new');
  const [aiEmail, setAiEmail] = useState(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [note, setNote] = useState('');

  async function handleStatusChange(newStatus) {
    setStatus(newStatus);
    try {
      await sendMessage({ type: 'UPDATE_PROSPECT_STATUS', payload: { id: prospect.id, status: newStatus } });
      onUpdate({ ...prospect, status: newStatus });
    } catch {}
  }

  async function handleGenerateEmail() {
    setGeneratingEmail(true);
    try {
      const settings = await sendMessage({ type: 'GET_SETTINGS' });
      const res = await sendMessage({
        type: 'GENERATE_EMAIL',
        payload: { prospectId: prospect.id, prospectData: prospect, icpContext: settings.icpContext },
      });
      setAiEmail(res);
    } catch (err) {
      console.error(err);
    }
    setGeneratingEmail(false);
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 p-3 border-b border-slate-100">
        <button onClick={onBack} className="p-1 text-slate-400 hover:text-slate-600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <Avatar name={prospect.full_name} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 text-sm truncate">{prospect.full_name}</div>
          <div className="text-xs text-slate-400 truncate">{prospect.title}</div>
        </div>
        {prospect.lead_score != null && <ScorePill score={prospect.lead_score} />}
      </div>

      <div className="p-3 space-y-3">
        {/* Status */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Pipeline Stage</label>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Info */}
        <div className="space-y-1.5 text-xs">
          {prospect.company_name && <InfoRow label="Company" value={prospect.company_name} />}
          {prospect.email && <InfoRow label="Email" value={prospect.email} />}
          {prospect.location && <InfoRow label="Location" value={prospect.location} />}
          {prospect.linkedin_url && (
            <InfoRow label="LinkedIn" value={
              <a href={prospect.linkedin_url} target="_blank" rel="noreferrer" className="text-sky-500 hover:underline truncate block max-w-full">
                View Profile →
              </a>
            } />
          )}
        </div>

        {/* About */}
        {prospect.about && (
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">About</label>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-2">{prospect.about.slice(0, 200)}</p>
          </div>
        )}

        {/* Recent Posts */}
        {prospect.recent_posts?.length > 0 && (
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Recent Posts</label>
            <div className="space-y-1.5">
              {prospect.recent_posts.slice(0, 2).map((post, i) => (
                <p key={i} className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 line-clamp-3">"{post.slice(0, 150)}"</p>
              ))}
            </div>
          </div>
        )}

        {/* AI Email Generation */}
        <div>
          <button
            onClick={handleGenerateEmail}
            disabled={generatingEmail}
            className="w-full py-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {generatingEmail ? '✨ Generating...' : '✨ Generate Personalized Email'}
          </button>
          {aiEmail && (
            <div className="mt-2 p-2.5 bg-slate-50 rounded-lg text-xs space-y-1.5">
              <div><span className="font-medium text-slate-600">Subject:</span> <span className="text-slate-800">{aiEmail.subject}</span></div>
              <p className="text-slate-700 leading-relaxed">{aiEmail.body}</p>
              <button
                onClick={() => navigator.clipboard.writeText(`Subject: ${aiEmail.subject}\n\n${aiEmail.body}`)}
                className="text-sky-500 hover:text-sky-600 font-medium"
              >
                📋 Copy to clipboard
              </button>
            </div>
          )}
        </div>

        {/* Calendly */}
        <CalendlySection prospect={prospect} />
      </div>
    </div>
  );
}

function CalendlySection({ prospect }) {
  const [calendlyUrl, setCalendlyUrl] = useState('');

  useEffect(() => {
    chrome.storage.local.get(['calendlyUrl'], (r) => setCalendlyUrl(r.calendlyUrl || ''));
  }, []);

  if (!calendlyUrl) return null;

  const bookingUrl = `${calendlyUrl}?name=${encodeURIComponent(prospect.full_name || '')}&email=${encodeURIComponent(prospect.email || '')}`;

  return (
    <a
      href={bookingUrl} target="_blank" rel="noreferrer"
      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition-colors"
    >
      📅 Book Meeting via Calendly
    </a>
  );
}

// ─── Campaigns Tab ────────────────────────────────────────────────────────────

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sendMessage({ type: 'GET_CAMPAIGNS' })
      .then((res) => setCampaigns(res.campaigns || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-3">
      {loading ? <div className="flex justify-center py-8"><Spinner /></div> :
       campaigns.length === 0 ? <EmptyState message="No campaigns yet. Create one in the web app." /> :
       <div className="space-y-2">
         {campaigns.map((c) => (
           <div key={c.id} className="border border-slate-100 rounded-xl p-3 hover:border-slate-200">
             <div className="flex items-center justify-between mb-1">
               <span className="font-medium text-sm text-slate-800">{c.name}</span>
               <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                 {c.status}
               </span>
             </div>
             <div className="flex gap-3 text-xs text-slate-400">
               <span>📊 {c.prospect_count || 0} prospects</span>
               <span>📧 {c.messages_sent || 0} sent</span>
               <span>↩ {c.reply_count || 0} replies</span>
             </div>
           </div>
         ))}
       </div>
      }
    </div>
  );
}

// ─── Inbox Tab ────────────────────────────────────────────────────────────────

function InboxTab() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sendMessage({ type: 'GET_ANALYTICS' })
      .then(() => {})
      .catch(() => {});

    // Try to get inbox from backend
    fetch('').catch(() => {});

    chrome.storage.local.get(['cachedProspects'], (r) => {
      const prospects = r.cachedProspects || [];
      // Show replied prospects as "inbox items"
      const replied = prospects.filter((p) => ['replied', 'interested'].includes(p.status));
      setMessages(replied);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-3">
      {loading ? <div className="flex justify-center py-8"><Spinner /></div> :
       messages.length === 0 ? <EmptyState message="No replies yet. Keep prospecting!" /> :
       <div className="space-y-2">
         {messages.map((p, i) => (
           <div key={p.id || i} className="border border-slate-100 rounded-xl p-3">
             <div className="flex items-center gap-2 mb-1">
               <Avatar name={p.full_name} size="xs" />
               <div>
                 <div className="font-medium text-sm text-slate-800">{p.full_name}</div>
                 <div className="text-xs text-slate-400">{p.company_name}</div>
               </div>
               {p.lead_score != null && <ScorePill score={p.lead_score} className="ml-auto" />}
             </div>
             <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || ''}`}>
               {STATUS_LABELS[p.status] || p.status}
             </span>
           </div>
         ))}
       </div>
      }
    </div>
  );
}

// ─── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sendMessage({ type: 'GET_ANALYTICS' })
      .then((res) => setStats(res.stats || res.overview || res))
      .catch(() => {
        chrome.storage.local.get(['localStats'], (r) => setStats(r.localStats || {}));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;

  const cards = [
    { label: 'Prospects', value: stats?.total_prospects || stats?.prospectsAdded || 0, icon: '👥' },
    { label: 'Active Campaigns', value: stats?.active_campaigns || 0, icon: '🚀' },
    { label: 'Messages Sent', value: stats?.messages_sent || stats?.emailsSent || 0, icon: '📧' },
    { label: 'Reply Rate', value: stats?.reply_rate ? `${Math.round(stats.reply_rate)}%` : (stats?.repliesReceived ? `${stats.repliesReceived}` : '—'), icon: '↩' },
    { label: 'Meetings Booked', value: stats?.meetings_booked || stats?.meetingsBooked || 0, icon: '📅' },
    { label: 'Hot Leads', value: stats?.hot_leads || 0, icon: '🔥' },
  ];

  return (
    <div className="p-3">
      <div className="grid grid-cols-2 gap-2 mb-4">
        {cards.map(({ label, value, icon }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-3">
            <div className="text-lg mb-0.5">{icon}</div>
            <div className="text-xl font-bold text-slate-800">{value}</div>
            <div className="text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Funnel */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pipeline</h3>
        {[
          { label: 'Prospected', value: stats?.total_prospects || 0, color: 'bg-sky-400' },
          { label: 'Contacted', value: stats?.contacted || 0, color: 'bg-blue-400' },
          { label: 'Replied', value: stats?.replied || 0, color: 'bg-yellow-400' },
          { label: 'Interested', value: stats?.interested || 0, color: 'bg-orange-400' },
          { label: 'Meeting Booked', value: stats?.meeting_booked || stats?.meetingsBooked || 0, color: 'bg-green-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-slate-500 w-24 flex-shrink-0">{label}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-2">
              <div className={`${color} h-2 rounded-full`} style={{ width: `${Math.min(100, value)}%`, minWidth: value > 0 ? '4px' : 0 }} />
            </div>
            <span className="text-xs font-medium text-slate-700 w-6 text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Shared Components ─────────────────────────────────────────────────────────

function Avatar({ name, size = 'md' }) {
  const initials = (name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const sizes = { xs: 'w-5 h-5 text-xs', sm: 'w-6 h-6 text-xs', md: 'w-7 h-7 text-xs' };
  return (
    <div className={`${sizes[size]} rounded-full bg-slate-200 flex items-center justify-center font-semibold text-slate-600 flex-shrink-0`}>
      {initials}
    </div>
  );
}

function ScorePill({ score, className = '' }) {
  const color = score >= 80 ? 'bg-red-100 text-red-600' : score >= 50 ? 'bg-orange-100 text-orange-600' : 'bg-sky-100 text-sky-600';
  return <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${color} ${className}`}>{score}</span>;
}

function InfoRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-400 w-16 flex-shrink-0">{label}</span>
      <span className="text-slate-700 flex-1 truncate">{value}</span>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="py-10 text-center px-4">
      <div className="text-2xl mb-2">🔍</div>
      <p className="text-xs text-slate-400">{message}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
  );
}
