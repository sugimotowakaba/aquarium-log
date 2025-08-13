// src/app/aquariums/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Aquarium = {
  id: string;
  name: string;
  prefecture: string | null;
  address: string | null;
  official_url: string | null;
  lat: number | null;
  lng: number | null;
};

const PREFS = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県',
  '岐阜県','静岡県','愛知県','三重県',
  '滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
  '鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県',
  '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県',
  '沖縄県',
];

export const metadata = { title: '水族館一覧' };
export const dynamic = 'force-dynamic';

export default function AquariumsPage() {
  const [q, setQ] = useState('');
  const [pref, setPref] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Aquarium[]>([]);
  const [error, setError] = useState<string | null>(null);

  // サーバから取得（検索語・都道府県が変わるたび）
  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('aquariums')
          .select('id,name,prefecture,address,official_url,lat,lng')
          .order('name', { ascending: true });

        if (pref) query = query.eq('prefecture', pref);
        if (q.trim()) {
          // name or address に部分一致（大文字小文字無視）
          const kw = `%${q.trim()}%`;
          query = query.or(`name.ilike.${kw},address.ilike.${kw}`);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!abort) setList((data ?? []) as Aquarium[]);
      } catch (e) {
        console.error('[aquariums fetch]', e);
        if (!abort) setError('一覧の取得に失敗しました');
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [q, pref]);

  const empty = !loading && list.length === 0;

  return (
    <main className="mx-auto max-w-[820px] px-4 py-4">
      <h1 className="mb-3 text-xl font-semibold text-sky-700">水族館一覧</h1>

      {/* 検索・フィルタ */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="館名・住所で検索"
          className="w-full rounded-xl border border-sky-100 bg-white px-4 py-2 shadow-[0_1px_6px_rgba(15,80,140,0.06)] outline-none focus:border-sky-300"
        />
        <select
          value={pref}
          onChange={(e) => setPref(e.target.value)}
          className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 shadow-[0_1px_6px_rgba(15,80,140,0.06)] sm:w-56"
        >
          <option value="">都道府県（すべて）</option>
          {PREFS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* リスト */}
      {loading ? (
        <p className="text-gray-500">読み込み中…</p>
      ) : empty ? (
        <p className="text-gray-500">該当する水族館が見つかりませんでした。</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-sky-100 bg-white p-4 shadow-[0_2px_10px_rgba(15,80,140,0.06)]"
            >
              <div className="mb-1 text-[16px] font-semibold text-gray-800">{a.name}</div>
              <div className="text-[12px] text-gray-500">
                {a.prefecture ?? '—'} / {a.address ?? ''}
              </div>

              <div className="mt-3 flex gap-2">
                <Link
                  href={`/visits/new?aquarium=${encodeURIComponent(a.id)}`}
                  className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white"
                >
                  訪問を記録
                </Link>
                {a.official_url && (
                  <a
                    href={a.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border px-3 py-2 text-sm text-sky-700"
                  >
                    公式サイト
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
