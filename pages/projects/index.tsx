import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Plus, Loader, Trash2, Clock, CheckCircle, XCircle, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import type { Project, Channel } from '@/types';
import { CHANNEL_CONFIGS } from '@/types';

const CHANNEL_COLORS: Record<string, { color: string; bg: string }> = {
  twitter:   { color: '#1DA1F2', bg: '#EBF6FD' },
  linkedin:  { color: '#0A66C2', bg: '#E8F1FA' },
  instagram: { color: '#E1306C', bg: '#FDEEF3' },
  email:     { color: '#D97706', bg: '#FEF3C7' },
};

function StatusIcon({ status }: { status: Project['status'] }) {
  if (status === 'done')       return <CheckCircle size={13} style={{ color: '#16A34A' }} />;
  if (status === 'failed')     return <XCircle size={13} style={{ color: '#DC2626' }} />;
  if (status === 'processing') return <Loader size={13} className="animate-spin" style={{ color: 'var(--brand-500)' }} />;
  return <Clock size={13} style={{ color: 'var(--text-muted)' }} />;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [projects,     setProjects]     = useState<Project[]>([]);
  const [loadingProj,  setLoadingProj]  = useState(true);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [searchQuery,  setSearchQuery]  = useState('');

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);
  useEffect(() => { if (user) fetchProjects(page); }, [user, page]);

  async function fetchProjects(p: number) {
    setLoadingProj(true);
    try {
      const res  = await fetch(`/api/projects?page=${p}&limit=15`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProjects(data.projects);
      setTotalPages(data.pagination.pages);
    } catch {
      toast.error('Failed to load projects.');
    } finally {
      setLoadingProj(false);
    }
  }

  async function deleteProject(id: string) {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await fetchProjects(page);
      toast.success('Project deleted.');
    } catch {
      toast.error('Failed to delete project.');
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = projects.filter((p) =>
    !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader size={22} className="animate-spin" style={{ color: 'var(--brand-500)' }} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user ?? undefined} onLogout={logout} title="Projects">
      <div
        className="min-h-[calc(100vh-60px)]"
        style={{ background: 'var(--bg-page)' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              >
                Projects
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                All your repurposed content
              </p>
            </div>
            <Link href="/dashboard" className="btn-primary">
              <Plus size={15} /> New project
            </Link>
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-faint)' }}
            />
            <input
              type="text"
              placeholder="Search projects by title…"
              className="input pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* List */}
          {loadingProj ? (
            <div className="flex justify-center py-16">
              <Loader size={22} className="animate-spin" style={{ color: 'var(--brand-500)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="panel p-16 text-center"
              style={{ background: 'var(--bg-panel)' }}
            >
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'var(--border-subtle)' }}
              >
                <Plus size={24} style={{ color: 'var(--text-faint)' }} />
              </div>
              <p className="font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                {searchQuery ? 'No projects found' : 'No projects yet'}
              </p>
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                {searchQuery ? 'Try a different search term.' : 'Create your first project from the dashboard.'}
              </p>
              {!searchQuery && (
                <Link href="/dashboard" className="btn-primary">
                  <Plus size={15} /> Create first project
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((proj) => (
                <div
                  key={proj.id}
                  className="panel p-4 flex items-center gap-4 group cursor-pointer transition-all hover:shadow-lifted"
                  onClick={() => router.push(`/projects/${proj.id}`)}
                  style={{ background: 'var(--bg-panel)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-mid)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  {/* Status icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-mid)' }}
                  >
                    <StatusIcon status={proj.status} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-semibold text-sm line-clamp-1 mb-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {proj.title}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(proj.channels as Channel[]).slice(0, 3).map((ch) => {
                        const cc = CHANNEL_COLORS[ch] ?? { color: '#999', bg: '#eee' };
                        return (
                          <span
                            key={ch}
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ background: cc.bg, color: cc.color }}
                          >
                            {CHANNEL_CONFIGS[ch]?.label ?? ch}
                          </span>
                        );
                      })}
                      {proj.channels.length > 3 && (
                        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                          +{proj.channels.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <p className="text-xs shrink-0 hidden sm:block" style={{ color: 'var(--text-faint)' }}>
                    {formatDate(proj.created_at)}
                  </p>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteProject(proj.id); }}
                    disabled={deletingId === proj.id}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all"
                    style={{ color: '#DC2626' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#FEE2E2')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {deletingId === proj.id
                      ? <Loader size={14} className="animate-spin" />
                      : <Trash2 size={14} />
                    }
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-2 px-4 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary py-2 px-4 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
