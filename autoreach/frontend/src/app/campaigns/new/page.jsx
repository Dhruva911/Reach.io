'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';

export default function NewCampaignPage() {
  const router = useRouter();
  const [sequences, setSequences] = useState([]);
  const [form, setForm] = useState({
    name: '', description: '', sequence_id: '', daily_limit_email: 50,
    daily_limit_linkedin: 25, daily_limit_whatsapp: 30,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getSequences().then((res) => setSequences(res.sequences || [])).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createCampaign(form);
      router.push(`/campaigns/${res.campaign?.id || res.id}`);
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  }

  function update(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  return (
    <AppLayout title="New Campaign">
      <div className="max-w-xl">
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Campaign Name">
              <input
                type="text" value={form.name} onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Outreach to SaaS Founders Q1"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                required
              />
            </Field>

            <Field label="Description (optional)">
              <textarea
                value={form.description} onChange={(e) => update('description', e.target.value)}
                placeholder="What is this campaign targeting?"
                rows={2}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
              />
            </Field>

            <Field label="Sequence" hint="The follow-up sequence to use for this campaign">
              <select
                value={form.sequence_id} onChange={(e) => update('sequence_id', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="">No sequence (manual outreach)</option>
                {sequences.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.steps?.length || 0} steps)</option>
                ))}
              </select>
              {sequences.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  <a href="/sequences" className="text-sky-500 hover:underline">Create a sequence first →</a>
                </p>
              )}
            </Field>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Daily Send Limits</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '📧 Email', key: 'daily_limit_email', max: 200 },
                  { label: '💼 LinkedIn', key: 'daily_limit_linkedin', max: 50 },
                  { label: '💬 WhatsApp', key: 'daily_limit_whatsapp', max: 100 },
                ].map(({ label, key, max }) => (
                  <div key={key} className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="text-xs text-slate-500 mb-1">{label}</div>
                    <input
                      type="number" min="0" max={max} value={form[key]}
                      onChange={(e) => update(key, parseInt(e.target.value))}
                      className="w-full text-center font-semibold border-0 bg-transparent text-slate-800 focus:outline-none text-lg"
                    />
                    <div className="text-xs text-slate-400">per day</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => router.back()} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                {loading ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}
