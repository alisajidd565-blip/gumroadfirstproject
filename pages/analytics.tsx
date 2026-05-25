import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--brand-500)' }} />
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  return (
    <Layout user={user} onLogout={logout} title="Analytics">
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h1 className="page-title text-3xl mb-3">
          Analytics
        </h1>

        <p style={{ color: 'var(--text-muted)' }}>
          Coming soon.
        </p>
      </div>
    </Layout>
  );
}