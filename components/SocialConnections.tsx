import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, ExternalLink, Loader, Link2, Trash2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { SocialProviderStatus, SupportedSocialProvider } from '@/types';

interface SocialConnectionsProps {
  refreshSignal?: number;
  onChange?: (providers: SocialProviderStatus[]) => void;
}

export default function SocialConnections({ refreshSignal = 0, onChange }: SocialConnectionsProps) {
  const [providers, setProviders] = useState<SocialProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<SupportedSocialProvider | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/social/status');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load connected apps.');
      setProviders(data.providers);
      onChange?.(data.providers);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load connected apps.');
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus, refreshSignal]);

  async function disconnect(provider: SupportedSocialProvider) {
    setDisconnecting(provider);
    try {
      const res = await fetch(`/api/social/disconnect/${provider}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disconnect account.');
      toast.success('Account disconnected.');
      await loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect account.');
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <section className="card mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-slate-100">Connected apps</h2>
        {loading && <Loader size={16} className="text-cyan-400 animate-spin" />}
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {providers.map((provider) => {
          const connectable = provider.provider === 'linkedin' || provider.provider === 'twitter';
          const providerKey = provider.provider as SupportedSocialProvider;
          const accountName = provider.username
            ? provider.provider === 'twitter'
              ? `@${provider.username}`
              : provider.username
            : provider.display_name;

          return (
            <div
              key={provider.provider}
              className="p-4 rounded-xl border border-slate-700 bg-slate-800/30 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm text-slate-100">{provider.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {provider.connected ? accountName || 'Connected' : provider.configured ? 'Ready' : 'Not configured'}
                  </p>
                </div>
                {provider.connected ? (
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                ) : provider.configured ? (
                  <Link2 size={16} className="text-cyan-400 shrink-0" />
                ) : (
                  <XCircle size={16} className="text-slate-600 shrink-0" />
                )}
              </div>

              {provider.connected && connectable ? (
                <button
                  type="button"
                  onClick={() => disconnect(providerKey)}
                  disabled={disconnecting === providerKey}
                  className="btn-ghost w-full text-xs py-2"
                >
                  {disconnecting === providerKey ? <Loader size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Disconnect
                </button>
              ) : connectable && provider.configured ? (
                <a href={`/api/social/connect/${provider.provider}`} className="btn-secondary w-full text-xs py-2">
                  <ExternalLink size={13} />
                  Connect
                </a>
              ) : (
                <button type="button" disabled className="btn-secondary w-full text-xs py-2">
                  <XCircle size={13} />
                  Unavailable
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

