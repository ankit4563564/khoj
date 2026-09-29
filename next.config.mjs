import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the project root so Next.js doesn't get confused by lockfiles
  // in parent directories (fixes @/ path alias resolution on Render/Linux).
  outputFileTracingRoot: __dirname,
  webpack: (config) => {
    // Safely externalize node:sqlite regardless of whether externals is
    // an array, undefined, or a function (varies by Next.js build target).
    const sqliteExternal = { 'node:sqlite': 'commonjs node:sqlite' };
    if (Array.isArray(config.externals)) {
      config.externals.push(sqliteExternal);
    } else {
      config.externals = [
        ...(config.externals ? [config.externals] : []),
        sqliteExternal,
      ];
    }
    return config;
  },
  images: {
    domains: ['images.unsplash.com'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

