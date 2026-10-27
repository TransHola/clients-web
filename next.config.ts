import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@transhola/ui"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: "standalone",
  experimental: {
    externalDir: true,
  },
  async rewrites() {
    const isProd = process.env.NODE_ENV === 'production' || !!process.env.KUBERNETES_SERVICE_HOST;
    let supabaseUrl = 
      process.env.SUPABASE_INTERNAL_URL || 
      process.env.SUPABASE_URL || 
      (isProd ? 'http://supabase-kong:8000' : 'http://127.0.0.1:54321');

    if (isProd && (supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost'))) {
      supabaseUrl = 'http://supabase-kong:8000';
    }

    return [
      {
        source: '/auth/v1/:path*',
        destination: `${supabaseUrl}/auth/v1/:path*`,
      },
      {
        source: '/rest/v1/:path*',
        destination: `${supabaseUrl}/rest/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/api/health',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
