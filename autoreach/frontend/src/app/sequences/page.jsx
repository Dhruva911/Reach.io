'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';

const CHANNEL_ICONS = { email: '📧', linkedin: '💼', whatsapp: '💬' };
const CHANNEL_COLORS = { email: 'bg-blue-50 border-blue-200 text-blue-700', linkedin: 'bg-sky-50 border-sky-200 text-sky-700', whatsapp: 'bg-green-50 border-green-200 text-green-700' };

export default function SequencesPage() {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newSeq, setNewSeq] = useState({ name: '', steps: [] });

  useEffect(() => {
    api.getSequences()
      .then((res) => setSequences(res.sequences || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function addStep(channel = 'email') {
    setNewSeq((s) => ({
      ...s,
      steps: [...s.steps, {
        id: Date.now(),
        day: s.steps.length === 0 ? 1 : (s.steps[s.steps.length - 1].day + 3),
        channel,
        subject: channel === 'email' ? 'Follow up' : '',
        template: '',
      }],
    }));
  }

  function updateStep(id, field, value) {
    setNewSeq((s) => ({
      ...s,
      steps: s.steps.map((step) => step.id === id ? { ...step, [field]: value } : step),
    }));
  }

  function removeStep(id) {
    setNewSeq((s) => ({ ...s, steps: s.steps.filter((step) => step.id !== id) }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newSeq.name || newSeq.steps.length === 0) return;
    try {
      const res = await api.createSequence(newSeq);
      setSequences((s) => [...s, res.sequence || res]);
      setCreating(false);
      setNewSeq({ name: '', steps: [] });
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <AppLayout title="Sequences">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{sequences.length} sequences</p>
          <button onClick={() => setCreating(true)} className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors">
            + New Sequence
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">New Sequence</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text" placeholder="Sequence name (e.g. Cold Outreach - SaaS Founders)"
                value={newSeq.name} onChange={(e) => setNewSeq((s) => ({ ...s, name: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                required
              />

              {/* Steps */}
              <div className="space-y-3">
                {newSeq.steps.map((step, i) => (
                  <div key={step.id} className={`border rounded-xl p-3 ${CHANNEL_COLORS[step.channel] || 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm">Step {i + 1}</span>
                      <span className="text-lg">{CHANNEL_ICONS[step.channel]}</span>
                      <select
                        value={step.channel}
                        onChange={(e) => updateStep(step.id, 'channel', e.target.value)}
                        className="text-xs border border-current rounded-lg px-2 py-0.5 bg-transparent"
                      >
                        <option value="email">Email</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-xs">Day</span>
                        <input
                          type="number" min="1" value={step.day}
                          onChange={(e) => updateStep(step.id, 'day', parseInt(e.target.value))}
                          className="w-12 text-xs border border-current rounded px-1.5 py-0.5 bg-transparent"
                        />
                        <button type="button" onClick={() => removeStep(step.id)} className="ml-2 text-xs opacity-60 hover:opacity-100">✕</button>
                      </div>
                    </div>
                    {step.channel === 'email' && (
                      <input
                        type="text" placeholder="Email subject..."
                        value={step.subject || ''}
                        onChange={(e) => updateStep(step.id, 'subject', e.target.value)}
                        className="w-full text-xs border-0 bg-transparent outline-none border-b border-current pb-1 mb-1"
                      />
                    )}
                    <textarea
                      placeholder={`Message template... (use {{first_name}}, {{company_name}} for personalization)`}
                      value={step.template || ''}
                      onChange={(e) => updateStep(step.id, 'template', e.target.value)}
                      rows={2}
                      className="w-full text-xs border-0 bg-transparent outline-none resize-none"
                    />
                  </div>
                ))}
              </div>

              {/* Add step buttons */}
              <div className="flex gap-2">
                {['email', 'linkedin', 'whatsapp'].map((ch) => (
                  <button
                    key={ch} type="button" onClick={() => addStep(ch)}
                    className="px-3 py-1.5 text-xs border border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-sky-400 hover:text-sky-600 transition-colors"
                  >
                    + {CHANNEL_ICONS[ch]} {ch}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold">Create Sequence</button>
              </div>
            </form>
          </div>
        )}

        {/* Sequences List */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : sequences.length === 0 && !creating ? (
          <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
            <div className="text-3xl mb-2">🔄</div>
            <p className="text-slate-400 mb-4">No sequences yet. Create multi-step follow-up sequences.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sequences.map((seq) => (
              <div key={seq.id} className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800">{seq.name}</h3>
                  <span className="text-xs text-slate-400">{seq.steps?.length || 0} steps</span>
                </div>
                {seq.steps?.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {seq.steps.map((step, i) => (
                      <React.Fragment key={i}>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${CHANNEL_COLORS[step.channel] || 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                          {CHANNEL_ICONS[step.channel]} Day {step.day}
                        </div>
                        {i < seq.steps.length - 1 && <span className="text-slate-300 text-xs">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Spinner() {
  return <div className="w-6 h-6 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />;
}

// Need React for Fragment
import React from 'react';
