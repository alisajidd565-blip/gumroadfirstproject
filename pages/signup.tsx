import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { Zap, Eye, EyeOff, Check } from 'lucide-react';
import Layout from '@/components/Layout';
export default function SignupPage() {
  const router = useRouter();
  const upgradePlan = router.query.plan as string | undefined;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password strength checks
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const passwordStrong = Object.values(checks).every(Boolean);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!passwordStrong) {
      toast.error('Please meet all password requirements.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: email.trim(), password, full_name: fullName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        const hint =
          data.code === 'PLAN_SETUP_REQUIRED'
            ? ' Run schema.sql in Supabase, or visit /api/setup/status to diagnose.'
            : '';
        toast.error((data.error || 'Signup failed. Please try again.') + hint, { duration: 8000 });
        return;
      }

      toast.success('Account created! Welcome.');
      if (upgradePlan === 'pro' || upgradePlan === 'business') {
        router.push(`/settings?upgrade=${upgradePlan}`);
      } else {
        router.push('/dashboard');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout showFooter={false} title="Create account">
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Zap size={18} className="text-slate-950" fill="currentColor" />
              </div>
              <span className="font-semibold text-slate-100 text-lg">
                ContentRepurposer<span className="text-cyan-400"> AI</span>
              </span>
            </Link>
          </div>

          <div className="card">
            <h1 className="text-xl font-semibold text-slate-100 mb-1">Create your account</h1>
            <p className="text-sm text-slate-500 mb-6">Free forever. No credit card required.</p>

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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password requirements */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {[
                      { ok: checks.length,    label: 'At least 8 characters' },
                      { ok: checks.uppercase, label: 'One uppercase letter' },
                      { ok: checks.number,    label: 'One number' },
                    ].map((c) => (
                      <div key={c.label} className="flex items-center gap-1.5">
                        <Check
                          size={12}
                          className={c.ok ? 'text-cyan-400' : 'text-slate-600'}
                        />
                        <span className={`text-xs ${c.ok ? 'text-slate-400' : 'text-slate-600'}`}>
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
                className="btn-primary w-full py-2.5 mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    Creating account…
                  </span>
                ) : 'Create account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
                Log in
              </Link>
            </p>

            <p className="mt-4 text-center text-xs text-slate-600 leading-relaxed">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-cyan-500 hover:text-cyan-400">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-cyan-500 hover:text-cyan-400">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
