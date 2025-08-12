'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '');

export default function AuthInner() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
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
      setMsg('メールを送信しました。届いたリンクを開いてログインしてください。');
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : '送信に失敗しました';
      setErr(m);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">サインイン</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-700">メールアドレス</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="you@example.com"
          />
        </label>

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {sending ? '送信中…' : 'Magic Link を送る'}
        </button>
      </form>

      {msg && <p className="text-green-700 text-sm">{msg}</p>}
      {err && <p className="text-red-600 text-sm">{err}</p>}

      <p className="text-xs text-gray-500">
        受信したメールのリンクは<b>最新のもの</b>を開いてください（古いリンクは無効になることがあります）。
      </p>
    </main>
  );
}
