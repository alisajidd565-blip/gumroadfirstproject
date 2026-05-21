import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeft, RefreshCw, Loader, AlertCircle, Clock, CheckCircle, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import ContentOutput from '@/components/ContentOutput';
import { useAuth } from '@/hooks/useAuth';
import type { Project, Output, Channel, SocialProviderStatus } from '@/types';
import { CHANNEL_CONFIGS } from '@/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: Project['status'] }) {
  const configs = {
    done:       { icon: <CheckCircle size={13} />, label: 'Done',       cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    failed:     { icon: <XCircle size={13} />,     label: 'Failed',     cls: 'text-red-400 bg-red-400/10 border-red-400/20' },
    processing: { icon: <Loader size={13} className="animate-spin" />,  label: 'Processing', cls: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
    pending:    { icon: <Clock size={13} />,        label: 'Pending',    cls: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
  };
  const cfg = configs[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function ProjectPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { user, loading: authLoading, logout } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [socialProviders, setSocialProviders] = useState<SocialProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [publishingOutputId, setPublishingOutputId] = useState<string | null>(null);
  const socialConnected = router.query.social_connected;
  const socialError = router.query.social_error;

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const fetchProject = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('Project not found.');
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to load project.');
      }
      const data = await res.json();
      setProject(data.project);
      setOutputs(data.project.outputs || []);
    } catch {
      toast.error('Failed to load project.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id && user) fetchProject();
  }, [fetchProject, id, user]);

  const fetchSocialStatus = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch('/api/social/status');
      if (!res.ok) return;
      const data = await res.json();
      setSocialProviders(data.providers || []);
    } catch {
      setSocialProviders([]);
    }
  }, [user]);

  useEffect(() => {
    fetchSocialStatus();
  }, [fetchSocialStatus]);

  useEffect(() => {
    if (typeof socialConnected === 'string') {
      toast.success(`${socialConnected === 'twitter' ? 'X / Twitter' : 'LinkedIn'} connected.`);
      fetchSocialStatus();
      if (id) router.replace(`/projects/${id}`, undefined, { shallow: true });
    } else if (typeof socialError === 'string') {
      toast.error('Could not connect app. Check provider credentials and callback URLs.');
      if (id) router.replace(`/projects/${id}`, undefined, { shallow: true });
    }
  }, [fetchSocialStatus, id, router, socialConnected, socialError]);

  async function regenerate() {
    if (!project) return;
    setRegenerating(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Regeneration failed.');

      if (data.warnings) toast(data.warnings, { icon: '⚠️' });

      toast.success('Content regenerated!');
      // Refetch to get updated outputs + status
      await fetchProject();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Regeneration failed.');
    } finally {
      setRegenerating(false);
    }
  }

  async function handleEdit(outputId: string, newContent: string) {
    const res = await fetch(`/api/outputs/${outputId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent }),
    });
    if (!res.ok) throw new Error('Save failed.');
    const data = await res.json();
    setOutputs((prev) => prev.map((o) => (o.id === outputId ? data.output : o)));
  }

  async function handlePublish(output: Output) {
    setPublishingOutputId(output.id);
    try {
      const res = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ output_id: output.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish.');

      const providerLabel = output.channel === 'twitter' ? 'X / Twitter' : 'LinkedIn';
      toast.success(`Published to ${providerLabel}.`);
      if (data.publication?.provider_url) {
        window.open(data.publication.provider_url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish.');
    } finally {
      setPublishingOutputId(null);
    }
  }

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader size={24} className="text-cyan-400 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!project) return null;

  return (
    <Layout user={user} onLogout={logout} title={project.title}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Back */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>

        {/* Project header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={project.status} />
              <span className="text-xs text-slate-600">{formatDate(project.created_at)}</span>
            </div>
            <h1 className="page-title text-2xl md:text-3xl leading-snug">{project.title}</h1>

            {/* Channel tags */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(project.channels as Channel[]).map((ch) => {
                const cfg = CHANNEL_CONFIGS[ch];
                return (
                  <span
                    key={ch}
                    className={`text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 ${cfg.color} font-medium`}
                  >
                    {cfg.label}
                  </span>
                );
              })}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-medium capitalize">
                {project.brand_voice}
              </span>
            </div>
          </div>

          <button
            onClick={regenerate}
            disabled={regenerating}
            className="btn-secondary whitespace-nowrap self-start"
          >
            {regenerating ? (
              <Loader size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </button>
        </div>

        {/* Generated outputs */}
        {project.status === 'processing' || regenerating ? (
          <div className="card border-cyan-500/20 bg-cyan-500/5 text-center py-12 animate-pulse-slow">
            <Loader size={24} className="text-cyan-400 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-cyan-300 font-medium">AI is generating your content…</p>
            <p className="text-xs text-slate-500 mt-1">This usually takes 10–30 seconds.</p>
          </div>
        ) : project.status === 'failed' ? (
          <div className="card border-red-500/20 bg-red-500/5 text-center py-12">
            <AlertCircle size={24} className="text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-300 font-medium mb-1">Generation failed</p>
            <p className="text-xs text-slate-500 mb-4">
              Something went wrong with the AI generation. Try regenerating.
            </p>
            <button onClick={regenerate} className="btn-secondary">
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        ) : outputs.length > 0 ? (
          <ContentOutput
            outputs={outputs}
            onEdit={handleEdit}
            socialProviders={socialProviders}
            onPublish={handlePublish}
            publishingOutputId={publishingOutputId}
            connectReturnTo={`/projects/${project.id}`}
          />
        ) : (
          <div className="card text-center py-12">
            <p className="text-slate-500 text-sm mb-4">No outputs yet.</p>
            <button onClick={regenerate} className="btn-primary">
              <RefreshCw size={14} />
              Generate now
            </button>
          </div>
        )}

        {/* Source text (collapsed) */}
        <details className="mt-8 group">
          <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-300 transition-colors list-none flex items-center gap-2">
            <svg
              className="w-4 h-4 transition-transform group-open:rotate-90"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            View source text
          </summary>
          <div className="mt-4 p-4 bg-slate-800 border border-slate-700 rounded-xl">
            <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap font-mono">
              {project.source_text}
            </p>
          </div>
        </details>
      </div>
    </Layout>
  );
}
