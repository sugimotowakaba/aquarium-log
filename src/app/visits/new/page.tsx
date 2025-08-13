// src/app/visits/new/page.tsx
import { Suspense } from 'react';
import NewVisitInner from './_NewVisitInner';

export const metadata = { title: '記録する' };
export const dynamic = 'force-dynamic';

export default function NewVisitPage() {
  return (
    <Suspense fallback={<main className="max-w-3xl mx-auto p-4">読み込み中…</main>}>
      <NewVisitInner />
    </Suspense>
  );
}
