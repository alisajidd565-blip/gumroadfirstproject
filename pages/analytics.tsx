import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';

export default function AnalyticsPage() {
  const { user, logout } = useAuth();

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