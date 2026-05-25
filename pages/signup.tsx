import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { Zap, Eye, EyeOff, Check, ArrowRight } from 'lucide-react';
import Layout from '@/components/Layout';

export default function SignupPage() {
  const router = useRouter();

  const [fullName,     setFullName]     = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);

  const checks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
  };
  const passwordStrong = Object.values(checks).every(Boolean);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!passwordStrong) { toast.error('Please meet all password requirements.'); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), password, full_name: fullName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Signup failed.'); return; }
      toast.success('Account created! Welcome.');
      router.push('/dashboard');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout showFooter={false} title="Create account">
      <div
        className="min-h-[calc(100vh-60px)] flex"
        style={{ background: 'var(--bg-page)' }}
      >
        {/* ── Left decorative panel ──────────────────────────────────────── */}
        <div
          className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between p-10"
          style={{
            background: 'linear-gradient(160deg, #6D28D9 0%, #5B21B6 50%, #3B0764 100%)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap size={17} fill="white" className="text-white" />
            </div>
            <span className="font-bold text-white text-base">ContentRepurposer AI</span>
          </div>

          <div>
            <p
              className="text-2xl font-light text-white/90 leading-relaxed mb-8"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Transform any blog post into platform-perfect content —{' '}
              <em className="not-italic font-semibold text-white">in seconds.</em>
            </p>
            {/* Features list */}
            <ul className="space-y-3">
              {[
                'GPT-4 Turbo powered generation',
                '4 platforms: Twitter, LinkedIn, Instagram, Email',
                '6 brand voices to match your style',
                'Free forever — no credit card required',
              ].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(255,255,255,0.25)' }}
                  >
                    <Check size={11} className="text-white" />
                  </div>
                  <span className="text-sm text-white/80">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/40">
            Join thousands of content creators saving hours every week.
          </p>
        </div>

        {/* ── Right signup form ──────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm animate-slide-in">

            {/* Mobile logo */}
            <div className="flex justify-center mb-8 lg:hidden">
              <Link href="/" className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #00A389, #2ABBA0)' }}
                >
                  <Zap size={17} fill="white" className="text-white" />
                </div>
                <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  ContentRepurposer AI
                </span>
              </Link>
            </div>

            <div className="panel p-8">
              <div className="mb-6">
                <h1
                  className="text-2xl font-bold mb-1"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                >
                  Create your account
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Free forever. No credit card required.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="input-label">Full name</label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    className="input"
                    placeholder="Jane Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                  />
                </div>

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
                      autoComplete="new-password"
                      required
                      className="input pr-10"
                      placeholder="Create a strong password"
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
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Password strength */}
                  {password.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      {[
                        { ok: checks.length,    label: 'At least 8 characters' },
                        { ok: checks.uppercase, label: 'One uppercase letter' },
                        { ok: checks.number,    label: 'One number' },
                      ].map((c) => (
                        <div key={c.label} className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center transition-all"
                            style={{
                              background: c.ok ? 'var(--brand-500)' : 'var(--border-mid)',
                            }}
                          >
                            {c.ok && <Check size={9} className="text-white" />}
                          </div>
                          <span
                            className="text-xs transition-colors"
                            style={{ color: c.ok ? 'var(--brand-600)' : 'var(--text-faint)' }}
                          >
                            {c.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !passwordStrong}
                  className="btn-primary w-full py-3 mt-2"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Create account <ArrowRight size={15} />
                    </span>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-semibold transition-colors"
                  style={{ color: 'var(--brand-500)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brand-600)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--brand-500)')}
                >
                  Log in
                </Link>
              </p>

              <p className="mt-4 text-center text-xs" style={{ color: 'var(--text-faint)' }}>
                By creating an account, you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
