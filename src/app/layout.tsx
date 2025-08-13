// src/app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import BottomTab from '@/components/BottomTab';

export const metadata: Metadata = {
  title: 'SuizokuLog（すいぞくログ）',
  description: '訪れた水族館を記録・バッジ化して楽しめるアプリ',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'SuizokuLog' },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/icons/icon-192.png' },
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0ea5e9',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        {/* manifest などは冗長でもOK */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#0ea5e9" />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {/* ページ本体は中央寄せ（モバイル幅） */}
        <main className="mx-auto max-w-[420px] px-4 pb-28 pt-4">
          {children}
        </main>

        {/* 下ナビ（使わないなら削除OK） */}
        <BottomTab />
      </body>
    </html>
  );
}
