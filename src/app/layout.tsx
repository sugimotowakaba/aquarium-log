import './globals.css';
import type { Metadata, Viewport } from 'next';
import TopNav from '@/components/TopNav';

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
  // ← ここには themeColor / viewport はもう書かない
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0ea5e9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* 参考：link は残してOK（重複しても害なし） */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#0ea5e9" />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
        <TopNav />
        {/* 固定ヘッダー分の余白（12 = 48px） */}
        <div className="pt-12"></div>
        <div className="mx-auto max-w-3xl px-4">{children}</div>
        </div>
      </body>
    </html>
  );
}
