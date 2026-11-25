import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'totobi.com.ua' },
      { protocol: 'http', hostname: 'totobi.com.ua' },
      { protocol: 'https', hostname: 'toptime.com.ua' },
      { protocol: 'http', hostname: 'toptime.com.ua' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.weserv.nl' },
    ],
  },
};
export default nextConfig;
