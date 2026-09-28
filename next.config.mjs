/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push({ 'node:sqlite': 'commonjs node:sqlite' });
    return config;
  },
  images: {
    domains: ['images.unsplash.com'],
  },
};

export default nextConfig;
