import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Тут можуть бути images, env, тощо.
  // Але БЕЗ ключа 'eslint'
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;