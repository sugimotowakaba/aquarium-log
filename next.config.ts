// next.config.ts
import type { NextConfig } from 'next';
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',                  // 生成物を public/ に出力
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 画像最適化のためのリモートホスト許可
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rzadenafnpmfymaxrcnf.supabase.co',
      },
    ],
  },
};

export default withPWA(nextConfig);
