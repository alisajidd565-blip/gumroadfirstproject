import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Zap, AlertTriangle, Loader, Clock, CheckCircle,
  XCircle, Trash2, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import ChannelSelector, { type ExtendedChannel } from '@/components/ChannelSelector';
import ContentOutput from '@/components/ContentOutput';
import PlanBadge from '@/components/PlanBadge';
import { useAuth } from '@/hooks/useAuth';
import type { Output, BrandVoice, Project, PlanName } from '@/types';
import { BRAND_VOICES } from '@/types';

const MIN_LENGTH  = 50;
const MAX_LENGTH  = 20_000;

// Channels valid for the backend (exclude facebook for API calls)
const BACKEND_CHANNELS = ['twitter', 'linkedin', 'instagram', 'email'] as const;
type BackendChannel = typeof BACKEND_CHANNELS[number];

function formatRelativeDate(iso: string) {
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return 'Invalid date';
  const diff = Date.now() - ts;
  if (diff <= 0) return 'Just now';
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function StatusDot({ status }: { status: Project['status'] }) {
  if (status === 'done')
    return <CheckCircle size={12} style={{ color: '#16A34A' }} />;
  if (status === 'failed')
    return <XCircle size={12} style={{ color: '#DC2626' }} />;
  if (status === 'processing')
    return <Loader size={12} className="animate-spin" style={{ color: 'var(--brand-500)' }} />;
  return <Clock size={12} style={{ color: 'var(--text-muted)' }} />;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout, refresh } = useAuth();

  // ── Workspace state ────────────────────────────────────────────────────────
  const [sourceText,  setSourceText]  = useState('');
  const [channels,    setChannels]    = useState<ExtendedChannel[]>(['twitter', 'linkedin']);
  const [brandVoice,  setBrandVoice]  = useState<BrandVoice>('professional');
  const [generating,  setGenerating]  = useState(false);
  const [genStep,     setGenStep]     = useState<'idle' | 'creating' | 'generating'>('idle');
  const [outputs,     setOutputs]     = useState<Output[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // ── Recent projects sidebar state ──────────────────────────────────────────
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  // ── Pre-fill brand voice from user settings ────────────────────────────────
  useEffect(() => {
    if (user?.brand_voice) setBrandVoice(user.brand_voice as BrandVoice);
  }, [user]);

  // ── Load recent projects ───────────────────────────────────────────────────
  useEffect(() => {
    async function fetchRecentProjects() {
      setLoadingProjects(true);
      try {
        const res  = await fetch('/api/projects?page=1&limit=8');
        if (!res.ok) {
          toast.error('Failed to load recent projects.');
          return;
        }
        const data = await res.json();
        setRecentProjects(data.projects ?? []);
      } catch {
        toast.error('Failed to load recent projects.');
      } finally {
        setLoadingProjects(false);
      }
    }
    if (user) fetchRecentProjects();
  }, [user]);

  // ── Load a project into the workspace ─────────────────────────────────────
  async function openProject(id: string) {
    try {
      const res  = await fetch(`/api/projects/${id}`);
      if (!res.ok) { toast.error('Failed to load project.'); return; }
      const data = await res.json();
      const proj = data.project as Project & { outputs: Output[] };
      setActiveProject(proj);
      setSourceText(proj.source_text);
      setChannels(proj.channels as ExtendedChannel[]);
      setBrandVoice(proj.brand_voice as BrandVoice);
      setOutputs(proj.outputs ?? []);
    } catch {
      toast.error('Failed to load project.');
    }
  }

  async function deleteProject(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this project? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setRecentProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProject?.id === id) {
        setActiveProject(null);
        setOutputs([]);
      }
      toast.success('Project deleted.');
    } catch {
      toast.error('Failed to delete project.');
    } finally {
      setDeletingId(null);
    }
  }

  // ── Generate ──────────────────────────────────────────────────────────────
  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!canGenerate) return;

    // Only send backend-supported channels
    const backendChans = channels.filter((c): c is BackendChannel =>
      BACKEND_CHANNELS.includes(c as BackendChannel)
    );

    if (backendChans.length === 0) {
      toast.error('Please select at least one supported channel (Twitter, LinkedIn, Instagram, or Email).');
      return;
    }

    setGenerating(true);
    setGenStep('creating');
    setOutputs([]);
    setActiveProject(null);

    try {
      // 1. Create project
      const createRes = await fetch('/api/projects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          source_text: sourceText.trim(),
          channels:    backendChans,
          brand_voice: brandVoice,
        }),
      });
      const createData = await createRes.json();

      if (!createRes.ok) {
        if (createRes.status === 403 && createData.code === 'PLAN_LIMIT_REACHED') {
          toast.error(createData.error, { duration: 6000 });
          router.push('/settings');
          return;
        }
        throw new Error(createData.error || 'Failed to create project.');
      }

      const { project } = createData;

      // 2. Generate
      setGenStep('generating');
      const genRes  = await fetch('/api/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ project_id: project.id }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || 'Generation failed.');
      if (genData.warnings) toast(genData.warnings, { icon: '⚠️' });

      // 3. Fetch full project with outputs
      const projRes  = await fetch(`/api/projects/${project.id}`);
      const projData = await projRes.json();
      const fullProj = projData.project as Project & { outputs: Output[] };

      setActiveProject(fullProj);
      setOutputs(fullProj.outputs ?? []);
      setRecentProjects((prev) => [fullProj, ...prev.slice(0, 7)]);
      await refresh();
      toast.success('Content generated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setGenerating(false);
      setGenStep('idle');
    }
  }

  // ── Edit output ───────────────────────────────────────────────────────────
  async function handleEdit(outputId: string, newContent: string) {
    try {
      const res = await fetch(`/api/outputs/${outputId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: newContent }),
      });
      if (!res.ok) throw new Error('Save failed.');
      const data = await res.json();
      setOutputs((prev) => prev.map((o) => (o.id === outputId ? data.output : o)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const textLen    = sourceText.trim().length;
  const textValid  = textLen >= MIN_LENGTH;
  const textTooLong = textLen > MAX_LENGTH;
  const backendCount = channels.filter((c) => BACKEND_CHANNELS.includes(c as BackendChannel)).length;
  const canGenerate  = textValid && !textTooLong && backendCount > 0 && !generating;

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader size={22} className="animate-spin" style={{ color: 'var(--brand-500)' }} />
        </div>
      </Layout>
    );
  }

  const planName    = ((user.plan as any)?.name as PlanName) ?? 'free';
  const planLimit   = (user.plan as any)?.project_limit ?? 3;
  const usedCount   = user.projects_this_month ?? 0;
  const atLimit     = usedCount >= planLimit;
  const usagePct    = Math.min((usedCount / planLimit) * 100, 100);

  return (
    <Layout user={user} onLogout={logout} title="Dashboard" showFooter={false}>
      {/* ── 3-column workspace ──────────────────────────────────────────────── */}
      <div
        className="flex h-[calc(100vh-60px)] overflow-hidden"
        style={{ background: 'var(--bg-page)' }}
      >

        {/* ── LEFT PANEL ── Input + Channels ──────────────────────────────── */}
        <aside
          className="w-[280px] shrink-0 flex flex-col overflow-y-auto"
          style={{
            background: 'var(--bg-panel)',
            borderRight: '1px solid var(--border-subtle)',
            boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
          }}
        >
          <form onSubmit={handleGenerate} className="flex flex-col h-full p-5 gap-5">

            {/* Panel heading */}
            <div>
              <h2
                className="font-bold text-base"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              >
                New Project
              </h2>
              {atLimit && (
                <div
                  className="flex items-start gap-2 mt-3 p-2.5 rounded-lg text-xs"
                  style={{ background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E' }}
                >
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  <span>
                    Monthly limit reached.{' '}
                    <Link href="/settings" className="underline font-semibold">Upgrade</Link>
                  </span>
                </div>
              )}
            </div>

            {/* 1. Input */}
            <div className="flex flex-col gap-1.5">
              <label className="input-label">1. Input Content</label>
              <textarea
                className="textarea"
                style={{ minHeight: 160, fontSize: 13, lineHeight: 1.55 }}
                placeholder="Paste your blog post or article here…"
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                disabled={generating}
              />
              <div className="flex items-center justify-between mt-0.5">
                {sourceText.length > 0 && !textValid && (
                  <span className="text-xs" style={{ color: '#D97706' }}>
                    At least {MIN_LENGTH} chars required
                  </span>
                )}
                {textTooLong && (
                  <span className="text-xs" style={{ color: '#DC2626' }}>Content too long</span>
                )}
                {!(!textValid || textTooLong) && <span />}
                <span
                  className="text-xs font-mono ml-auto"
                  style={{ color: textTooLong ? '#DC2626' : 'var(--brand-500)' }}
                >
                  {textLen.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 2. Channels */}
            <div className="flex flex-col gap-2">
              <label className="input-label">2. Choose Channels</label>
              <ChannelSelector
                selected={channels}
                onChange={setChannels}
                disabled={generating}
              />
              {backendCount === 0 && channels.length > 0 && (
                <p className="text-xs" style={{ color: '#D97706' }}>
                  Facebook is UI-only. Select at least one other channel.
                </p>
              )}
            </div>

            {/* 3. Brand voice (compact select) */}
            <div className="flex flex-col gap-1.5">
              <label className="input-label">3. Brand Voice</label>
              <select
                className="input text-sm"
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value as BrandVoice)}
                disabled={generating}
                style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
              >
                {BRAND_VOICES.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label} — {v.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Generate button */}
            <button
              type="submit"
              disabled={!canGenerate || atLimit}
              className="btn-primary w-full py-3 text-sm shadow-sm"
              style={{ borderRadius: 12 }}
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader size={15} className="animate-spin" />
                  {genStep === 'creating' ? 'Creating project…' : 'Generating…'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Zap size={15} fill="currentColor" />
                  Generate Repurposed Content
                </span>
              )}
            </button>
          </form>
        </aside>

        {/* ── CENTER PANEL ── Results ──────────────────────────────────────── */}
        <main
          className="flex-1 flex flex-col min-w-0 overflow-hidden p-5"
          style={{ background: 'var(--bg-page)' }}
        >
          {generating ? (
            /* Loading state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse-soft shadow-lg"
                style={{ background: 'linear-gradient(135deg, #00A389, #2ABBA0)' }}
              >
                <Zap size={28} fill="white" className="text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                  {genStep === 'creating' ? 'Setting up your project…' : 'GPT-4 is generating your content…'}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  This usually takes 10–30 seconds
                </p>
              </div>
              {/* Progress dots */}
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full animate-pulse-soft"
                    style={{
                      background: 'var(--brand-400)',
                      animationDelay: `${i * 200}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : outputs.length > 0 ? (
            /* Results */
            <ContentOutput outputs={outputs} onEdit={handleEdit} />
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--border-subtle)' }}
              >
                <Zap size={24} style={{ color: 'var(--text-faint)' }} />
              </div>
              <div>
                <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  No results yet
                </p>
                <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
                  Paste your content, choose channels, and hit generate to see results here
                </p>
              </div>
            </div>
          )}
        </main>

        {/* ── RIGHT PANEL ── Plan info + Recent projects ───────────────────── */}
        <aside
          className="w-[220px] shrink-0 flex flex-col overflow-y-auto p-4 gap-4"
          style={{
            background: 'var(--bg-panel)',
            borderLeft: '1px solid var(--border-subtle)',
            boxShadow: '-2px 0 12px rgba(0,0,0,0.04)',
          }}
        >
          {/* Subscription card */}
          <div
            className="rounded-xl p-4"
            style={{
              background: 'linear-gradient(135deg, #00A389, #008A74)',
              boxShadow: '0 4px 14px rgba(0,163,137,0.25)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                Subscription Plan
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#D1FAE5', color: '#065F46' }}
              >
                {planName === 'free' ? 'Free' : planName === 'pro' ? 'Pro' : 'Business'}
              </span>
            </div>
            <p className="font-bold text-white capitalize mb-3">{planName} Plan</p>

            {/* Usage bar */}
            <div>
              <div className="flex justify-between text-xs text-white/70 mb-1.5">
                <span>Project Limits</span>
                <span>{usedCount}/{planLimit === 999999 ? '∞' : planLimit}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${usagePct}%`,
                    background: usagePct >= 90 ? '#FCA5A5' : 'rgba(255,255,255,0.8)',
                  }}
                />
              </div>
              <p className="text-xs text-white/60 mt-1.5">
                {planLimit === 999999 ? 'Unlimited' : `${planLimit - usedCount} remaining`} this month
              </p>
            </div>

            {planName === 'free' && (
              <Link
                href="/settings"
                className="mt-3 flex items-center justify-center gap-1.5 w-full text-xs font-semibold py-2 rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              >
                Upgrade Plan <ChevronRight size={11} />
              </Link>
            )}
          </div>

          {/* Brand voice card */}
          <div
            className="rounded-xl p-4"
            style={{
              background: 'linear-gradient(135deg, #6D28D9, #5B21B6)',
              boxShadow: '0 4px 14px rgba(109,40,217,0.20)',
            }}
          >
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wider block mb-2">
              Brand Voice
            </span>
            <select
              className="w-full text-sm font-semibold rounded-lg px-3 py-2 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value as BrandVoice)}
            >
              {BRAND_VOICES.map((v) => (
                <option key={v.value} value={v.value} style={{ color: '#1A1714', background: 'white' }}>
                  {v.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-white/50 mt-2">
              {BRAND_VOICES.find((v) => v.value === brandVoice)?.description}
            </p>
          </div>

          {/* Recent projects */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Recent
              </span>
              <Link
                href="/projects"
                className="text-xs font-medium transition-colors"
                style={{ color: 'var(--brand-500)' }}
              >
                View all
              </Link>
            </div>

            {loadingProjects ? (
              <div className="flex justify-center py-4">
                <Loader size={16} className="animate-spin" style={{ color: 'var(--brand-400)' }} />
              </div>
            ) : recentProjects.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-faint)' }}>
                No projects yet
              </p>
            ) : (
              <div className="space-y-1">
                {recentProjects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => openProject(proj.id)}
                    className="w-full text-left rounded-lg px-2.5 py-2 transition-all group relative"
                    style={{
                      background: activeProject?.id === proj.id ? 'var(--brand-bg)' : 'transparent',
                      border: activeProject?.id === proj.id
                        ? '1px solid var(--brand-border)'
                        : '1px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (activeProject?.id !== proj.id)
                        e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (activeProject?.id !== proj.id)
                        e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div className="flex items-start gap-1.5">
                      <StatusDot status={proj.status} />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-medium leading-snug line-clamp-2"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {proj.title}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                          {formatRelativeDate(proj.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Delete on hover */}
                    <button
                      onClick={(e) => deleteProject(proj.id, e)}
                      disabled={deletingId === proj.id}
                      className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                      style={{ color: '#DC2626' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#FEE2E2')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {deletingId === proj.id
                        ? <Loader size={11} className="animate-spin" />
                        : <Trash2 size={11} />
                      }
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </Layout>
  );
}
