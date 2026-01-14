const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'totobi.com.ua' },
      { protocol: 'http', hostname: 'totobi.com.ua' },
      { protocol: 'https', hostname: 'toptime.com.ua' },
      { protocol: 'http', hostname: 'toptime.com.ua' },
    ],
  },
};
export default nextConfig;

// Force Rebuild 123