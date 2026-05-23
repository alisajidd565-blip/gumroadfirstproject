// ─── Domain Types ─────────────────────────────────────────────────────────────

export type Channel = 'twitter' | 'linkedin' | 'instagram' | 'email';

export type SupportedSocialProvider = 'twitter' | 'linkedin';

export type SocialProvider = SupportedSocialProvider | 'instagram';

export type BrandVoice =
  | 'professional'
  | 'casual'
  | 'witty'
  | 'authoritative'
  | 'inspirational'
  | 'educational';

export type PlanName = 'free' | 'pro' | 'business';

export type ProjectStatus = 'pending' | 'processing' | 'done' | 'failed';

export type SubscriptionStatus = 'active' | 'inactive' | 'canceled';

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: PlanName;
  display_name: string;
  price_monthly: number;  // cents
  project_limit: number;
  stripe_price_id: string | null;
  features: string[];
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  plan_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_ends_at: string | null;
  brand_voice: BrandVoice;
  projects_this_month: number;
  month_reset_at: string;
  created_at: string;
  updated_at: string;
  // joined from plans table
  plan?: Plan;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  source_text: string;
  source_url?: string | null;
  channels: Channel[];
  brand_voice: BrandVoice;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  // joined
  outputs?: Output[];
}

export interface Output {
  id: string;
  project_id: string;
  channel: Channel;
  content: string;
  edited: boolean;
  tokens_used: number;
  model_used: string;
  created_at: string;
  updated_at: string;
}

export interface SocialConnection {
  id: string;
  user_id: string;
  provider: SupportedSocialProvider;
  provider_user_id: string;
  display_name: string | null;
  username: string | null;
  scopes: string[] | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialPublication {
  id: string;
  user_id: string;
  output_id: string;
  provider: SupportedSocialProvider;
  provider_post_id: string | null;
  provider_url: string | null;
  status: 'published' | 'failed';
  error: string | null;
  published_at: string | null;
  created_at: string;
}

// ─── API Request / Response Types ────────────────────────────────────────────

export interface ApiError {
  error: string;
  code?: string;
}

export interface ApiSuccess<T = unknown> {
  data: T;
  message?: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  /** Deprecated — auth uses HttpOnly cookie only */
  token?: string;
}

export interface CreateProjectRequest {
  title?: string;
  source_text: string;
  source_url?: string;
  channels: Channel[];
  brand_voice?: BrandVoice;
}

export interface ScrapeRequest {
  url: string;
}

export interface ScrapeResponse {
  title: string;
  text: string;
  word_count: number;
}

export interface GenerateRequest {
  project_id: string;
}

export interface UpdateSettingsRequest {
  full_name?: string;
  brand_voice?: BrandVoice;
}

export interface SocialProviderStatus {
  provider: SocialProvider;
  channel: Channel | null;
  label: string;
  configured: boolean;
  connected: boolean;
  display_name?: string | null;
  username?: string | null;
  expires_at?: string | null;
  disabled_reason?: string;
}

// ─── JWT Payload ──────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;   // user id
  email: string;
  plan: PlanName;
  iat: number;
  exp: number;
}

// ─── Component Prop Types ─────────────────────────────────────────────────────

export interface ChannelConfig {
  id: Channel;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const CHANNEL_CONFIGS: Record<Channel, ChannelConfig> = {
  twitter: {
    id: 'twitter',
    label: 'Twitter / X',
    icon: '𝕏',
    color: 'text-sky-400',
    description: 'Up to 280 chars. Thread-style hook.',
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: 'in',
    color: 'text-blue-500',
    description: 'Professional long-form post with hooks.',
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    icon: '◈',
    color: 'text-pink-500',
    description: 'Visual caption with emojis and hashtags.',
  },
  email: {
    id: 'email',
    label: 'Email Newsletter',
    icon: '✉',
    color: 'text-emerald-400',
    description: 'Subject line + full newsletter body.',
  },
};

export const BRAND_VOICES: { value: BrandVoice; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Formal, expert, polished' },
  { value: 'casual',       label: 'Casual',       description: 'Friendly, conversational, approachable' },
  { value: 'witty',        label: 'Witty',         description: 'Clever, humorous, memorable' },
  { value: 'authoritative',label: 'Authoritative', description: 'Bold, confident, commanding' },
  { value: 'inspirational',label: 'Inspirational', description: 'Motivating, uplifting, aspirational' },
  { value: 'educational',  label: 'Educational',   description: 'Clear, informative, instructive' },
];

export const FREE_PLAN_LIMIT = 3;
export const COOKIE_NAME = 'cr_token';
