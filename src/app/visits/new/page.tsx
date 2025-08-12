// src/app/visits/new/page.tsx
'use client';

import { Suspense } from 'react';
import NewVisitInner from './_NewVisitInner';

export const dynamic = 'force-dynamic'; // ← 念のためSSRのプリレンダ回避（任意だが有効）

export default function NewVisitPage() {
  return (
    <Suspense fallback={<main className="max-w-md mx-auto p-6">読み込み中…</main>}>
      <NewVisitInner />
    </Suspense>
  );
}
