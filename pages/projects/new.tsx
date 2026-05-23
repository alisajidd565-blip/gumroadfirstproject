import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Zap, AlertTriangle, Loader, Link2, Type, Globe, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import ChannelSelector from '@/components/ChannelSelector';
import { useAuth } from '@/hooks/useAuth';
import type { Channel, BrandVoice, PlanName } from '@/types';
import { BRAND_VOICES } from '@/types';
import { ALLOWED_CHANNELS_BY_PLAN } from '@/lib/plans';

const MIN_TEXT_LENGTH = 50;
const MAX_TEXT_LENGTH = 20000;

type InputMode = 'text' | 'url';

export default function NewProjectPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [title, setTitle] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['twitter', 'linkedin']);
  const [brandVoice, setBrandVoice] = useState<BrandVoice>('professional');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'creating' | 'generating'>('idle');

  // URL import state
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [articleUrl, setArticleUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeSuccess, setScrapeSuccess] = useState<{ wordCount: number; domain: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  // Pre-fill brand voice from user settings
  useEffect(() => {
    if (user?.brand_voice) setBrandVoice(user.brand_voice as BrandVoice);
  }, [user]);

  const planName = ((user?.plan as { name?: PlanName })?.name ?? 'free') as PlanName;
  const allowedChannels = ALLOWED_CHANNELS_BY_PLAN[planName];

  useEffect(() => {
    if (!user) return;
    setChannels((prev) => prev.filter((c) => allowedChannels.includes(c)));
  }, [user, planName, allowedChannels]);

  const textLength = sourceText.trim().length;
  const textValid = textLength >= MIN_TEXT_LENGTH;
  const textTooLong = textLength > MAX_TEXT_LENGTH;
  const channelsValid = channels.length > 0;
  const canSubmit = textValid && !textTooLong && channelsValid && !loading && !scraping;

  /** Fetch article content from a URL */
  async function handleScrape() {
    if (!articleUrl.trim() || scraping) return;

    setScraping(true);
    setScrapeError(null);
    setScrapeSuccess(null);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ url: articleUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract article content.');
      }

      // Populate the form with scraped content
      setSourceText(data.text);
      if (data.title && !title.trim()) {
        setTitle(data.title);
      }

      // Extract domain for success message
      let domain = '';
      try {
        domain = new URL(articleUrl.trim()).hostname.replace(/^www\./, '');
      } catch { /* ignore */ }

      setScrapeSuccess({ wordCount: data.word_count, domain });
      toast.success(`Article extracted — ${data.word_count.toLocaleString()} words`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to extract article content.';
      setScrapeError(msg);
      toast.error(msg, { duration: 5000 });
    } finally {
      setScraping(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setStep('creating');

    try {
      // 1. Create the project record
      const createRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          title: title.trim() || undefined,
          source_text: sourceText.trim(),
          source_url: inputMode === 'url' && articleUrl.trim() ? articleUrl.trim() : undefined,
          channels,
          brand_voice: brandVoice,
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        if (createRes.status === 403 && createData.code === 'PLAN_LIMIT_REACHED') {
          toast.error(createData.error, { duration: 6000 });
          router.push('/settings');
          return;
        }
        if (createRes.status === 403 && createData.code === 'CHANNEL_NOT_ALLOWED') {
          toast.error(createData.error, { duration: 6000 });
          return;
        }
        throw new Error(createData.error || 'Failed to create project.');
      }

      const { project } = createData;

      // 2. Trigger AI generation
      setStep('generating');

      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ project_id: project.id }),
      });

      const genData = await genRes.json();

      if (!genRes.ok) {
        throw new Error(genData.error || 'AI generation failed.');
      }

      if (genData.warnings) {
        toast(genData.warnings, { icon: '⚠️' });
      }

      toast.success('Content generated successfully!');
      router.push(`/projects/${project.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
      setStep('idle');
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

  const planLimit = (user.plan as { project_limit?: number })?.project_limit ?? 3;
  const atLimit = user.projects_this_month >= planLimit;

  const isValidUrl = (() => {
    try {
      const u = new URL(articleUrl.trim());
      return ['http:', 'https:'].includes(u.protocol);
    } catch {
      return false;
    }
  })();

  return (
    <Layout user={user} onLogout={logout} title="New Project">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Back link */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors">
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>

        {/* Plan limit warning */}
        {atLimit && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-6">
            <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-300 mb-1">Monthly limit reached</p>
              <p className="text-sm text-amber-400/80">
                You&apos;ve used all {planLimit} projects for this month on the{' '}
                <span className="font-semibold capitalize">{planName}</span> plan.{' '}
                <Link href="/settings" className="underline font-semibold hover:text-amber-300">
                  Upgrade to continue
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="page-title text-2xl md:text-3xl mb-1">New project</h1>
          <p className="text-slate-500 text-sm">
            Paste your content or import from a URL, choose your channels, and let AI do the work.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── Step 1: Source text ──────────────────────────────────────── */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">1</span>
              <h2 className="font-semibold text-slate-100">Source content</h2>
            </div>

            {/* ── Input mode toggle ──────────────────────────────────────── */}
            <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => { setInputMode('text'); setScrapeError(null); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                  inputMode === 'text'
                    ? 'bg-slate-700 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Type size={14} />
                Paste Text
              </button>
              <button
                type="button"
                onClick={() => { setInputMode('url'); setScrapeError(null); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                  inputMode === 'url'
                    ? 'bg-slate-700 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Link2 size={14} />
                Import from URL
              </button>
            </div>

            {/* ── URL input (shown in URL mode) ─────────────────────────── */}
            {inputMode === 'url' && (
              <div className="space-y-3 animate-fade-in">
                <div>
                  <label htmlFor="article-url" className="input-label">
                    Article URL
                    <span className="text-slate-600 font-normal ml-1">
                      (blog post, news article, documentation…)
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        id="article-url"
                        type="url"
                        className="input pl-9"
                        placeholder="https://example.com/blog/your-article"
                        value={articleUrl}
                        onChange={(e) => {
                          setArticleUrl(e.target.value);
                          setScrapeError(null);
                          setScrapeSuccess(null);
                        }}
                        disabled={loading || scraping}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleScrape}
                      disabled={!isValidUrl || scraping || loading}
                      className="btn-secondary whitespace-nowrap px-4 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {scraping ? (
                        <span className="flex items-center gap-2">
                          <Loader size={14} className="animate-spin" />
                          Fetching…
                        </span>
                      ) : (
                        'Fetch Article'
                      )}
                    </button>
                  </div>
                </div>

                {/* Scrape error */}
                {scrapeError && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-fade-in">
                    <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-300 leading-relaxed">{scrapeError}</p>
                  </div>
                )}

                {/* Scrape success */}
                {scrapeSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-fade-in">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-300">
                      Extracted {scrapeSuccess.wordCount.toLocaleString()} words
                      {scrapeSuccess.domain ? ` from ${scrapeSuccess.domain}` : ''}
                      . Review and edit below.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Project title ──────────────────────────────────────────── */}
            <div>
              <label htmlFor="title" className="input-label">Project title (optional)</label>
              <input
                id="title"
                type="text"
                className="input"
                placeholder="e.g. Q4 marketing post"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                maxLength={120}
              />
            </div>

            {/* ── Textarea (always shown, populated by scrape in URL mode) ── */}
            <div>
              <label htmlFor="source" className="input-label">
                {inputMode === 'url' && scrapeSuccess
                  ? 'Extracted content (review & edit)'
                  : 'Paste your content'}
                {inputMode === 'text' && (
                  <span className="text-slate-600 font-normal ml-1">
                    (blog post, article, notes…)
                  </span>
                )}
              </label>
              <textarea
                id="source"
                className="textarea h-56"
                placeholder={
                  inputMode === 'url'
                    ? 'Paste a URL above and click "Fetch Article" to auto-fill this field. You can also edit the extracted content here.'
                    : 'Paste your blog post, article, or any long-form content here. The more context you give, the better the AI outputs will be. Minimum 50 characters.'
                }
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                disabled={loading}
              />
              <div className="flex items-center justify-between mt-1.5">
                <div>
                  {sourceText.length > 0 && !textValid && (
                    <p className="text-xs text-amber-400">
                      At least {MIN_TEXT_LENGTH} characters required ({textLength} so far)
                    </p>
                  )}
                  {textTooLong && (
                    <p className="text-xs text-red-400">
                      Content too long. Max {MAX_TEXT_LENGTH.toLocaleString()} characters.
                    </p>
                  )}
                </div>
                <span className={`text-xs font-mono ${textTooLong ? 'text-red-400' : 'text-slate-600'}`}>
                  {textLength.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* ── Step 2: Channel selection ────────────────────────────────── */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">2</span>
              <h2 className="font-semibold text-slate-100">Target channels</h2>
            </div>
            <p className="text-sm text-slate-500 -mt-2">
              Select all the platforms you want content for.
            </p>
            {planName === 'free' && (
              <p className="text-xs text-slate-500 -mt-2 mb-2">
                Free plan: Twitter and LinkedIn only.{' '}
                <Link href="/settings" className="text-cyan-400 hover:text-cyan-300">Upgrade</Link> for all channels.
              </p>
            )}
            <ChannelSelector
              selected={channels}
              onChange={setChannels}
              disabled={loading}
              planName={planName}
            />
            {!channelsValid && (
              <p className="text-xs text-amber-400">Select at least one channel.</p>
            )}
          </div>

          {/* ── Step 3: Brand voice ──────────────────────────────────────── */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">3</span>
              <h2 className="font-semibold text-slate-100">Brand voice</h2>
            </div>
            <p className="text-sm text-slate-500 -mt-2">
              The tone and style of all generated content.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BRAND_VOICES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => !loading && setBrandVoice(v.value)}
                  disabled={loading}
                  className={`text-left p-3 rounded-lg border text-sm transition-all ${
                    brandVoice === v.value
                      ? 'border-cyan-500 bg-cyan-500/10 text-slate-100'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="font-semibold text-xs mb-0.5">{v.label}</div>
                  <div className="text-xs text-slate-500 leading-tight">{v.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Submit ───────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit || atLimit}
              className="btn-primary px-8 py-3 text-base shadow-xl shadow-cyan-500/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader size={16} className="animate-spin" />
                  {step === 'creating' ? 'Creating project…' : 'Generating content…'}
                </span>
              ) : (
                <>
                  <Zap size={16} fill="currentColor" />
                  Generate content
                </>
              )}
            </button>
          </div>

          {loading && (
            <div className="card border-cyan-500/20 bg-cyan-500/5 text-center py-6 animate-pulse-slow">
              <Zap size={20} className="text-cyan-400 mx-auto mb-2" fill="currentColor" />
              <p className="text-sm text-cyan-300 font-medium">
                {step === 'creating'
                  ? 'Setting up your project…'
                  : `AI is generating content for ${channels.length} channel${channels.length > 1 ? 's' : ''}. This takes 10–30 seconds.`}
              </p>
            </div>
          )}
        </form>
      </div>
    </Layout>
  );
}


