import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { Zap, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Layout from '@/components/Layout';

export default function LoginPage() {
  const router = useRouter();
  
  function safeRedirect(next: string | string[] | undefined): string {
    if (typeof next !== 'string') return '/dashboard';
    // Only allow relative paths starting with /
    if (!next.startsWith('/')) return '/dashboard';
    // Prevent protocol-relative URLs
    if (next.startsWith('//')) return '/dashboard';
    return next;
  }
  
  const next = safeRedirect(router.query.next);

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Login failed.'); return; }
      toast.success('Welcome back!');
      router.push(next);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout showFooter={false} title="Log in">
      <div
        className="min-h-[calc(100vh-60px)] flex"
        style={{ background: 'var(--bg-page)' }}
      >
        {/* ── Left decorative panel ──────────────────────────────────────── */}
        <div
          className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between p-10"
          style={{
            background: 'linear-gradient(160deg, #00A389 0%, #008A74 50%, #005446 100%)',
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap size={17} fill="white" className="text-white" />
            </div>
            <span className="font-bold text-white text-base">ContentRepurposer AI</span>
          </div>

          {/* Quote block */}
          <div>
            <p
              className="text-2xl font-light text-white/90 leading-relaxed mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              "One post.{' '}
              <em className="not-italic font-semibold text-white">Four channels.</em>{' '}
              Seconds."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                J
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Jane Doe</p>
                <p className="text-xs text-white/60">Content strategist, Pro plan</p>
              </div>
            </div>
          </div>

          {/* Channel pills */}
          <div className="flex flex-wrap gap-2">
            {['Twitter / X', 'LinkedIn', 'Instagram', 'Email'].map((c) => (
              <span
                key={c}
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* ── Right login form ───────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm animate-slide-in">

            {/* Mobile logo */}
            <div className="flex justify-center mb-8 lg:hidden">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #00A389, #2ABBA0)' }}
                >
                  <Zap size={17} fill="white" className="text-white" />
                </div>
                <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  ContentRepurposer AI
                </span>
              </Link>
            </div>

            {/* Card */}
            <div className="panel p-8">
              <div className="mb-6">
                <h1
                  className="text-2xl font-bold mb-1"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                >
                  Welcome back
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Log in to your account to continue
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="input-label">Email address</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="input-label">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      className="input pr-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'var(--text-faint)' }}
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 mt-2"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                      />
                      Logging in…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Log in <ArrowRight size={15} />
                    </span>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="font-semibold transition-colors"
                  style={{ color: 'var(--brand-500)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brand-600)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--brand-500)')}
                >
                  Sign up free
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
