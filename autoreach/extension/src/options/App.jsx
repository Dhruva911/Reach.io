import React, { useState, useEffect } from 'react';

const DEFAULTS = {
  backendUrl: 'http://localhost:3001',
  geminiApiKey: '',
  claudeApiKey: '',
  openaiApiKey: '',
  aiProvider: 'gemini',
  icpContext: '',
  calendlyUrl: '',
  linkedinDailyLimit: 25,
  emailTrackingEnabled: true,
  autoEnrichEnabled: true,
};

export default function OptionsApp() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState('ai'); // ai | icp | backend | preferences

  useEffect(() => {
    chrome.storage.local.get(Object.keys(DEFAULTS), (result) => {
      setSettings({ ...DEFAULTS, ...result });
    });
  }, []);

  function update(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function save() {
    chrome.storage.local.set(settings, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg">Reach.io Settings</h1>
            <p className="text-xs text-slate-400">Configure your B2B prospecting extension</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 flex gap-6">
        {/* Sidebar nav */}
        <div className="w-40 flex-shrink-0">
          <nav className="space-y-1">
            {[
              { id: 'ai', label: '🤖 AI Provider', desc: 'Gemini / Claude / OpenAI' },
              { id: 'icp', label: '🎯 ICP Context', desc: 'Your pitch & target' },
              { id: 'backend', label: '⚙️ Backend', desc: 'API connection' },
              { id: 'preferences', label: '🔧 Preferences', desc: 'Limits & tracking' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  section === id ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
            {section === 'ai' && <AISection settings={settings} update={update} />}
            {section === 'icp' && <ICPSection settings={settings} update={update} />}
            {section === 'backend' && <BackendSection settings={settings} update={update} />}
            {section === 'preferences' && <PreferencesSection settings={settings} update={update} />}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button onClick={save} className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-colors">
                Save Settings
              </button>
              {saved && <span className="text-sm text-emerald-600 font-medium">✓ Saved!</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, desc }) {
  return (
    <div className="mb-4">
      <h2 className="font-semibold text-slate-800">{title}</h2>
      {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
    </div>
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

function Input({ value, onChange, type = 'text', placeholder }) {
  return (
    <input
      type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
    />
  );
}

function AISection({ settings, update }) {
  return (
    <div>
      <SectionTitle title="AI Provider" desc="Choose your AI for message generation. Gemini is free with 1,500 requests/day." />
      <div className="space-y-4">
        <Field label="Default Provider">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'gemini', label: 'Google Gemini', badge: 'FREE', color: 'border-green-400 bg-green-50' },
              { value: 'claude', label: 'Claude', badge: 'API KEY', color: 'border-purple-300 bg-purple-50' },
              { value: 'openai', label: 'OpenAI', badge: 'API KEY', color: 'border-sky-300 bg-sky-50' },
            ].map(({ value, label, badge, color }) => (
              <button
                key={value}
                onClick={() => update('aiProvider', value)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  settings.aiProvider === value ? color : 'border-slate-200 bg-white'
                }`}
              >
                <div className="font-medium text-sm text-slate-800">{label}</div>
                <div className={`text-xs font-bold mt-0.5 ${settings.aiProvider === value ? 'text-green-600' : 'text-slate-400'}`}>{badge}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="Gemini API Key"
          hint="Free at aistudio.google.com/app/apikey — no credit card required"
        >
          <div className="flex gap-2">
            <Input
              type="password" value={settings.geminiApiKey}
              onChange={(v) => update('geminiApiKey', v)}
              placeholder="AIza..."
            />
            <a
              href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
              className="px-3 py-2 rounded-lg bg-sky-50 text-sky-600 text-sm font-medium hover:bg-sky-100 whitespace-nowrap"
            >
              Get Free Key →
            </a>
          </div>
        </Field>

        <Field label="Claude API Key (optional)" hint="Uses claude-haiku-4-5 (cheapest). Leave blank to use Gemini.">
          <Input type="password" value={settings.claudeApiKey} onChange={(v) => update('claudeApiKey', v)} placeholder="sk-ant-..." />
        </Field>

        <Field label="OpenAI API Key (optional)" hint="Uses gpt-4o-mini. Leave blank to use Gemini.">
          <Input type="password" value={settings.openaiApiKey} onChange={(v) => update('openaiApiKey', v)} placeholder="sk-..." />
        </Field>
      </div>
    </div>
  );
}

function ICPSection({ settings, update }) {
  return (
    <div>
      <SectionTitle title="ICP Context" desc="This is the context injected into every AI prompt. Describe who you are and what you're selling." />
      <div className="space-y-4">
        <Field label="Your Sales Context / Pitch" hint="Describe your company, product, and ideal customer. The more specific, the better the AI messages.">
          <textarea
            value={settings.icpContext || ''}
            onChange={(e) => update('icpContext', e.target.value)}
            rows={6}
            placeholder={`Example:\nWe are a private-label skincare contract manufacturer specializing in clean beauty formulations. MOQ 1,000 units. We help skincare brands launch faster with premium formulations at competitive prices.\n\nTarget: Founders and Head of Procurement at skincare brands with <$50M revenue in the US.`}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
          />
        </Field>

        <Field label="Calendly / Booking Link" hint="Added as a 'Book Meeting' button on prospect profiles">
          <Input
            value={settings.calendlyUrl}
            onChange={(v) => update('calendlyUrl', v)}
            placeholder="https://calendly.com/yourname/30min"
          />
        </Field>

        <div className="p-3 bg-sky-50 rounded-xl text-xs text-sky-700 leading-relaxed">
          <strong>Tip:</strong> Include: (1) what you sell, (2) who your ideal customer is, (3) the main pain you solve, (4) a unique differentiator. This context is used to personalize every AI-generated message.
        </div>
      </div>
    </div>
  );
}

function BackendSection({ settings, update }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${settings.backendUrl}/health`);
      const data = await res.json();
      setTestResult({ ok: true, msg: `✓ Connected — ${data.status || 'healthy'}` });
    } catch (err) {
      setTestResult({ ok: false, msg: `✗ Cannot connect — is the backend running?` });
    }
    setTesting(false);
  }

  return (
    <div>
      <SectionTitle title="Backend Connection" desc="Connect to your self-hosted Reach.io backend. Run it locally with Docker." />
      <div className="space-y-4">
        <Field label="Backend URL" hint="Default: http://localhost:3001 (local Docker). For remote: your server URL.">
          <div className="flex gap-2">
            <Input
              value={settings.backendUrl}
              onChange={(v) => update('backendUrl', v)}
              placeholder="http://localhost:3001"
            />
            <button
              onClick={testConnection}
              disabled={testing}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium whitespace-nowrap disabled:opacity-50"
            >
              {testing ? '...' : 'Test'}
            </button>
          </div>
          {testResult && (
            <p className={`text-xs mt-1.5 font-medium ${testResult.ok ? 'text-emerald-600' : 'text-red-500'}`}>
              {testResult.msg}
            </p>
          )}
        </Field>

        <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1.5">
          <p className="font-medium text-slate-700">Quick setup (2 minutes):</p>
          <code className="block bg-slate-200 rounded p-2 font-mono">cd autoreach && docker-compose up -d</code>
          <p>Then visit <a href="http://localhost:3001/health" target="_blank" rel="noreferrer" className="text-sky-500 underline">localhost:3001/health</a> to verify.</p>
        </div>
      </div>
    </div>
  );
}

function PreferencesSection({ settings, update }) {
  return (
    <div>
      <SectionTitle title="Preferences" desc="Rate limits and feature toggles" />
      <div className="space-y-4">
        <Field label="LinkedIn Daily Connection Limit" hint="Max new connection requests per day. LinkedIn recommends ≤25 to avoid restrictions.">
          <div className="flex items-center gap-3">
            <input
              type="range" min="5" max="50" step="5" value={settings.linkedinDailyLimit}
              onChange={(e) => update('linkedinDailyLimit', parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-semibold text-slate-700 w-8">{settings.linkedinDailyLimit}</span>
          </div>
        </Field>

        <Toggle
          label="Email Open Tracking"
          desc="Track when prospects open your Gmail emails"
          value={settings.emailTrackingEnabled}
          onChange={(v) => update('emailTrackingEnabled', v)}
        />

        <Toggle
          label="Auto-Enrich Prospects"
          desc="Automatically find emails when adding prospects from LinkedIn"
          value={settings.autoEnrichEnabled}
          onChange={(v) => update('autoEnrichEnabled', v)}
        />
      </div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <div className="text-xs text-slate-400">{desc}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-sky-500' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
