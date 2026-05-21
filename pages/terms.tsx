import Link from 'next/link';
import Layout from '@/components/Layout';

export default function TermsPage() {
  return (
    <Layout title="Terms of Service">
      <div className="max-w-2xl mx-auto px-4 py-12 prose prose-invert prose-slate">
        <h1 className="text-2xl font-semibold text-slate-100 mb-4">Terms of Service</h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          This is a placeholder terms page for ContentRepurposer AI. Replace with your legal terms
          before launching to production. By using the service you agree to use generated content
          responsibly and comply with applicable laws.
        </p>
        <p className="mt-6">
          <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm">← Back to home</Link>
        </p>
      </div>
    </Layout>
  );
}
