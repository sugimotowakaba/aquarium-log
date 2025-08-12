// src/app/visits/new/_NewVisitInner.tsx  ← 新規ファイル
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
// ここに既存の import（supabase、フォーム用の関数や型など）をそのまま持ってきてください

export default function NewVisitInner() {
  const sp = useSearchParams();            // ← これを安全に使える
  const router = useRouter();

  // ↓ ここに、いまの /visits/new の「本体ロジック・JSX」を丸ごと移植してください
  //    （館IDの取得: sp.get('aquarium')、フォーム状態、保存処理など）
  return (
    <main className="max-w-md mx-auto p-6">
      {/* 既存のフォームUIをそのまま置く */}
      {/* 例: <form>... */}
    </main>
  );
}
