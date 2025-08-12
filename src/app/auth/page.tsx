'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';


export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` }
    });
    if (error) return alert(error.message);
    setSent(true);
  };

  return (
    <main className="max-w-sm mx-auto p-6 space-y-3">
      <h1 className="text-xl font-semibold">サインイン</h1>
      {sent ? (
        <p>送信しました。メールのリンクを開いてください。</p>
      ) : (
        <>
          <input value={email} onChange={e=>setEmail(e.target.value)}
                 placeholder="メールアドレス" className="border p-2 w-full" />
          <button onClick={signIn} className="bg-blue-600 text-white px-4 py-2 rounded">
            Magic Linkを送る
          </button>
        </>
      )}
    </main>
  );
}

