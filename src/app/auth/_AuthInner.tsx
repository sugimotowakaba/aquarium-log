// src/app/auth/_AuthInner.tsx
'use client';

import { useState /*, useEffect*/ } from 'react';
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

  // 貼り付けログイン（方式A）
  const [pastedUrl, setPastedUrl] = useState('');
  const [pasting, setPasting] = useState(false);
  const [pasteErr, setPasteErr] = useState<string | null>(null);

  const onRequestMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${BASE_URL}/auth/confirm` },
      });
      if (error) throw error;
      setMsg(
        'メールを送信しました。iPhoneのホーム画面アプリで使う場合は、メール内の「URL文字列」をコピーして下の「貼り付けログイン」を使うとSafariに移動せず完了できます。'
      );
    } catch (e) {
      const m = e instanceof Error ? e.message : '送信に失敗しました';
      setErr(m);
    } finally {
      setSending(false);
    }
  };

  // URLの形式に応じて処理（code=... か token=...&type=magiclink）
  const parseURLParams = (raw: string) => {
    try {
      const u = new URL(raw);
      const q = u.searchParams;
      const h = new URLSearchParams((u.hash || '').replace(/^#/, ''));
      return { q, h };
    } catch {
      return { q: new URLSearchParams(), h: new URLSearchParams() };
    }
  };

  const onPasteLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasting(true);
    setPasteErr(null);
    setMsg(null);
    try {
      const url = pastedUrl.trim();
      if (!/^https?:\/\//i.test(url)) throw new Error('メール本文のリンクURLをそのまま貼り付けてください。');

      const { q, h } = parseURLParams(url);
      const code = q.get('code') || h.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) throw error;
        setMsg('ログインしました。履歴へ移動します。');
        setTimeout(() => (window.location.href = '/history'), 400);
        return;
      }

      const token = q.get('token') || h.get('token');
      const type = (q.get('type') || h.get('type') || '').toLowerCase();
      if (token && type === 'magiclink') {
        const { data, error } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: token });
        if (error) throw error;
        if (!data?.session) {
          const { data: s } = await supabase.auth.getSession();
          if (!s.session) throw new Error('セッションの確立に失敗しました。最新のメールで再度お試しください。');
        }
        setMsg('ログインしました。履歴へ移動します。');
        setTimeout(() => (window.location.href = '/history'), 400);
        return;
      }

      throw new Error('このリンク形式には対応していません。最新のメールからURL文字列をコピーしてお試しください。');
    } catch (e) {
      const m = e instanceof Error ? e.message : '貼り付けログインに失敗しました';
      setPasteErr(m);
    } finally {
      setPasting(false);
    }
  };

  // （方式Bは一旦オフ：必要になったらコメント解除）
  /*
  const openConfirmPopup = () => {
    const w = 420, h = 640;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top  = window.screenY + (window.outerHeight - h) / 2;
    const url = `/auth/confirm?from=pwa=1`; // 相対URL
    window.open(url, 'confirm', `width=${w},height=${h},left=${left},top=${top}`);
  };

  useEffect(() => {
    const onMsg = async (ev: MessageEvent) => {
      if (ev.origin !== BASE_URL) return;
      if (!ev?.data || ev.data.type !== 'SUPABASE_SESSION') return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setMsg('ログインしました。履歴へ移動します。');
        setTimeout(() => (window.location.href = '/history'), 300);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);
  */

  return (
    <main className="max-w-md mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-xl font-semibold">サインイン</h1>
        <p className="text-sm text-gray-600 mt-1">
          メールにMagic Linkを送ります。ホーム画面アプリをお使いの場合は、下の<b>貼り付けログイン</b>が便利です。
        </p>
      </header>

      {/* Magic Link 送信 */}
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

      {/* 貼り付けログイン（方式A） */}
      <section className="space-y-2 border-t pt-4">
        <p className="text-sm text-gray-700">
          iPhoneでホーム画面アプリから使う場合は、受信メールの<b>URL文字列</b>（リンク化されていない方）をコピーして、ここに貼り付けてください。
        </p>
        <form onSubmit={onPasteLogin} className="space-y-2">
          <input
            type="url"
            inputMode="url"
            value={pastedUrl}
            onChange={(e) => setPastedUrl(e.target.value)}
            placeholder="メール本文のURLをここに貼り付け"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pasting || pastedUrl.trim().length < 10}
            className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {pasting ? '確認中…' : '貼り付けログイン'}
          </button>
          {pasteErr && <p className="text-sm text-red-600">{pasteErr}</p>}
        </form>
      </section>

      {/* 方式B（無効化中）
      <section className="space-y-2 border-t pt-4">
        <button type="button" onClick={openConfirmPopup} className="w-full rounded border px-4 py-2 text-sm">
          Safariでログインして戻る（自動同期）
        </button>
        <p className="text-xs text-gray-500">新しいウィンドウで完了後、この画面に自動で戻ります。</p>
      </section>
      */}
    </main>
  );
}
