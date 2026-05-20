import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { Menu, X, Zap } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import type { User } from '@/types';
import clsx from 'clsx';

interface NavbarProps {
  user?: User | null;
  onLogout?: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const router = useRouter();
  const [theme, toggleTheme] = useDarkMode();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = user
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/projects/new', label: 'New Project' },
        { href: '/settings', label: 'Settings' },
      ]
    : [
        { href: '/#features', label: 'Features' },
        { href: '/#pricing', label: 'Pricing' },
      ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md dark:bg-slate-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
              <Zap size={16} className="text-slate-950" fill="currentColor" />
            </div>
            <span className="font-semibold text-slate-100 text-base tracking-tight">
              ContentRepurposer<span className="text-cyan-400"> AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  router.pathname === link.href
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {user ? (
              <>
                <span className="hidden md:block text-sm text-slate-500 px-2">
                  {user.email}
                </span>
                <button onClick={onLogout} className="btn-secondary hidden md:flex text-sm py-2 px-4">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost hidden md:flex text-sm">
                  Log in
                </Link>
                <Link href="/signup" className="btn-primary text-sm py-2 px-4">
                  Get started
                </Link>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-slate-400 hover:text-slate-100"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 flex flex-col gap-2 animate-fade-in">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={clsx(
                'px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                router.pathname === link.href
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              )}
            >
              {link.label}
            </Link>
          ))}
          <hr className="border-slate-800 my-1" />
          {user ? (
            <button
              onClick={() => { setMenuOpen(false); onLogout?.(); }}
              className="btn-secondary w-full"
            >
              Log out
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Link href="/login" onClick={() => setMenuOpen(false)} className="btn-secondary w-full text-center">
                Log in
              </Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)} className="btn-primary w-full text-center">
                Get started free
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
