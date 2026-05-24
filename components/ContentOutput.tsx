import { useState } from 'react';
import { Copy, Download, Check, Edit3, Save, X, ExternalLink, Loader, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Output, Channel, SocialProviderStatus, SupportedSocialProvider } from '@/types';

const PUBLISHABLE_CHANNELS = new Set<Channel>(['twitter', 'linkedin']);

function channelProvider(channel: Channel): SupportedSocialProvider | null {
  return PUBLISHABLE_CHANNELS.has(channel) ? (channel as SupportedSocialProvider) : null;
}

interface ChannelMeta {
  label: string;
  color: string;
  bgColor: string;
  accentBg: string;
}

const CHANNEL_META: Record<string, ChannelMeta> = {
  twitter:   { label: 'Twitter',   color: '#1DA1F2', bgColor: '#EBF6FD', accentBg: '#DBEAFE' },
  linkedin:  { label: 'LinkedIn',  color: '#0A66C2', bgColor: '#E8F1FA', accentBg: '#DBEAFE' },
  instagram: { label: 'Instagram', color: '#E1306C', bgColor: '#FDEEF3', accentBg: '#FCE7F3' },
  email:     { label: 'Email',     color: '#D97706', bgColor: '#FEF3C7', accentBg: '#FEF3C7' },
  facebook:  { label: 'Facebook',  color: '#1877F2', bgColor: '#EBF2FD', accentBg: '#DBEAFE' },
};

type TabId = 'all' | Channel;

interface ContentOutputProps {
  outputs: Output[];
  onEdit?: (outputId: string, newContent: string) => Promise<void>;
  socialProviders?: SocialProviderStatus[];
  onPublish?: (output: Output) => Promise<void>;
  publishingOutputId?: string | null;
  connectReturnTo?: string;
}

export default function ContentOutput({
  outputs,
  onEdit,
  socialProviders = [],
  onPublish,
  publishingOutputId = null,
  connectReturnTo = '/settings',
}: ContentOutputProps) {
  const [activeTab, setActiveTab]   = useState<TabId>('all');
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editValue, setEditValue]   = useState('');
  const [copied, setCopied]         = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);

  const visibleOutputs =
    activeTab === 'all'
      ? outputs
      : outputs.filter((o) => o.channel === activeTab);

  // Build tabs
  const channelCounts: Record<string, number> = {};
  for (const o of outputs) {
    channelCounts[o.channel] = (channelCounts[o.channel] ?? 0) + 1;
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(null), 2000);
  }

  function downloadAsText(content: string, channel: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${channel}-content.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }

  function startEditing(output: Output) {
    setEditingId(output.id);
    setEditValue(output.content);
  }

  async function saveEdit(output: Output) {
    if (!onEdit) { setEditingId(null); return; }
    if (editValue.trim() === output.content) { setEditingId(null); return; }
    setSaving(true);
    try {
      await onEdit(output.id, editValue.trim());
      toast.success('Changes saved!');
      setEditingId(null);
    } catch {
      toast.error('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (!outputs.length) return null;

  return (
    <div className="flex flex-col h-full animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Generated Results
        </h2>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: 'var(--brand-bg)', color: 'var(--brand-500)', border: '1px solid var(--brand-border)' }}
        >
          {outputs.length} output{outputs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl mb-4 shrink-0 overflow-x-auto"
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
      >
        {/* All tab */}
        <button
          onClick={() => setActiveTab('all')}
          className={`tab text-sm ${activeTab === 'all' ? 'active' : ''}`}
        >
          All
          <span
            className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold"
            style={{
              background: activeTab === 'all' ? 'var(--brand-500)' : 'var(--border-mid)',
              color: activeTab === 'all' ? 'white' : 'var(--text-muted)',
            }}
          >
            {outputs.length}
          </span>
        </button>

        {/* Per-channel tabs */}
        {Object.entries(channelCounts).map(([ch, count]) => {
          const meta   = CHANNEL_META[ch] ?? { label: ch, color: '#999', bgColor: '#eee', accentBg: '#eee' };
          const isActive = activeTab === ch;
          return (
            <button
              key={ch}
              onClick={() => setActiveTab(ch as TabId)}
              className={`tab text-sm ${isActive ? 'active' : ''}`}
              style={isActive ? { color: meta.color, background: meta.bgColor } : {}}
            >
              {meta.label}
              <span
                className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold"
                style={{
                  background: isActive ? meta.color : 'var(--border-mid)',
                  color: 'white',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results scroll area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
        {visibleOutputs.map((output, idx) => {
          const meta      = CHANNEL_META[output.channel] ?? { label: output.channel, color: '#999', bgColor: '#eee', accentBg: '#eee' };
          const isEditing = editingId === output.id;
          const isCopied  = copied === output.id;
          const providerKey = channelProvider(output.channel);
          const providerStatus = providerKey
            ? socialProviders.find((p) => p.provider === providerKey)
            : undefined;
          const isPublishing = publishingOutputId === output.id;
          const connectHref = providerKey
            ? `/api/social/connect/${providerKey}?return_to=${encodeURIComponent(connectReturnTo)}`
            : null;

          return (
            <div
              key={output.id}
              className={`result-card animate-slide-in ${idx === 0 ? 'highlighted' : ''}`}
              style={{ animationDelay: `${idx * 40}ms`, borderLeftWidth: 3, borderLeftColor: meta.color }}
            >
              {/* Card header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: meta.bgColor, color: meta.color }}
                  >
                    {meta.label} Option {idx + 1}
                  </span>
                  {output.edited && (
                    <span
                      className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--brand-bg)', color: 'var(--brand-500)' }}
                    >
                      Edited
                    </span>
                  )}
                </div>
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  {output.tokens_used} tokens
                </span>
              </div>

              {/* Content */}
              {isEditing ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="textarea text-sm leading-relaxed h-36"
                  autoFocus
                />
              ) : (
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {output.content}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setEditingId(null)}
                      className="btn-outline gap-1"
                      disabled={saving}
                    >
                      <X size={12} /> Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(output)}
                      className="btn-primary text-xs py-1.5 px-3"
                      disabled={saving}
                    >
                      <Save size={12} />
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => copyToClipboard(output.content, output.id)}
                      className="btn-outline"
                    >
                      {isCopied ? (
                        <><Check size={12} style={{ color: 'var(--brand-500)' }} /> Copied</>
                      ) : (
                        <><Copy size={12} /> Copy</>
                      )}
                    </button>
                    <button
                      onClick={() => downloadAsText(output.content, output.channel)}
                      className="btn-outline"
                    >
                      <Download size={12} /> Download
                    </button>
                    {onEdit && (
                      <button onClick={() => startEditing(output)} className="btn-outline">
                        <Edit3 size={12} /> Edit
                      </button>
                    )}
                    {providerKey && onPublish && providerStatus?.connected && (
                      <button
                        onClick={() => onPublish(output)}
                        className="btn-primary text-xs py-1.5 px-3"
                        disabled={isPublishing}
                      >
                        {isPublishing ? (
                          <><Loader size={12} className="animate-spin" /> Publishing…</>
                        ) : (
                          <><Send size={12} /> Publish</>
                        )}
                      </button>
                    )}
                    {providerKey && providerStatus?.configured && !providerStatus.connected && connectHref && (
                      <a href={connectHref} className="btn-outline">
                        <ExternalLink size={12} /> Connect {providerStatus.label}
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
