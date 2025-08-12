'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '');

export default function AuthInner() {
  // Magic Link 送信用
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 既存の「貼り付けログイン」を残したい場合は、この辺りに state/handler を残してOK

  // ---- 方式B: Safari(新ウィンドウ)でログイン→PWAへ自動同期 ----
  const openConfirmPopup = () => {
    // ユーザー操作発火内で window.open しないとブロックされやすいので注意
    const w = 420, h = 640;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const url = `${BASE_URL}/auth/confirm?from=pwa=1`;
    window.open(url, 'confirm', `width=${w},height=${h},left=${left},top=${top}`);
  };

  // Safari 側から postMessage を受けたら同期完了として遷移
  useEffect(() => {
    const onMsg = async (ev: MessageEvent) => {
      // オリジンチェック（同一オリジンのみ受け付け）
      if (ev.origin !== BASE_URL) return;
      if (!ev?.data || ev.data.type !== 'SUPABASE_SESSION') return;

      try {
        // 念のためセッションを取得して確認（即時反映されているはずだが保険）
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setMsg('ログインしました。履歴へ移動します。');
          setTimeout(() => (window.location.href = '/history'), 300);
        } else {
          setMsg('ログインは完了しました。画面を更新してください。');
        }
      } catch {
        // 失敗しても致命ではないので静かに無視
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const onRequestMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${BASE_URL}/auth/confirm`,
        },
      });
      if (error) throw error;
      setMsg('メールを送信しました。Safariでリンクを開いても、この画面の「Safariでログインして戻る」を押せば自動で同期されます。');
    } catch (e) {
      const m = e instanceof Error ? e.message : '送信に失敗しました';
      setErr(m);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="max-w-md mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-xl font-semibold">サインイン</h1>
        <p className="text-sm text-gray-600 mt-1">
          メールアドレスにMagic Linkを送ります。iPhoneでホーム画面のアプリを使う場合は、下の「Safariでログインして戻る（自動同期）」が便利です。
        </p>
      </header>

      {/* Magic Link 送信フォーム */}
      <section className="space-y-3">
        <form onSubmit={onRequestMagicLink} className="space-y-3">
          <label className="block">
            <span className="text-sm text-gray-700">メールアドレス</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
            />
          </label>
          <button
            type="submit"
            disabled={sending || email.length === 0}
            className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {sending ? '送信中…' : 'Magic Link を送る'}
          </button>
        </form>
        {msg && <p className="text-green-700 text-sm">{msg}</p>}
        {err && <p className="text-red-600 text-sm">{err}</p>}
      </section>

      {/* 方式B：Safariでログイン→自動同期 */}
      <section className="space-y-2 border-t pt-4">
        <button
          type="button"
          onClick={openConfirmPopup}
          className="w-full rounded border px-4 py-2 text-sm"
        >
          Safariでログインして戻る（自動同期）
        </button>
        <p className="text-xs text-gray-500">
          新しいウィンドウでログインが完了すると、この画面に自動で戻ります。
        </p>
      </section>

      {/* 既存の「貼り付けログイン」を併存させたい場合は、この下に残してOK */}
    </main>
  );
}
