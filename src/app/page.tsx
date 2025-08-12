// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Visit = {
  id: string;
  aquarium_id: string | null;
  visited_on: string;
  rating: number | null;
  note: string | null;
  aquariums: { name: string } | null;
};
type Photo = { visit_id: string; url: string };

export default function HomePage() {
  const [recent, setRecent] = useState<Visit[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErrMsg(null);

        // 最近の訪問 5件
        const { data, error } = await supabase
          .from('visits')
          .select('id, aquarium_id, visited_on, rating, note, aquariums(name)')
          .order('visited_on', { ascending: false })
          .limit(5);

        if (error) {
          setErrMsg(error.message);
          return;
        }

        // 型正規化：aquariums が配列で返る場合に先頭要素を採用
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
          aquariums: Array.isArray(v.aquariums) ? (v.aquariums[0] ?? null) : (v.aquariums ?? null),
        }));
        setRecent(rows);

        // サムネ取得
        const ids = rows.map(v => v.id);
        if (ids.length > 0) {
          const { data: ph, error: phErr } = await supabase
            .from('photos')
            .select('visit_id,url')
            .in('visit_id', ids);
          if (!phErr && ph) {
            const firstByVisit: Record<string, string> = {};
            (ph as Photo[]).forEach(p => {
              if (!firstByVisit[p.visit_id]) firstByVisit[p.visit_id] = p.url;
            });
            setThumbs(firstByVisit);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">SuizokuLog（すいぞくログ）</h1>
        <nav className="text-sm flex gap-4">
          <Link className="underline" href="/aquariums">水族館一覧</Link>
          <Link className="underline" href="/aquariums/map">地図</Link>
          <Link className="underline" href="/history">記録</Link>
        </nav>
      </header>

      {/* 近くの水族館への導線（すでに実装済みなら残す/調整） */}
      <section className="p-4 rounded-xl border">
        <h2 className="text-lg font-semibold mb-2">近くの水族館を探す</h2>
        <p className="text-sm text-gray-600 mb-3">位置情報を許可すると現在地から近い順に表示できます。</p>
        <Link href="/aquariums/map" className="inline-block px-4 py-2 rounded bg-blue-600 text-white text-sm">
          地図を開く
        </Link>
      </section>

      {/* 最近の訪問 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">最近の訪問</h2>
          <Link className="text-sm underline" href="/history">すべて見る</Link>
        </div>

        {loading && <p className="text-gray-600 text-sm">読み込み中…</p>}
        {errMsg && <p className="text-red-600 text-sm">読み込みエラー：{errMsg}</p>}
        {!loading && !errMsg && recent.length === 0 && (
          <p className="text-gray-600 text-sm">まだ記録がありません。まずは1件記録してみましょう。</p>
        )}

        <ul className="grid sm:grid-cols-2 gap-3">
          {recent.map(v => {
            const thumb = thumbs[v.id];
            return (
              <li key={v.id} className="border rounded p-3 flex gap-3">
                {thumb && (
                  <Image
                    src={thumb}
                    alt=""
                    width={96}
                    height={96}
                    className="rounded object-cover"
                    style={{ width: 96, height: 96 }}
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{v.aquariums?.name ?? '（不明）'}</span>
                    <span className="text-sm text-gray-600">{v.visited_on}</span>
                  </div>
                  <div className="text-sm text-gray-600">★{v.rating ?? '-'}</div>
                  <div className="mt-2 flex gap-3">
                    {v.aquarium_id && (
                      <Link className="underline text-sm" href={`/visits/new?aquarium=${v.aquarium_id}`}>
                        同じ水族館で記録する
                      </Link>
                    )}
                    <Link className="underline text-sm" href={`/visits/${v.id}/edit`}>編集</Link>
                  </div>
                  {v.note && <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{v.note}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
