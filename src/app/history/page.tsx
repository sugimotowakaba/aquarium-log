// src/app/history/page.tsx
import { Suspense } from 'react';
import HistoryInner from './_HistoryInner';

export const metadata = { title: '履歴' };
export const dynamic = 'force-dynamic';

export default function HistoryPage() {
  return (
    <Suspense fallback={<main className="max-w-3xl mx-auto p-4">読み込み中…</main>}>
      <HistoryInner />
    </Suspense>
  );
}
