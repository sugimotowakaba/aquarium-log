// next.config.ts
import type { NextConfig } from 'next';
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/offline',
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 画像の外部ドメインを使う場合はここで許可
  // images: {
  //   remotePatterns: [
  //     { protocol: 'https', hostname: 'YOUR-STORAGE.example.com' },
  //   ],
  // },
};

export default withPWA(nextConfig);
