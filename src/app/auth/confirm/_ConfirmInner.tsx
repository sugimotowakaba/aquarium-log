'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ConfirmInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'checking'|'ok'|'error'>('checking');
  const [message, setMessage] = useState<string>('確認中…');

  useEffect(() => {
    (async () => {
      try {
        // ハッシュ側(#code=...)にも対応
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const error = sp.get('error') || hashParams.get('error');
        if (error) {
          setStatus('error');
          setMessage(`認証に失敗しました: ${error}`);
          return;
        }

        // すでにセッションある？
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // なければ exchange 実行（code でも token でもOKなAPI）
          const { error: exchErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (exchErr) {
            setStatus('error');
            setMessage(`ログインに失敗しました: ${exchErr.message}`);
            return;
          }
        }

        // ここまで来ればログイン成功
        setStatus('ok');
        setMessage('ログイン完了！');

        // PWA側からの遷移か？（/auth で「Safariでログイン→戻る」押下）
        const fromPwa = sp.get('from') === 'pwa' || new URLSearchParams(window.location.search).get('from') === 'pwa';

        if (fromPwa && window.opener) {
          // 同一オリジンに成功メッセージを送る → PWA側が受け取って遷移
          window.opener.postMessage({ type: 'SUPABASE_SESSION', ok: true }, window.location.origin);
          // 小窓を閉じる（iOSでブロックされる場合もあるが、そのままでOK）
          window.close();
        } else {
          // 直接アクセス/通常のMagic Linkなら履歴へ
          setTimeout(() => router.replace('/history'), 600);
        }
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
      {status === 'ok' && <p className="text-sm text-gray-600 mt-1">このウィンドウは自動で閉じられる場合があります。</p>}
    </main>
  );
}
