'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';

const STAT_CONFIG = [
  { key: 'total_prospects', label: 'Total Prospects', icon: '👥', color: 'sky' },
  { key: 'active_campaigns', label: 'Active Campaigns', icon: '🚀', color: 'purple' },
  { key: 'messages_sent', label: 'Messages Sent', icon: '📧', color: 'blue' },
  { key: 'reply_rate', label: 'Reply Rate', icon: '↩', color: 'orange', format: (v) => `${Math.round(v || 0)}%` },
  { key: 'meetings_booked', label: 'Meetings Booked', icon: '📅', color: 'green' },
  { key: 'hot_leads', label: 'Hot Leads', icon: '🔥', color: 'red' },
];

const COLOR_MAP = {
  sky: 'bg-sky-50 text-sky-700 border-sky-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  orange: 'bg-orange-50 text-orange-700 border-orange-100',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  red: 'bg-red-50 text-red-700 border-red-100',
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentProspects, setRecentProspects] = useState([]);
  const [channels, setChannels] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getOverview().catch(() => null),
      api.getProspects({ limit: 5, sort: 'created_at', order: 'desc' }).catch(() => null),
      api.getChannels().catch(() => null),
    ]).then(([overview, prospects, ch]) => {
      if (overview) setStats(overview.stats || overview);
      if (prospects) setRecentProspects(prospects.prospects || []);
      if (ch) setChannels(ch.channels || ch);
      setLoading(false);
    });
  }, []);

  const PIPELINE = [
    { label: 'Prospected', key: 'total_prospects', color: 'bg-sky-400' },
    { label: 'Contacted', key: 'contacted', color: 'bg-blue-400' },
    { label: 'Replied', key: 'replied', color: 'bg-yellow-400' },
    { label: 'Interested', key: 'interested', color: 'bg-orange-400' },
    { label: 'Meeting Booked', key: 'meetings_booked', color: 'bg-green-400' },
  ];

  const maxPipeline = stats ? Math.max(stats.total_prospects || 1, 1) : 1;

  return (
    <AppLayout title="Dashboard">
      {loading ? (
        <div className="flex items-center justify-center py-20"><LoadingSpinner /></div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {STAT_CONFIG.map(({ key, label, icon, color, format }) => {
              const value = stats?.[key] ?? 0;
              const display = format ? format(value) : value;
              return (
                <div key={key} className={`border rounded-2xl p-4 ${COLOR_MAP[color]}`}>
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="text-2xl font-bold">{display}</div>
                  <div className="text-xs mt-0.5 opacity-75">{label}</div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pipeline Funnel */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">Pipeline Funnel</h2>
              <div className="space-y-3">
                {PIPELINE.map(({ label, key, color }) => {
                  const value = stats?.[key] ?? 0;
                  const pct = Math.min(100, Math.round((value / maxPipeline) * 100));
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-sm text-slate-500 w-28 flex-shrink-0">{label}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-3">
                        <div className={`${color} h-3 rounded-full transition-all`} style={{ width: `${pct}%`, minWidth: value > 0 ? '8px' : 0 }} />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 w-8 text-right">{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Channel Breakdown */}
            {channels && (
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <h2 className="font-semibold text-slate-800 mb-4">Channel Performance</h2>
                <div className="space-y-3">
                  {Object.entries(channels).map(([channel, data]) => (
                    <div key={channel} className="p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-700 capitalize">{channel}</span>
                        <span className="text-xs text-slate-400">{data.reply_rate ? `${Math.round(data.reply_rate)}% reply` : ''}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-slate-400">
                        <span>Sent: {data.sent || 0}</span>
                        <span>Opens: {data.opens || 0}</span>
                        <span>Replies: {data.replies || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Prospects */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Recently Added Prospects</h2>
              <a href="/prospects" className="text-sm text-sky-500 hover:text-sky-600 font-medium">View all →</a>
            </div>
            {recentProspects.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-sm">No prospects yet. Install the Chrome extension and start prospecting on LinkedIn!</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 font-medium border-b border-slate-100">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Company</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Score</th>
                      <th className="pb-2">Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentProspects.map((p) => (
                      <ProspectRow key={p.id} prospect={p} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function ProspectRow({ prospect }) {
  const STATUS_COLORS = {
    new: 'bg-slate-100 text-slate-600', contacted: 'bg-blue-100 text-blue-700',
    replied: 'bg-yellow-100 text-yellow-700', interested: 'bg-orange-100 text-orange-700',
    meeting_booked: 'bg-green-100 text-green-700', closed_won: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <tr className="hover:bg-slate-50">
      <td className="py-2.5">
        <a href={`/prospects/${prospect.id}`} className="font-medium text-slate-800 hover:text-sky-600">
          {prospect.full_name || 'Unknown'}
        </a>
        {prospect.title && <div className="text-xs text-slate-400">{prospect.title}</div>}
      </td>
      <td className="py-2.5 text-slate-600">{prospect.company_name || '—'}</td>
      <td className="py-2.5">
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[prospect.status] || STATUS_COLORS.new}`}>
          {prospect.status || 'new'}
        </span>
      </td>
      <td className="py-2.5">
        {prospect.lead_score != null && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            prospect.lead_score >= 80 ? 'bg-red-100 text-red-600' :
            prospect.lead_score >= 50 ? 'bg-orange-100 text-orange-600' :
            'bg-sky-100 text-sky-600'
          }`}>
            {prospect.lead_score}
          </span>
        )}
      </td>
      <td className="py-2.5 text-slate-400 text-xs">
        {prospect.created_at ? new Date(prospect.created_at).toLocaleDateString() : '—'}
      </td>
    </tr>
  );
}

function LoadingSpinner() {
  return <div className="w-8 h-8 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />;
}
