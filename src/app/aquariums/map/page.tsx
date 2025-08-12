'use client';

import dynamic from 'next/dynamic';
import OnboardingModal from '@/components/OnboardingModal';

// SSRを切ってクライアントで読み込む（Leaflet対策）
const AquariumMap = dynamic(() => import('@/components/AquariumMap'), { ssr: false });

export default function AquariumsMapPage() {
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">水族館マップ</h1>
        <nav className="text-sm">
          <a className="underline" href="/aquariums">一覧へ</a>
        </nav>
      </header>

      {/* 地図（現在地マーカー＋距離順リストは AquariumMap 内に実装済み） */}
      <AquariumMap />

      {/* 初回オンボーディング（位置情報の案内） */}
      <OnboardingModal />
    </main>
  );
}
