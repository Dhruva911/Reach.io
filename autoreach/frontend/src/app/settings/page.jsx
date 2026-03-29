'use client';
import AppLayout from '@/components/layout/AppLayout';
import Link from 'next/link';

const SETTINGS_SECTIONS = [
  { href: '/settings/icp', icon: '🎯', title: 'ICP Templates', desc: 'Define your ideal customer profile filters for prospect discovery' },
  { href: '/settings/team', icon: '👥', title: 'Team Management', desc: 'Invite team members and manage roles (admin, manager, rep)' },
];

export default function SettingsPage() {
  return (
    <AppLayout title="Settings">
      <div className="max-w-2xl space-y-4">
        <div className="grid gap-3">
          {SETTINGS_SECTIONS.map(({ href, icon, title, desc }) => (
            <Link
              key={href} href={href}
              className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-5 hover:border-sky-200 transition-colors"
            >
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl">{icon}</div>
              <div>
                <div className="font-semibold text-slate-800">{title}</div>
                <div className="text-sm text-slate-400">{desc}</div>
              </div>
              <span className="ml-auto text-slate-300">→</span>
            </Link>
          ))}
        </div>

        {/* Extension download section */}
        <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5">
          <h3 className="font-semibold text-sky-800 mb-2">Chrome Extension</h3>
          <p className="text-sm text-sky-700 mb-3">
            Install the Reach.io Chrome extension to capture prospects directly from LinkedIn and Gmail — no copy-paste needed.
          </p>
          <div className="space-y-2 text-sm text-sky-700">
            <p>✓ One-click LinkedIn profile capture</p>
            <p>✓ Bulk prospect capture from search results</p>
            <p>✓ AI email generation in Gmail compose</p>
            <p>✓ Gmail inbox overlay with prospect scores</p>
          </div>
        </div>

        {/* Backend info */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-700 mb-2">Backend Setup</h3>
          <p className="text-sm text-slate-500 mb-3">Run the backend locally with Docker:</p>
          <code className="block bg-slate-200 rounded-lg p-3 text-xs font-mono text-slate-700">
            cd autoreach && docker-compose up -d
          </code>
          <p className="text-xs text-slate-400 mt-2">
            Backend runs on port 3001. Web app proxies API calls automatically.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
