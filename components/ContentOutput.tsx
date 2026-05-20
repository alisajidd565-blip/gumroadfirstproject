import { useState, useCallback } from 'react';
import { Copy, Download, Check, Edit3 } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import type { Output, Channel } from '@/types';
import { CHANNEL_CONFIGS } from '@/types';

interface ContentOutputProps {
  outputs: Output[];
  onEdit?: (outputId: string, newContent: string) => Promise<void>;
}

export default function ContentOutput({ outputs, onEdit }: ContentOutputProps) {
  const [activeTab, setActiveTab] = useState<Channel>(
    outputs.length > 0 ? outputs[0].channel as Channel : 'twitter'
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeOutput = outputs.find((o) => o.channel === activeTab);

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(null), 2000);
  }

  function downloadAsText(content: string, channel: Channel) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
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
    if (!onEdit || editValue.trim() === output.content) {
      setEditingId(null);
      return;
    }
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
    <div className="card animate-slide-up">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">Generated Content</h3>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-slate-800 rounded-lg overflow-x-auto">
        {outputs.map((output) => {
          const config = CHANNEL_CONFIGS[output.channel as Channel];
          return (
            <button
              key={output.channel}
              onClick={() => setActiveTab(output.channel as Channel)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all',
                activeTab === output.channel
                  ? 'bg-slate-700 text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <span className={clsx('text-base', config.color)}>{config.icon}</span>
              <span>{config.label}</span>
              {output.edited && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-1" title="Edited" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active output */}
      {activeOutput && (
        <div className="space-y-3">
          {editingId === activeOutput.id ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="textarea h-64 font-mono text-sm leading-relaxed"
              autoFocus
            />
          ) : (
            <div className="relative">
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-200 bg-slate-800 rounded-lg p-4 leading-relaxed min-h-[160px] max-h-[400px] overflow-y-auto border border-slate-700">
                {activeOutput.content}
              </pre>
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{activeOutput.tokens_used} tokens</span>
              <span>·</span>
              <span>{activeOutput.model_used}</span>
              {activeOutput.edited && (
                <>
                  <span>·</span>
                  <span className="text-cyan-400">Edited</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {editingId === activeOutput.id ? (
                <>
                  <button
                    onClick={() => setEditingId(null)}
                    className="btn-ghost text-sm py-1.5 px-3"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveEdit(activeOutput)}
                    className="btn-primary text-sm py-1.5 px-4"
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </>
              ) : (
                <>
                  {onEdit && (
                    <button
                      onClick={() => startEditing(activeOutput)}
                      className="btn-ghost text-sm py-1.5 px-3"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => downloadAsText(activeOutput.content, activeOutput.channel as Channel)}
                    className="btn-ghost text-sm py-1.5 px-3"
                  >
                    <Download size={14} />
                    Download
                  </button>
                  <button
                    onClick={() => copyToClipboard(activeOutput.content, activeOutput.id)}
                    className="btn-secondary text-sm py-1.5 px-4"
                  >
                    {copied === activeOutput.id ? (
                      <><Check size={14} className="text-cyan-400" /> Copied</>
                    ) : (
                      <><Copy size={14} /> Copy</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
