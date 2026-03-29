'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600', active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700', completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-slate-100 text-slate-400',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCampaigns()
      .then((res) => setCampaigns(res.campaigns || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout title="Campaigns">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{campaigns.length} campaigns</p>
          <a href="/campaigns/new" className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors">
            + New Campaign
          </a>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" /></div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
            <div className="text-3xl mb-2">🚀</div>
            <p className="text-slate-400 mb-4">No campaigns yet.</p>
            <a href="/campaigns/new" className="px-5 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600">
              Create your first campaign
            </a>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((c) => (
              <a key={c.id} href={`/campaigns/${c.id}`} className="block bg-white rounded-2xl border border-slate-100 p-5 hover:border-sky-200 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{c.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{c.description || 'No description'}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>
                    {c.status}
                  </span>
                </div>
                <div className="flex gap-6 text-xs text-slate-400">
                  <StatItem icon="👥" label="Prospects" value={c.prospect_count || 0} />
                  <StatItem icon="📧" label="Sent" value={c.messages_sent || 0} />
                  <StatItem icon="↩" label="Replies" value={c.reply_count || 0} />
                  <StatItem icon="📅" label="Meetings" value={c.meetings || 0} />
                </div>
                {c.prospect_count > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-400 rounded-full"
                        style={{ width: `${Math.min(100, Math.round(((c.messages_sent || 0) / c.prospect_count) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StatItem({ icon, label, value }) {
  return (
    <div className="flex items-center gap-1">
      <span>{icon}</span>
      <span>{value}</span>
      <span className="text-slate-300">{label}</span>
    </div>
  );
}
