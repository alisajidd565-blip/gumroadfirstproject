import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Loader, Check, ExternalLink, ArrowLeft, Zap, AlertTriangle, CheckCircle
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

  const [fullName, setFullName] = useState('');
  const [brandVoice, setBrandVoice] = useState<BrandVoice>('professional');
  const [savingProfile, setSavingProfile] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<PlanName | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setBrandVoice((user.brand_voice as BrandVoice) || 'professional');
    }
  }, [user]);

  // Handle Stripe redirect back
  useEffect(() => {
    const { upgrade } = router.query;
    if (upgrade === 'success') {
      toast.success('🎉 Plan upgraded successfully! It may take a moment to reflect.', { duration: 6000 });
      refresh();
      router.replace('/settings', undefined, { shallow: true });
    } else if (upgrade === 'canceled') {
      toast('Upgrade canceled. You can try again anytime.', { icon: '↩️' });
      router.replace('/settings', undefined, { shallow: true });
    }
  }, [router.query]);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, brand_voice: brandVoice }),
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
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planName }),
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
          <Loader size={24} className="text-cyan-400 animate-spin" />
        </div>
      </Layout>
    );
  }

  const currentPlan = ((user.plan as any)?.name as PlanName) ?? 'free';
  const planLimit = (user.plan as any)?.project_limit ?? 3;
  const isActive = user.subscription_status === 'active';

  return (
    <Layout user={user} onLogout={logout} title="Settings">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>

        <h1 className="page-title text-2xl md:text-3xl mb-8">Account settings</h1>

        {/* ── Plan & Billing ─────────────────────────────────────────────── */}
        <section className="card mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-100">Plan & billing</h2>
            <PlanBadge plan={currentPlan} />
          </div>

          {/* Current plan info */}
          <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-xl mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shrink-0">
              <Zap size={18} className="text-slate-950" fill="currentColor" />
            </div>
            <div>
              <p className="font-semibold text-slate-100 capitalize">{currentPlan} plan</p>
              <p className="text-sm text-slate-400">
                {planLimit} projects/month · {user.projects_this_month ?? 0} used this month
              </p>
              {user.subscription_ends_at && (
                <p className="text-xs text-amber-400 mt-0.5">
                  <AlertTriangle size={11} className="inline mr-1" />
                  Cancels on {new Date(user.subscription_ends_at).toLocaleDateString()}
                </p>
              )}
            </div>
            {isActive && currentPlan !== 'free' && (
              <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                <CheckCircle size={13} />
                Active
              </span>
            )}
          </div>

          {/* Plan comparison cards */}
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            {PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.name;
              return (
                <div
                  key={plan.name}
                  className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${
                    isCurrent
                      ? 'border-cyan-500/50 bg-cyan-500/5'
                      : plan.highlight
                      ? 'border-slate-600 bg-slate-800/40'
                      : 'border-slate-700 bg-slate-800/20'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-slate-200 text-sm">{plan.label}</span>
                      {isCurrent && (
                        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs">{plan.price}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{plan.limit}</p>
                  </div>
                  <ul className="space-y-1 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-slate-400">
                        <Check size={11} className="text-cyan-400 mt-0.5 shrink-0" />
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
                        <>
                          <ExternalLink size={11} />
                          Upgrade to {plan.label}
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {currentPlan !== 'free' && isActive && (
            <p className="text-xs text-slate-600 text-center">
              To cancel or manage your subscription,{' '}
              <a
                href="mailto:support@contentrepurposer.ai"
                className="text-slate-400 hover:text-slate-300 underline"
              >
                contact support
              </a>
              .
            </p>
          )}
        </section>

        {/* ── Profile settings ──────────────────────────────────────────── */}
        <form onSubmit={handleSaveProfile}>
          <section className="card mb-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-5">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="input-label">Email address</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="input opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-slate-600 mt-1">Email cannot be changed.</p>
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

          {/* ── Brand voice ──────────────────────────────────────────────── */}
          <section className="card mb-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-1">Default brand voice</h2>
            <p className="text-sm text-slate-500 mb-5">
              This becomes the default tone for all new projects. You can override it per-project.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BRAND_VOICES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setBrandVoice(v.value)}
                  className={`text-left p-3 rounded-lg border text-sm transition-all ${
                    brandVoice === v.value
                      ? 'border-cyan-500 bg-cyan-500/10 text-slate-100'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="font-semibold text-xs mb-0.5">{v.label}</div>
                  <div className="text-xs text-slate-500 leading-tight">{v.description}</div>
                </button>
              ))}
            </div>
          </section>

          <div className="flex justify-end">
            <button type="submit" disabled={savingProfile} className="btn-primary px-8">
              {savingProfile ? (
                <span className="flex items-center gap-2">
                  <Loader size={14} className="animate-spin" />
                  Saving…
                </span>
              ) : 'Save settings'}
            </button>
          </div>
        </form>

        {/* ── Danger zone ───────────────────────────────────────────────── */}
        <section className="card border-red-500/20 mt-6">
          <h2 className="text-base font-semibold text-slate-300 mb-3">Danger zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Log out of your account</p>
              <p className="text-xs text-slate-600">You&apos;ll need to log back in to access your projects.</p>
            </div>
            <button onClick={logout} className="btn-danger text-sm py-2 px-4">
              Log out
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
