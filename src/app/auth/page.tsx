import { Suspense } from 'react';
import AuthInner from './_AuthInner';

export const metadata = {
  title: 'サインイン',
};

export const dynamic = 'force-dynamic'; // 事前プリレンダ回避の保険

export default function AuthPage() {
  return (
    <Suspense fallback={<main className="max-w-md mx-auto p-6">読み込み中…</main>}>
      <AuthInner />
    </Suspense>
  );
}

