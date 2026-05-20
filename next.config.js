/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Required for Stripe webhook raw body parsing
  api: {
    bodyParser: false,
  },
  experimental: {
    serverActions: false,
  },
  images: {
    domains: [],
  },
  // Environment variables exposed to the browser (prefix NEXT_PUBLIC_)
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
};

module.exports = nextConfig;
