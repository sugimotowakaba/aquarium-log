// src/app/auth/confirm/_ConfirmInner.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Status = 'checking' | 'ok' | 'error';

export default function ConfirmInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');
  const [message, setMessage] = useState('確認中…');

  useEffect(() => {
    (async () => {
      try {
        // クエリとハッシュの両方を見る（#code=... の場合がある）
        const qs = new URLSearchParams(window.location.search);
        const hs = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        const errorParam = sp.get('error') || hs.get('error');
        if (errorParam) {
          setStatus('error');
          setMessage(`認証に失敗しました: ${decodeURIComponent(errorParam)}`);
          return;
        }

        const code = qs.get('code') || hs.get('code');
        const token = qs.get('token') || hs.get('token');
        const typeParam = (qs.get('type') || hs.get('type') || '').toLowerCase();
        const hasMagicToken = !!(token && typeParam === 'magiclink');

        // code も token も無い（= このURL単体では処理できない）
        if (!code && !hasMagicToken) {
          setStatus('error');
          setMessage(
            'このページ単体ではログインできません。最新のメールのリンクを開くか、/auth の「貼り付けログイン」をご利用ください。'
          );
          return;
        }

        // すでにセッションがあればそのまま遷移
        const { data: s1 } = await supabase.auth.getSession();
        if (s1.session) {
          setStatus('ok');
          setMessage('ログイン完了！履歴へ移動します。');
          setTimeout(() => router.replace('/history'), 500);
          return;
        }

        // セッションが無ければ exchange 実行（code でも token(magiclink) でも対応可）
        const { error: exchErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (exchErr) {
          // 代表的な期限切れエラーの補足文
          const hints =
            exchErr.message.includes('expired') || exchErr.message.includes('invalid')
              ? '（古いメールのリンクを開いた/プレビューで消費された可能性があります。最新のメールをお試しください）'
              : '';
          throw new Error(`${exchErr.message} ${hints}`.trim());
        }

        // 念のためセッション再確認
        const { data: s2 } = await supabase.auth.getSession();
        if (!s2.session) {
          throw new Error('セッションの確立に失敗しました。最新のメールで再度お試しください。');
        }

        setStatus('ok');
        setMessage('ログイン完了！履歴へ移動します。');
        setTimeout(() => router.replace('/history'), 500);
      } catch (e) {
        const m = e instanceof Error ? e.message : '予期せぬエラーが発生しました';
        setStatus('error');
        setMessage(m);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold">サインイン確認</h1>
      <p className={status === 'error' ? 'text-red-600 mt-2' : 'text-gray-700 mt-2'}>{message}</p>

      {status === 'error' && (
        <div className="mt-4 text-sm text-gray-600 space-y-2">
          <p>・メールのリンクは<b>最新のもの</b>をご利用ください。</p>
          <p>・iPhoneでホーム画面アプリから使う場合は、/auth の<b>「貼り付けログイン」</b>も便利です。</p>
        </div>
      )}
    </main>
  );
}
