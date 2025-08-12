'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ConfirmInner() {
  const sp = useSearchParams(); // Suspense配下なので安全に使える
  const router = useRouter();
  const [status, setStatus] = useState<'checking'|'ok'|'error'>('checking');
  const [message, setMessage] = useState<string>('確認中…');

  useEffect(() => {
    (async () => {
      try {
        // Supabase の仕様で hash 側に返ることがあるため両方確認
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const error = sp.get('error') || hashParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`認証に失敗しました: ${error}`);
          return;
        }

        // 既にセッションがあればOK
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus('ok');
          setMessage('ログイン完了！履歴へ移動します。');
          setTimeout(() => router.replace('/history'), 600);
          return;
        }

        // なければ Exchange 実行
        const { error: exchErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (exchErr) {
          setStatus('error');
          setMessage(`ログインに失敗しました: ${exchErr.message}`);
          return;
        }

        setStatus('ok');
        setMessage('ログイン完了！履歴へ移動します。');
        setTimeout(() => router.replace('/history'), 600);
      } catch {
        setStatus('error');
        setMessage('予期せぬエラーが発生しました');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold">サインイン確認</h1>
      <p className={status === 'error' ? 'text-red-600 mt-2' : 'text-gray-700 mt-2'}>{message}</p>
    </main>
  );
}
