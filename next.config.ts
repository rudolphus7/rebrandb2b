import type { NextConfig } from "next";

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'totobi.com.ua',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: 'totobi.com.ua',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '**',
      }
    ],
  },
} satisfies NextConfig;

export default nextConfig;