const MIN_TEXT_LENGTH = 50;
const MAX_TEXT_LENGTH = 20000;

export default function NewProjectPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [title, setTitle] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['twitter', 'linkedin']);
  const [brandVoice, setBrandVoice] = useState<BrandVoice>('professional');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'creating' | 'generating'>('idle');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  // Pre-fill brand voice from user settings
  useEffect(() => {
    if (user?.brand_voice) setBrandVoice(user.brand_voice as BrandVoice);
  }, [user]);

  const planName = ((user?.plan as { name?: PlanName })?.name ?? 'free') as PlanName;
  const allowedChannels = ALLOWED_CHANNELS_BY_PLAN[planName];

  useEffect(() => {
    if (!user) return;
    setChannels((prev) => prev.filter((c) => allowedChannels.includes(c)));
  }, [user, planName, allowedChannels]);

  const textLength = sourceText.trim().length;
  const textValid = textLength >= MIN_TEXT_LENGTH;
  const textTooLong = textLength > MAX_TEXT_LENGTH;
  const channelsValid = channels.length > 0;
  const canSubmit = textValid && !textTooLong && channelsValid && !loading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setStep('creating');

    try {
      // 1. Create the project record
      const createRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          title: title.trim() || undefined,
          source_text: sourceText.trim(),
          channels,
          brand_voice: brandVoice,
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        if (createRes.status === 403 && createData.code === 'PLAN_LIMIT_REACHED') {
          toast.error(createData.error, { duration: 6000 });
          router.push('/settings');
          return;
        }
        if (createRes.status === 403 && createData.code === 'CHANNEL_NOT_ALLOWED') {
          toast.error(createData.error, { duration: 6000 });
          return;
        }
        throw new Error(createData.error || 'Failed to create project.');
      }

      const { project } = createData;

      // 2. Trigger AI generation
      setStep('generating');

      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ project_id: project.id }),
      });

      const genData = await genRes.json();

      if (!genRes.ok) {
        throw new Error(genData.error || 'AI generation failed.');
      }

      if (genData.warnings) {
        toast(genData.warnings, { icon: '⚠️' });
      }

      toast.success('Content generated successfully!');
      router.push(`/projects/${project.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
      setStep('idle');
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

  const planLimit = (user.plan as { project_limit?: number })?.project_limit ?? 3;
  const atLimit = user.projects_this_month >= planLimit;

  return (
    <Layout user={user} onLogout={logout} title="New Project">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Back link */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors">
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>

        {/* Plan limit warning */}
        {atLimit && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-6">
            <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-300 mb-1">Monthly limit reached</p>
              <p className="text-sm text-amber-400/80">
                You&apos;ve used all {planLimit} projects for this month on the{' '}
                <span className="font-semibold capitalize">{planName}</span> plan.{' '}
                <Link href="/settings" className="underline font-semibold hover:text-amber-300">
                  Upgrade to continue
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="page-title text-2xl md:text-3xl mb-1">New project</h1>
          <p className="text-slate-500 text-sm">
            Paste your content, choose your channels, and let AI do the work.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── Step 1: Source text ──────────────────────────────────────── */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">1</span>
              <h2 className="font-semibold text-slate-100">Source content</h2>
            </div>

            <div>
              <label htmlFor="title" className="input-label">Project title (optional)</label>
              <input
                id="title"
                type="text"
                className="input"
                placeholder="e.g. Q4 marketing post"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                maxLength={120}
              />
            </div>

            <div>
              <label htmlFor="source" className="input-label">
                Paste your content
                <span className="text-slate-600 font-normal ml-1">
                  (blog post, article, notes…)
                </span>
              </label>
              <textarea
                id="source"
                className="textarea h-56"
                placeholder="Paste your blog post, article, or any long-form content here. The more context you give, the better the AI outputs will be. Minimum 50 characters."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                disabled={loading}
              />
              <div className="flex items-center justify-between mt-1.5">
                <div>
                  {sourceText.length > 0 && !textValid && (
                    <p className="text-xs text-amber-400">
                      At least {MIN_TEXT_LENGTH} characters required ({textLength} so far)
                    </p>
                  )}
                  {textTooLong && (
                    <p className="text-xs text-red-400">
                      Content too long. Max {MAX_TEXT_LENGTH.toLocaleString()} characters.
                    </p>
                  )}
                </div>
                <span className={`text-xs font-mono ${textTooLong ? 'text-red-400' : 'text-slate-600'}`}>
                  {textLength.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* ── Step 2: Channel selection ────────────────────────────────── */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">2</span>
              <h2 className="font-semibold text-slate-100">Target channels</h2>
            </div>
            <p className="text-sm text-slate-500 -mt-2">
              Select all the platforms you want content for.
            </p>
            {planName === 'free' && (
              <p className="text-xs text-slate-500 -mt-2 mb-2">
                Free plan: Twitter and LinkedIn only.{' '}
                <Link href="/settings" className="text-cyan-400 hover:text-cyan-300">Upgrade</Link> for all channels.
              </p>
            )}
            <ChannelSelector
              selected={channels}
              onChange={setChannels}
              disabled={loading}
              planName={planName}
            />
            {!channelsValid && (
              <p className="text-xs text-amber-400">Select at least one channel.</p>
            )}
          </div>

          {/* ── Step 3: Brand voice ──────────────────────────────────────── */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">3</span>
              <h2 className="font-semibold text-slate-100">Brand voice</h2>
            </div>
            <p className="text-sm text-slate-500 -mt-2">
              The tone and style of all generated content.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BRAND_VOICES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => !loading && setBrandVoice(v.value)}
                  disabled={loading}
                  className={`text-left p-3 rounded-lg border text-sm transition-all ${
                    brandVoice === v.value
                      ? 'border-cyan-500 bg-cyan-500/10 text-slate-100'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="font-semibold text-xs mb-0.5">{v.label}</div>
                  <div className="text-xs text-slate-500 leading-tight">{v.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Submit ───────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit || atLimit}
              className="btn-primary px-8 py-3 text-base shadow-xl shadow-cyan-500/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader size={16} className="animate-spin" />
                  {step === 'creating' ? 'Creating project…' : 'Generating content…'}
                </span>
              ) : (
                <>
                  <Zap size={16} fill="currentColor" />
                  Generate content
                </>
              )}
            </button>
          </div>

          {loading && (
            <div className="card border-cyan-500/20 bg-cyan-500/5 text-center py-6 animate-pulse-slow">
              <Zap size={20} className="text-cyan-400 mx-auto mb-2" fill="currentColor" />
              <p className="text-sm text-cyan-300 font-medium">
                {step === 'creating'
                  ? 'Setting up your project…'
                  : `AI is generating content for ${channels.length} channel${channels.length > 1 ? 's' : ''}. This takes 10–30 seconds.`}
              </p>
            </div>
          )}
        </form>
      </div>
    </Layout>
  );
}
