import Link from 'next/link';
import Layout from '@/components/Layout';
import { RefreshCw } from 'lucide-react';

export default function ServerErrorPage() {
  return (
    <Layout title="500 — Server error">
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <p className="text-7xl font-bold text-slate-800 font-mono mb-4">500</p>
        <h1 className="text-2xl font-semibold text-slate-200 mb-3">Something went wrong</h1>
        <p className="text-slate-500 mb-8 max-w-xs">
          There was an internal server error. The team has been notified.
        </p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          <RefreshCw size={16} />
          Reload page
        </button>
      </div>
    </Layout>
  );
}
