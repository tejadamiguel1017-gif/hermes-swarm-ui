import { useEffect, useState, useCallback } from 'react';
import type { AgentProfile } from '../types';

interface Props {
  profile: AgentProfile;
  onClose: () => void;
}

export function ProfileEditor({ profile, onClose }: Props) {
  const [soul, setSoul] = useState('');
  const [config, setConfig] = useState('');
  const [soulDirty, setSoulDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tab, setTab] = useState<'soul' | 'config'>('soul');

  useEffect(() => {
    setSoul('');
    setConfig('');
    setSoulDirty(false);
    setSaveMsg(null);

    fetch(`/api/profiles/${profile.id}/soul`)
      .then(r => r.json())
      .then(({ soul }: { soul: string }) => setSoul(soul));

    fetch(`/api/profiles/${profile.id}/config`)
      .then(r => r.json())
      .then(({ config }: { config: string }) => setConfig(config));
  }, [profile.id]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/profiles/${profile.id}/soul`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soul }),
      });
      const data = await res.json();
      if (data.ok) {
        setSoulDirty(false);
        setSaveMsg({ ok: true, text: 'Saved' });
      } else {
        setSaveMsg({ ok: false, text: data.error ?? 'Save failed' });
      }
    } catch {
      setSaveMsg({ ok: false, text: 'Network error' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }, [profile.id, soul]);

  return (
    <div className="w-96 flex-shrink-0 bg-gray-850 border-l border-gray-700 flex flex-col h-full" style={{ backgroundColor: '#111827' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div>
          <div className="text-sm font-semibold text-gray-100">{profile.name}</div>
          <div className="text-xs text-gray-400 capitalize">{profile.status}</div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-lg leading-none">✕</button>
      </div>

      {/* Auth URL alert */}
      {profile.authUrl && (
        <div className="mx-3 mt-3 p-3 bg-amber-900 border border-amber-700 rounded-lg text-xs text-amber-200">
          <div className="font-semibold mb-1">Authorization required</div>
          <div className="mb-2">This agent needs OAuth authorization to connect to its tools.</div>
          <a
            href={profile.authUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-amber-100 break-all"
          >
            Open authorization URL ↗
          </a>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-700 px-3 pt-2">
        {(['soul', 'config'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors capitalize ${
              tab === t
                ? 'text-violet-300 border-b-2 border-violet-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t === 'soul' ? 'SOUL.md' : 'config.yaml'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0 p-3">
        {tab === 'soul' ? (
          <>
            <textarea
              value={soul}
              onChange={e => { setSoul(e.target.value); setSoulDirty(true); }}
              className="flex-1 resize-none bg-gray-800 text-gray-200 text-xs font-mono rounded-lg p-3 outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="No SOUL.md found for this profile."
              spellCheck={false}
            />
            <div className="flex items-center justify-between mt-2">
              {saveMsg ? (
                <span className={`text-xs ${saveMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{saveMsg.text}</span>
              ) : (
                <span className="text-xs text-gray-500">{soulDirty ? 'Unsaved changes' : 'SOUL.md'}</span>
              )}
              <button
                onClick={handleSave}
                disabled={!soulDirty || saving}
                className="px-3 py-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs rounded transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        ) : (
          <pre className="flex-1 overflow-auto bg-gray-800 text-gray-300 text-xs font-mono rounded-lg p-3">
            {config || 'No config.yaml found.'}
          </pre>
        )}
      </div>
    </div>
  );
}
