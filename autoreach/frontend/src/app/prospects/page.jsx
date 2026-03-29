'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';

const STATUSES = ['new', 'enriched', 'contacted', 'replied', 'interested', 'qualified', 'meeting_booked', 'closed_won', 'closed_lost'];

const STATUS_COLORS = {
  new: 'bg-slate-100 text-slate-600', enriched: 'bg-sky-50 text-sky-600',
  contacted: 'bg-blue-100 text-blue-700', replied: 'bg-yellow-100 text-yellow-700',
  interested: 'bg-orange-100 text-orange-700', qualified: 'bg-purple-100 text-purple-700',
  meeting_booked: 'bg-green-100 text-green-700', closed_won: 'bg-emerald-100 text-emerald-700',
  closed_lost: 'bg-red-100 text-red-600',
};

export default function ProspectsPage() {
  const [prospects, setProspects] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.getProspects(params);
      setProspects(res.prospects || []);
      setTotal(res.total || res.prospects?.length || 0);
    } catch {}
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(id, newStatus) {
    try {
      await api.updateProspect(id, { status: newStatus });
      setProspects((ps) => ps.map((p) => p.id === id ? { ...p, status: newStatus } : p));
    } catch {}
  }

  async function handleDelete(ids) {
    if (!confirm(`Delete ${ids.length} prospect(s)?`)) return;
    for (const id of ids) {
      await api.deleteProspect(id).catch(() => {});
    }
    setSelected([]);
    load();
  }

  function toggleSelect(id) {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  function toggleAll() {
    setSelected(selected.length === prospects.length ? [] : prospects.map((p) => p.id));
  }

  return (
    <AppLayout title="Prospects">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text" placeholder="Search prospects..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 w-60"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {selected.length > 0 && (
            <div className="flex gap-2 ml-auto">
              <span className="text-sm text-slate-500">{selected.length} selected</span>
              <button onClick={() => handleDelete(selected)} className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                Delete
              </button>
            </div>
          )}
          <span className="text-sm text-slate-400 ml-auto">{total} prospects</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
            </div>
          ) : prospects.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="text-3xl mb-2">🔍</div>
              <p>No prospects found. Use the Chrome extension to capture from LinkedIn!</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left text-xs text-slate-400 font-medium">
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox" checked={selected.length === prospects.length && prospects.length > 0} onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Title / Company</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {prospects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/prospects/${p.id}`} className="font-medium text-slate-800 hover:text-sky-600 block">
                        {p.full_name || 'Unknown'}
                      </a>
                      {p.email && <div className="text-xs text-slate-400">{p.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{p.title || '—'}</div>
                      {p.company_name && <div className="text-xs text-slate-400">{p.company_name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.status || 'new'}
                        onChange={(e) => handleStatusChange(p.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${STATUS_COLORS[p.status] || STATUS_COLORS.new}`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {p.lead_score != null && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          p.lead_score >= 80 ? 'bg-red-100 text-red-600' :
                          p.lead_score >= 50 ? 'bg-orange-100 text-orange-600' :
                          'bg-sky-100 text-sky-600'
                        }`}>
                          {p.lead_score}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400 capitalize">{p.source || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Page {page} of {Math.ceil(total / PAGE_SIZE)}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-slate-50">←</button>
              <button disabled={page * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-slate-50">→</button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
