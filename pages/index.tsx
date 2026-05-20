import Link from 'next/link';
import { Zap, Twitter, Linkedin, Instagram, Mail, ArrowRight, Check } from 'lucide-react';
import Layout from '@/components/Layout';

const FEATURES = [
  {
    icon: '⚡',
    title: 'GPT-4 Powered',
    description: 'Not generic AI. Platform-specific prompt engineering that understands what makes content perform on each channel.',
  },
  {
    icon: '🎯',
    title: 'Channel-Optimized',
    description: 'Each platform has its own format, tone, and algorithm. Our outputs are tuned for each — not just copy-pasted.',
  },
  {
    icon: '✏️',
    title: 'Fully Editable',
    description: 'Generated outputs are editable in-app. Tweak, refine, and copy directly to your clipboard.',
  },
  {
    icon: '🎨',
    title: 'Brand Voice Control',
    description: 'Set your brand voice once — professional, witty, authoritative — and every output reflects it.',
  },
  {
    icon: '📊',
    title: 'Project History',
    description: 'All your past repurposing projects saved in your dashboard. Revisit, re-generate, or download anytime.',
  },
  {
    icon: '🔒',
    title: 'Secure by Design',
    description: 'Your content never trains any model. All content is encrypted at rest. Your IP stays yours.',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    description: 'Get started and see what AI repurposing can do.',
    cta: 'Start free',
    href: '/signup',
    highlight: false,
    features: [
      '3 projects per month',
      'Twitter & LinkedIn outputs',
      'Copy & download',
      'Standard AI quality',
    ],
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For content creators and solo operators who publish consistently.',
    cta: 'Start Pro',
    href: '/signup?plan=pro',
    highlight: true,
    features: [
      '50 projects per month',
      'All 4 channels',
      'All brand voices',
      'Editable outputs',
      'Priority AI (faster)',
      'Project history',
    ],
  },
  {
    name: 'Business',
    price: '$49',
    period: '/month',
    description: 'For agencies and teams with high-volume content needs.',
    cta: 'Start Business',
    href: '/signup?plan=business',
    highlight: false,
    features: [
      '500 projects per month',
      'Everything in Pro',
      'Team sharing (coming soon)',
      'API access (coming soon)',
      'Priority support',
    ],
  },
];

const CHANNELS = [
  { icon: <Twitter size={20} />, label: 'Twitter / X', color: 'text-sky-400' },
  { icon: <Linkedin size={20} />, label: 'LinkedIn', color: 'text-blue-500' },
  { icon: <Instagram size={20} />, label: 'Instagram', color: 'text-pink-400' },
  { icon: <Mail size={20} />, label: 'Email', color: 'text-emerald-400' },
];

export default function HomePage() {
  return (
    <Layout showFooter title="ContentRepurposer AI — Turn One Post Into Four">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 md:py-36">
        {/* Background effects */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-8">
            <Zap size={12} className="text-cyan-400" fill="currentColor" />
            <span className="text-xs font-semibold text-cyan-400 tracking-wide uppercase">
              Powered by GPT-4 Turbo
            </span>
          </div>

          {/* Headline */}
          <h1 className="page-title text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal leading-tight mb-6 text-slate-50">
            One post.
            <br />
            <em className="not-italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300">
              Four channels.
            </em>
            <br />
            Seconds.
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Paste any blog post or article. Select Twitter, LinkedIn, Instagram, or Email.
            Get platform-optimized content — instantly — with your brand voice built in.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup" className="btn-primary text-base px-8 py-3 shadow-xl shadow-cyan-500/20">
              Start repurposing free
              <ArrowRight size={16} />
            </Link>
            <Link href="#features" className="btn-ghost text-base">
              See how it works
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-8 text-sm text-slate-600">
            No credit card required · 3 free projects/month · Cancel anytime
          </p>

          {/* Channel pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            {CHANNELS.map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-full px-4 py-2"
              >
                <span className={c.color}>{c.icon}</span>
                <span className="text-sm text-slate-300 font-medium">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="page-title text-3xl md:text-4xl mb-4">Three steps. No friction.</h2>
            <p className="text-slate-400">Content repurposing used to take hours. Now it takes seconds.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Paste your content',
                description: 'Drop in your blog post, article, or any long-form text. Even a rough draft works.',
              },
              {
                step: '02',
                title: 'Pick your channels',
                description: 'Select which platforms you\'re posting to. All 4 or just one — your choice.',
              },
              {
                step: '03',
                title: 'Copy and publish',
                description: 'Your platform-perfect content appears in seconds. Edit if needed. Copy. Done.',
              },
            ].map((item) => (
              <div key={item.step} className="relative group">
                <div className="card h-full group-hover:border-slate-700 transition-colors">
                  <div className="text-4xl font-bold text-slate-800 mb-4 font-mono">{item.step}</div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="page-title text-3xl md:text-4xl mb-4">Built for content that performs</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Not just another AI wrapper. Every feature is designed to produce content that actually drives engagement.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="card hover:border-slate-700 transition-colors">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-slate-100 mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="page-title text-3xl md:text-4xl mb-4">Simple, transparent pricing</h2>
            <p className="text-slate-400">Start free. Upgrade when you need more.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`card flex flex-col relative ${
                  plan.highlight
                    ? 'border-cyan-500/50 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500/20'
                    : ''
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-cyan-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-full">
                      Most popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-slate-100 text-lg mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-slate-50">{plan.price}</span>
                    <span className="text-slate-500 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-sm text-slate-400">{plan.description}</p>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <Check size={16} className="text-cyan-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={plan.highlight ? 'btn-primary' : 'btn-secondary'}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="page-title text-3xl md:text-4xl mb-4">
            Your content, everywhere it should be.
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            Stop writing from scratch for every platform. Start with one post and let AI do the rest.
          </p>
          <Link href="/signup" className="btn-primary text-base px-8 py-3 shadow-xl shadow-cyan-500/20">
            Get started for free
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </Layout>
  );
}
