import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Loader, Check, ExternalLink, ArrowLeft, Zap,
  AlertTriangle, CheckCircle, CreditCard, User, Palette,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import PlanBadge from '@/components/PlanBadge';
import { useAuth } from '@/hooks/useAuth';
import type { BrandVoice, PlanName } from '@/types';
import { BRAND_VOICES } from '@/types';

const PLANS = [
  {
    name: 'free' as PlanName,
    label: 'Free',
    price: '$0',
    limit: '3 projects / month',
    features: ['Twitter & LinkedIn', 'Basic outputs', 'Copy & download'],
  },
  {
    name: 'pro' as PlanName,
    label: 'Pro',
    price: '$19/mo',
    limit: '50 projects / month',
    features: ['All 4 channels', 'All brand voices', 'Editable outputs', 'Priority AI'],
    highlight: true,
  },
  {
    name: 'business' as PlanName,
    label: 'Business',
    price: '$49/mo',
    limit: '500 projects / month',
    features: ['Everything in Pro', 'Team sharing (soon)', 'API access (soon)', 'Priority support'],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout, refresh } = useAuth();

  const [fullName,      setFullName]      = useState('');
  const [brandVoice,    setBrandVoice]    = useState<BrandVoice>('professional');
  const [savingProfile, setSavingProfile] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<PlanName | null>(null);
  const upgradeStatus = router.query.upgrade;

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setBrandVoice((user.brand_voice as BrandVoice) || 'professional');
    }
  }, [user]);

  useEffect(() => {
    if (upgradeStatus === 'success') {
      toast.success('🎉 Plan upgraded successfully!', { duration: 6000 });
      refresh();
      router.replace('/settings', undefined, { shallow: true });
    } else if (upgradeStatus === 'canceled') {
      toast('Upgrade canceled.', { icon: '↩️' });
      router.replace('/settings', undefined, { shallow: true });
    }
  }, [refresh, router, upgradeStatus]);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res  = await fetch('/api/user/settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ full_name: fullName, brand_voice: brandVoice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Settings saved.');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpgrade(planName: PlanName) {
    if (planName === 'free') return;
    setUpgradingPlan(planName);
    try {
      const res  = await fetch('/api/billing/create-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: planName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout.');
      setUpgradingPlan(null);
    }
  }

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader size={22} className="animate-spin" style={{ color: 'var(--brand-500)' }} />
        </div>
      </Layout>
    );
  }

  const currentPlan = ((user.plan as any)?.name as PlanName) ?? 'free';
  const planLimit   = (user.plan as any)?.project_limit ?? 3;
  const isActive    = user.subscription_status === 'active';

  return (
    <Layout user={user} onLogout={logout} title="Settings">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>

        <h1 className="page-title text-2xl md:text-3xl mb-8">Account Settings</h1>

        {/* ── Plan & Billing ─────────────────────────────────────────────── */}
        <section className="panel p-6 mb-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)' }}
            >
              <CreditCard size={15} style={{ color: 'var(--brand-500)' }} />
            </div>
            <div className="flex items-center gap-3 flex-1">
              <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Plan &amp; Billing</h2>
              <PlanBadge plan={currentPlan} />
            </div>
          </div>

          {/* Current plan summary */}
          <div
            className="flex items-center gap-4 p-4 rounded-xl mb-5"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-mid)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #00A389, #2ABBA0)' }}
            >
              <Zap size={18} fill="white" className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                {currentPlan} plan
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {planLimit} projects/month · {user.projects_this_month ?? 0} used this month
              </p>
              {user.subscription_ends_at && (
                <p className="text-xs mt-0.5" style={{ color: '#D97706' }}>
                  <AlertTriangle size={11} className="inline mr-1" />
                  Cancels on {new Date(user.subscription_ends_at).toLocaleDateString()}
                </p>
              )}
            </div>
            {isActive && currentPlan !== 'free' && (
              <span
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#D1FAE5', color: '#065F46' }}
              >
                <CheckCircle size={12} /> Active
              </span>
            )}
          </div>

          {/* Plan cards */}
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            {PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.name;
              return (
                <div
                  key={plan.name}
                  className="p-4 rounded-xl flex flex-col gap-3 transition-all"
                  style={{
                    border: isCurrent
                      ? '2px solid var(--brand-400)'
                      : plan.highlight
                      ? '1px solid var(--border-mid)'
                      : '1px solid var(--border-subtle)',
                    background: isCurrent ? 'var(--brand-bg)' : 'var(--bg-input)',
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {plan.label}
                      </span>
                      {isCurrent && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: 'var(--brand-400)', color: 'white' }}
                        >
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {plan.price}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{plan.limit}</p>
                  </div>
                  <ul className="space-y-1 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <Check size={11} style={{ color: 'var(--brand-500)', marginTop: 2 }} className="shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && plan.name !== 'free' && (
                    <button
                      onClick={() => handleUpgrade(plan.name)}
                      disabled={upgradingPlan !== null}
                      className="btn-primary w-full text-xs py-2"
                    >
                      {upgradingPlan === plan.name ? (
                        <Loader size={12} className="animate-spin" />
                      ) : (
                        <><ExternalLink size={11} /> Upgrade to {plan.label}</>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {currentPlan !== 'free' && isActive && (
            <p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>
              To cancel or manage your subscription,{' '}
              <a href="mailto:support@contentrepurposer.ai" className="underline" style={{ color: 'var(--text-muted)' }}>
                contact support
              </a>.
            </p>
          )}
        </section>

        {/* ── Profile ─────────────────────────────────────────────────────── */}
        <form onSubmit={handleSaveProfile}>
          <section className="panel p-6 mb-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: '#EDE9FE', border: '1px solid #DDD6FE' }}
              >
                <User size={15} style={{ color: '#7C3AED' }} />
              </div>
              <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Profile</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="input-label">Email address</label>
                <input type="email" value={user.email} disabled className="input opacity-60 cursor-not-allowed" />
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>Email cannot be changed.</p>
              </div>
              <div>
                <label className="input-label">Full name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
          </section>

          {/* ── Brand voice ── */}
          <section className="panel p-6 mb-5">
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}
              >
                <Palette size={15} style={{ color: '#D97706' }} />
              </div>
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Default Brand Voice</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Default for all new projects. Override per-project on the workspace.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
              {BRAND_VOICES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setBrandVoice(v.value)}
                  className="text-left p-3 rounded-xl transition-all"
                  style={{
                    border: brandVoice === v.value
                      ? '2px solid var(--brand-400)'
                      : '1px solid var(--border-mid)',
                    background: brandVoice === v.value ? 'var(--brand-bg)' : 'var(--bg-input)',
                  }}
                >
                  <div
                    className="font-semibold text-xs mb-0.5"
                    style={{ color: brandVoice === v.value ? 'var(--brand-600)' : 'var(--text-primary)' }}
                  >
                    {v.label}
                  </div>
                  <div className="text-xs leading-tight" style={{ color: 'var(--text-muted)' }}>
                    {v.description}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div className="flex justify-end">
            <button type="submit" disabled={savingProfile} className="btn-primary px-8">
              {savingProfile ? (
                <span className="flex items-center gap-2">
                  <Loader size={14} className="animate-spin" /> Saving…
                </span>
              ) : 'Save settings'}
            </button>
          </div>
        </form>

        {/* ── Danger zone ── */}
        <section
          className="panel p-5 mt-5"
          style={{ borderColor: '#FECACA' }}
        >
          <h2 className="font-bold text-sm mb-3" style={{ color: '#DC2626' }}>Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Log out of your account</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                You&apos;ll need to log back in to access your projects.
              </p>
            </div>
            <button onClick={logout} className="btn-danger text-sm py-2 px-4">Log out</button>
          </div>
        </section>

      </div>
    </Layout>
  );
}
