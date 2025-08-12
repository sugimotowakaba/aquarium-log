// src/app/auth/_AuthInner.tsx
'use client';

import { useState } from 'react';
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

  // 貼り付けログイン用
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
        options: {
          emailRedirectTo: `${BASE_URL}/auth/confirm`,
        },
      });
      if (error) throw error;
      setMsg('メールを送信しました。最新のメールを開いてください。iPhoneのホーム画面アプリで使う場合は、リンクを長押し→コピーし、下の「貼り付けログイン」を使うとSafariに移動せず完了できます。');
    } catch (e) {
      const m = e instanceof Error ? e.message : '送信に失敗しました';
      setErr(m);
    } finally {
      setSending(false);
    }
  };

  const onPasteLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasting(true);
    setPasteErr(null);
    setMsg(null);
    try {
      const url = pastedUrl.trim();
      if (!/^https?:\/\//i.test(url)) {
        throw new Error('メール本文のリンクURLをそのまま貼り付けてください。');
      }
      const { error } = await supabase.auth.exchangeCodeForSession(url);
      if (error) throw error;
      setMsg('ログインしました。履歴へ移動します。');
      setTimeout(() => (window.location.href = '/history'), 400);
    } catch (e) {
      const m = e instanceof Error ? e.message : '貼り付けログインに失敗しました';
      setPasteErr(m);
    } finally {
      setPasting(false);
    }
  };

  return (
    <main className="max-w-md mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-xl font-semibold">サインイン</h1>
        <p className="text-sm text-gray-600 mt-1">
          メールアドレスにMagic Linkを送ります。ホーム画面アプリで使う方は「貼り付けログイン」も便利です。
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

      {/* 貼り付けログイン（PWA向け） */}
      <section className="space-y-2 border-t pt-4">
        <p className="text-sm text-gray-700">
          iPhoneのホーム画面から使う場合は、受信メールでリンクを<b>長押し→コピー</b>して、ここに<b>貼り付け</b>てください。
        </p>
        <form onSubmit={onPasteLogin} className="space-y-2">
          <input
            type="url"
            inputMode="url"
            value={pastedUrl}
            onChange={(e) => setPastedUrl(e.target.value)}
            placeholder="メールのリンクURLをここに貼り付け"
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
    </main>
  );
}
