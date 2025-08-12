// src/app/history/page.tsx
'use client';

import RequireAuth from '@/components/RequireAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Visit = {
  id: string;
  aquarium_id: string | null;
  visited_on: string;
  rating: number | null;
  note: string | null;
  aquariums: { name: string } | null;
};

export default function HistoryPage() {
  const [list, setList] = useState<Visit[]>([]);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        const { data, error } = await supabase
          .from('visits')
          .select('id, aquarium_id, visited_on, rating, note, aquariums(name)')
          .order('visited_on', { ascending: false });

        if (error) {
          console.error('visits fetch error', error);
          setErrMsg(error.message);
          return;
        }

        /** Supabaseの型推論対策：aquariums が配列で返るケースを吸収して Visit 形に正規化 */
        type RawVisit = {
          id: string;
          aquarium_id: string | null;
          visited_on: string;
          rating: number | null;
          note: string | null;
          aquariums: { name: string } | { name: string }[] | null;
        };

        const raw = (data ?? []) as RawVisit[];
        const rows: Visit[] = raw.map(v => ({
          id: v.id,
          aquarium_id: v.aquarium_id,
          visited_on: v.visited_on,
          rating: v.rating,
          note: v.note,
          aquariums: Array.isArray(v.aquariums)
            ? (v.aquariums[0] ?? null)
            : (v.aquariums ?? null),
        }));

        setList(rows);
      } catch (e) {
        console.error('Unexpected error', e);
        setErrMsg('データ取得中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <RequireAuth>
      <main className="p-4">
        <h1 className="text-xl font-bold mb-4">履歴</h1>

        {loading && <p>読み込み中...</p>}
        {errMsg && <p className="text-red-500">{errMsg}</p>}

        {!loading && !errMsg && list.length === 0 && (
          <p>まだ記録がありません</p>
        )}

        {!loading && !errMsg && list.length > 0 && (
          <ul className="space-y-4">
            {list.map(v => (
              <li key={v.id} className="border p-4 rounded">
                <div className="font-bold">{v.aquariums?.name ?? '不明な水族館'}</div>
                <div>{v.visited_on}</div>
                <div>評価: {v.rating ?? '-'}</div>
                {v.note && <div className="mt-1 text-sm">{v.note}</div>}
              </li>
            ))}
          </ul>
        )}
      </main>
    </RequireAuth>
  );
}
