import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Plus, Zap, Clock, CheckCircle, XCircle, Loader, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import PlanBadge from '@/components/PlanBadge';
import { useAuth } from '@/hooks/useAuth';
import type { Project, Channel, PlanName } from '@/types';
import { CHANNEL_CONFIGS } from '@/types';

function StatusIcon({ status }: { status: Project['status'] }) {
  switch (status) {
    case 'done':       return <CheckCircle size={14} className="text-emerald-400" />;
    case 'failed':     return <XCircle size={14} className="text-red-400" />;
    case 'processing': return <Loader size={14} className="text-cyan-400 animate-spin" />;
    default:           return <Clock size={14} className="text-slate-500" />;
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) fetchProjects(page);
  }, [user, page]);

  async function fetchProjects(p: number) {
    setLoadingProjects(true);
    try {
      const res = await fetch(`/api/projects?page=${p}&limit=12`);
      if (!res.ok) throw new Error('Failed to load projects');
      const data = await res.json();
      setProjects(data.projects);
      setTotalPages(data.pagination.pages);
    } catch {
      toast.error('Failed to load projects.');
    } finally {
      setLoadingProjects(false);
    }
  }

  async function deleteProject(id: string) {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success('Project deleted.');
    } catch {
      toast.error('Failed to delete project.');
    } finally {
      setDeletingId(null);
    }
  }

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader size={24} className="text-cyan-400 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  const planName = (user.plan as any)?.name as PlanName ?? 'free';
  const planLimit = (user.plan as any)?.project_limit ?? 3;
  const usedCount = user.projects_this_month ?? 0;
  const usagePercent = Math.min((usedCount / planLimit) * 100, 100);
  const atLimit = usedCount >= planLimit;

  return (
    <Layout user={user} onLogout={logout} title="Dashboard">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Header row ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="page-title text-2xl md:text-3xl">
              {user.full_name ? `Hey, ${user.full_name.split(' ')[0]}.` : 'Dashboard'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Your content repurposing projects
            </p>
          </div>
          <Link
            href="/projects/new"
            className={atLimit ? 'btn-secondary opacity-60 pointer-events-none' : 'btn-primary'}
          >
            <Plus size={16} />
            New project
          </Link>
        </div>

        {/* ── Usage card ───────────────────────────────────────────────── */}
        <div className="card mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-300">Monthly usage</span>
                  <PlanBadge plan={planName} />
                </div>
                <p className="text-slate-500 text-xs">
                  {usedCount} of {planLimit} projects used this month
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:min-w-[260px]">
              <div className="flex-1">
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercent >= 90
                        ? 'bg-red-500'
                        : usagePercent >= 70
                        ? 'bg-amber-500'
                        : 'bg-cyan-500'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-mono text-slate-400 whitespace-nowrap">
                {usedCount}/{planLimit}
              </span>
            </div>
            {planName === 'free' && (
              <Link href="/settings" className="btn-secondary text-sm py-2 whitespace-nowrap">
                Upgrade →
              </Link>
            )}
          </div>

          {atLimit && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-300">
                You&apos;ve reached your plan limit for this month.{' '}
                <Link href="/settings" className="underline font-medium hover:text-amber-200">
                  Upgrade your plan
                </Link>{' '}
                to create more projects.
              </p>
            </div>
          )}
        </div>

        {/* ── Projects grid ─────────────────────────────────────────────── */}
        {loadingProjects ? (
          <div className="flex items-center justify-center h-48">
            <Loader size={24} className="text-cyan-400 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
              <Zap size={28} className="text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No projects yet</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-xs">
              Create your first project to start repurposing content across all your channels.
            </p>
            <Link href="/projects/new" className="btn-primary">
              <Plus size={16} />
              Create first project
            </Link>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="card-hover group animate-fade-in"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  {/* Status + date */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={project.status} />
                      <span className="text-xs text-slate-500 capitalize">{project.status}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-600">{formatDate(project.created_at)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                        disabled={deletingId === project.id}
                        className="ml-1 p-1 rounded text-slate-700 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete project"
                      >
                        {deletingId === project.id ? (
                          <Loader size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-slate-100 text-sm mb-2 line-clamp-2 leading-snug">
                    {project.title}
                  </h3>

                  {/* Source text preview */}
                  <p className="text-slate-500 text-xs line-clamp-2 mb-4 leading-relaxed">
                    {project.source_text.slice(0, 120)}…
                  </p>

                  {/* Channel pills */}
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {(project.channels as Channel[]).map((ch) => {
                      const cfg = CHANNEL_CONFIGS[ch];
                      return (
                        <span
                          key={ch}
                          className={`text-xs px-2 py-0.5 rounded-full bg-slate-800 ${cfg.color} font-medium`}
                        >
                          {cfg.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-sm py-2 px-4 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary text-sm py-2 px-4 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
