import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Дозволяємо збірку навіть якщо є помилки ESLint (невикористані змінні і т.д.) */
  eslint: {
    ignoreDuringBuilds: true,
  },
  /* Дозволяємо збірку навіть якщо є помилки типів TypeScript */
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;