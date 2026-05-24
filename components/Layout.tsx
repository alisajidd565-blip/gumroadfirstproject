import Head from 'next/head';
import Navbar from './Navbar';
import Footer from './Footer';
import type { User } from '@/types';

interface LayoutProps {
  children: React.ReactNode;
  user?: User | null;
  onLogout?: () => void;
  title?: string;
  description?: string;
  showFooter?: boolean;
}

export default function Layout({
  children,
  user,
  onLogout,
  title = 'ContentRepurposer AI',
  description = 'Transform any blog post into platform-perfect content for Twitter, LinkedIn, Instagram, and Email — powered by GPT-4.',
  showFooter = true,
}: LayoutProps) {
  const fullTitle = title === 'ContentRepurposer AI' ? title : `${title} — ContentRepurposer AI`;

  return (
    <>
      <Head>
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div
        className="min-h-screen flex flex-col"
        style={{ background: 'var(--bg-page)' }}
      >
        <Navbar user={user} onLogout={onLogout} />
        <main className="flex-1">{children}</main>
        {showFooter && <Footer />}
      </div>
    </>
  );
}
