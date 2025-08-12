// src/components/RequireAuth.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null); // null=判定中

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        setOk(true);
      } else {
        setOk(false);
        router.replace('/auth'); // ← ログイン画面へ
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  if (ok === null) {
    // 判定中の簡易ローディング
    return <main style={{ maxWidth: 480, margin: '40px auto' }}>確認中…</main>;
  }
  if (!ok) return null; // すぐ /auth へ飛ばすので何も描かない

  return <>{children}</>;
}
