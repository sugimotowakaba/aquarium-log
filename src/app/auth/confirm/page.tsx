import { Suspense } from 'react';
import ConfirmInner from './_ConfirmInner';

export const dynamic = 'force-dynamic'; // 事前プリレンダ回避の保険（任意だが推奨）

export const metadata = {
  title: 'サインイン確認',
};

export default function ConfirmPage() {
  return (
    <Suspense fallback={<main className="max-w-md mx-auto p-6">確認中…</main>}>
      <ConfirmInner />
    </Suspense>
  );
}
