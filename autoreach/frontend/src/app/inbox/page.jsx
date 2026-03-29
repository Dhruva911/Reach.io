'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';

const TABS = ['all', 'review', 'replied'];

export default function InboxPage() {
  const [tab, setTab] = useState('all');
  const [messages, setMessages] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getInbox().catch(() => ({ messages: [] })),
      api.getReviewQueue().catch(() => ({ messages: [] })),
    ]).then(([inbox, review]) => {
      setMessages(inbox.messages || []);
      setReviewQueue(review.messages || []);
      setLoading(false);
    });
  }, []);

  async function handleApprove(id) {
    await api.approveMessage(id).catch(() => {});
    setReviewQueue((q) => q.filter((m) => m.id !== id));
  }

  async function handleReject(id) {
    await api.rejectMessage(id).catch(() => {});
    setReviewQueue((q) => q.filter((m) => m.id !== id));
  }

  const displayMessages = tab === 'review' ? reviewQueue : messages.filter((m) => tab === 'replied' ? m.direction === 'inbound' : true);

  return (
    <AppLayout title="Inbox">
      <div className="flex gap-4 h-full">
        {/* Message List */}
        <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-100 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${
                  tab === t ? 'text-sky-600 border-b-2 border-sky-500' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {t === 'review' ? `Review (${reviewQueue.length})` : t}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : displayMessages.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                {tab === 'review' ? 'No messages awaiting review' : 'No messages yet'}
              </div>
            ) : (
              displayMessages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => setSelected(msg)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selected?.id === msg.id ? 'bg-sky-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-sm text-slate-800 truncate">
                      {msg.prospect_name || msg.to_email || 'Unknown'}
                    </span>
                    <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                      {msg.created_at ? new Date(msg.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{msg.subject || msg.content?.slice(0, 60) || 'No subject'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${msg.channel === 'email' ? 'bg-blue-50 text-blue-600' : msg.channel === 'linkedin' ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-500'}`}>
                      {msg.channel}
                    </span>
                    {msg.status === 'pending_approval' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-600">Review</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <div className="text-4xl mb-2">📬</div>
                <p>Select a message to view</p>
              </div>
            </div>
          ) : (
            <MessageDetail
              message={selected}
              onApprove={() => handleApprove(selected.id)}
              onReject={() => handleReject(selected.id)}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function MessageDetail({ message, onApprove, onReject }) {
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content || '');

  async function handleEditAndSend() {
    await api.editAndSend(message.id, editedContent).catch(() => {});
    setEditMode(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">{message.subject || 'Message'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              To: {message.to_email || message.prospect_name} · via {message.channel} · {message.created_at ? new Date(message.created_at).toLocaleString() : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {message.ai_score && (
              <span className={`text-sm font-bold px-2 py-1 rounded ${message.ai_score >= 80 ? 'bg-red-100 text-red-600' : message.ai_score >= 50 ? 'bg-orange-100 text-orange-600' : 'bg-sky-100 text-sky-600'}`}>
                Score: {message.ai_score}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {editMode ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full min-h-48 border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        ) : (
          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{message.content || message.body || 'No content'}</div>
        )}

        {message.ai_metadata?.recommended_action && (
          <div className="mt-4 p-3 bg-sky-50 rounded-xl">
            <div className="text-xs font-semibold text-sky-700 mb-1">AI Recommendation</div>
            <p className="text-xs text-sky-600">{message.ai_metadata.recommended_action}</p>
          </div>
        )}
      </div>

      {message.status === 'pending_approval' && (
        <div className="px-5 py-3 border-t border-slate-100 flex gap-2 justify-end">
          <button onClick={() => setEditMode((e) => !e)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm hover:bg-slate-50">
            {editMode ? 'Cancel' : '✏️ Edit'}
          </button>
          <button onClick={onReject} className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm hover:bg-red-100 font-medium">
            ✕ Reject
          </button>
          {editMode ? (
            <button onClick={handleEditAndSend} className="px-4 py-2 rounded-xl bg-sky-500 text-white text-sm hover:bg-sky-600 font-semibold">
              Send Edited
            </button>
          ) : (
            <button onClick={onApprove} className="px-4 py-2 rounded-xl bg-sky-500 text-white text-sm hover:bg-sky-600 font-semibold">
              ✓ Approve & Send
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return <div className="w-6 h-6 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />;
}
