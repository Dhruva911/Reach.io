'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clearToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '⚡' },
  { href: '/prospects', label: 'Prospects', icon: '👥' },
  { href: '/campaigns', label: 'Campaigns', icon: '🚀' },
  { href: '/sequences', label: 'Sequences', icon: '🔄' },
  { href: '/inbox', label: 'Inbox', icon: '📬' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <aside className="w-56 bg-white border-r border-slate-100 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
          </svg>
        </div>
        <div>
          <div className="font-bold text-slate-800 text-sm">Reach.io</div>
          <div className="text-xs text-slate-400">B2B Platform</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href} href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Extension CTA */}
      <div className="mx-3 mb-3 p-3 bg-sky-50 rounded-xl">
        <div className="text-xs font-semibold text-sky-700 mb-1">Chrome Extension</div>
        <p className="text-xs text-sky-600 mb-2">Prospect directly on LinkedIn & Gmail</p>
        <a
          href="https://chrome.google.com/webstore" target="_blank" rel="noreferrer"
          className="block text-center py-1.5 rounded-lg bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 transition-colors"
        >
          Install Extension →
        </a>
      </div>

      {/* Logout */}
      <div className="border-t border-slate-100 px-2 py-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}
