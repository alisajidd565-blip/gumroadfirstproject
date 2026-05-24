import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer
      className="mt-auto"
      style={{
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00A389, #2ABBA0)' }}
            >
              <Zap size={11} className="text-white" fill="white" />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              ContentRepurposer AI
            </span>
          </div>

          <nav className="flex flex-wrap gap-6 text-sm">
            {[
              { href: '/#features', label: 'Features' },
              { href: '/#pricing',  label: 'Pricing' },
              { href: '/login',     label: 'Log in' },
              { href: '/signup',    label: 'Sign up' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {label}
              </Link>
            ))}
          </nav>

          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            &copy; {new Date().getFullYear()} ContentRepurposer AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
