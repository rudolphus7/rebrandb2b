import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 👇 ДОДАЙ ЦЕЙ БЛОК
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'totobi.com.ua',
        pathname: '**',
      },
      {
        protocol: 'http', // На всяк випадок дозволимо і http, хоча ми його замінили
        hostname: 'totobi.com.ua',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Для банерів
        pathname: '**',
      }
    ],
  },
};

export default nextConfig;