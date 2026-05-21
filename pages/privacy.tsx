import Link from 'next/link';
import Layout from '@/components/Layout';

export default function PrivacyPage() {
  return (
    <Layout title="Privacy Policy">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold text-slate-100 mb-4">Privacy Policy</h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          This is a placeholder privacy page for ContentRepurposer AI. Replace with your privacy
          policy before production. We store account email, project content you submit, and billing
          metadata required to operate the service.
        </p>
        <p className="mt-6">
          <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm">← Back to home</Link>
        </p>
      </div>
    </Layout>
  );
}
