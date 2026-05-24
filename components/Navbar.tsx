import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { Search, Bell, ChevronDown, Zap, Menu, X, LayoutDashboard, FolderOpen, BarChart2, Settings } from 'lucide-react';
import type { User } from '@/types';
import clsx from 'clsx';

interface NavbarProps {
  user?: User | null;
  onLogout?: () => void;
}

const NAV_LINKS = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/projects',   label: 'Projects',   icon: FolderOpen },
  { href: '/analytics',  label: 'Analytics',  icon: BarChart2 },
  { href: '/settings',   label: 'Settings',   icon: Settings },
];

export default function Navbar({ user, onLogout }: NavbarProps) {
  const router   = useRouter();
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const displayName = user?.full_name
    ? user.full_name.split(' ')[0] + ' ' + (user.full_name.split(' ')[1]?.[0] ?? '') + '.'
    : user?.email?.split('@')[0] ?? '';

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-subtle)',
        boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
      }}
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex h-[60px] items-center gap-4">

          {/* ── Logo ── */}
          <Link
            href={user ? '/dashboard' : '/'}
            className="flex items-center gap-2.5 shrink-0 group mr-2"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #00A389, #2ABBA0)' }}
            >
              <Zap size={15} className="text-white" fill="white" />
            </div>
            <span className="font-bold text-sm hidden sm:block" style={{ color: 'var(--text-primary)' }}>
              ContentRepurposer{' '}
              <span style={{ color: 'var(--brand-500)' }}>AI</span>
            </span>
          </Link>

          {/* ── Desktop Nav ── */}
          {user && (
            <nav className="hidden md:flex items-center gap-0.5">
              {NAV_LINKS.map(({ href, label }) => {
                const active = router.pathname === href || router.pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    className={clsx('nav-link', active && 'active')}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* ── Spacer ── */}
          <div className="flex-1" />

          {/* ── Search ── */}
          {user && (
            <div className="relative hidden sm:block">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-faint)' }}
              />
              <input
                type="text"
                placeholder="Search projects…"
                className="h-9 pl-9 pr-4 rounded-xl text-sm w-48 focus:w-64 transition-all duration-200 focus:outline-none"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-mid)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,163,137,0.12)')}
                onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
              />
            </div>
          )}

          {/* ── Right actions ── */}
          <div className="flex items-center gap-1">
            {user ? (
              <>
                {/* Bell */}
                <button className="btn-icon relative">
                  <Bell size={17} />
                  <span
                    className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--brand-500)' }}
                  />
                </button>

                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-all duration-150 ml-1"
                    style={{ border: '1px solid var(--border-mid)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Avatar */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
                    >
                      {initials}
                    </div>
                    <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--text-primary)' }}>
                      {displayName}
                    </span>
                    <ChevronDown
                      size={13}
                      className={clsx('transition-transform duration-150', userMenuOpen && 'rotate-180')}
                      style={{ color: 'var(--text-muted)' }}
                    />
                  </button>

                  {/* Dropdown */}
                  {userMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-1.5 w-44 rounded-xl py-1 z-50 animate-pop"
                      style={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: 'var(--shadow-lifted)',
                      }}
                    >
                      <div
                        className="px-4 py-2 text-xs font-medium border-b mb-1"
                        style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}
                      >
                        {user.email}
                      </div>
                      <Link
                        href="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm w-full transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Settings size={13} />
                        Settings
                      </Link>
                      <button
                        onClick={() => { setUserMenuOpen(false); onLogout?.(); }}
                        className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left transition-colors"
                        style={{ color: '#DC2626' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#FEF2F2')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost text-sm">Log in</Link>
                <Link href="/signup" className="btn-primary text-sm py-2 px-4">Get started</Link>
              </>
            )}

            {/* Mobile toggle */}
            <button
              className="btn-icon md:hidden ml-1"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div
          className="md:hidden border-t px-4 py-3 space-y-0.5 animate-slide-in"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
        >
          {user
            ? NAV_LINKS.map(({ href, label, icon: Icon }) => {
                const active = router.pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      active ? 'text-brand-500 bg-brand-50' : 'text-text-secondary'
                    )}
                    style={{
                      color: active ? 'var(--brand-500)' : 'var(--text-secondary)',
                      background: active ? 'var(--brand-bg)' : 'transparent',
                    }}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                );
              })
            : (
              <div className="flex flex-col gap-2 pt-2">
                <Link href="/login" onClick={() => setMobileOpen(false)} className="btn-secondary w-full">Log in</Link>
                <Link href="/signup" onClick={() => setMobileOpen(false)} className="btn-primary w-full">Get started</Link>
              </div>
            )}
          {user && (
            <button
              onClick={() => { setMobileOpen(false); onLogout?.(); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full transition-colors mt-2"
              style={{ color: '#DC2626' }}
            >
              Log out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
