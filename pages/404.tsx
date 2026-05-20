import Link from 'next/link';
import Layout from '@/components/Layout';
import { ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <Layout title="404 — Page not found">
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <p className="text-7xl font-bold text-slate-800 font-mono mb-4">404</p>
        <h1 className="text-2xl font-semibold text-slate-200 mb-3">Page not found</h1>
        <p className="text-slate-500 mb-8 max-w-xs">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" className="btn-primary">
          <ArrowLeft size={16} />
          Back to home
        </Link>
      </div>
    </Layout>
  );
}
