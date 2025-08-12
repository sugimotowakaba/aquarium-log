'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Aquarium = {
  id: string;
  name: string;
  prefecture: string | null;
  address: string | null;
  official_url: string | null;
};

export default function AquariumsPage() {
  const [q, setQ] = useState('');
  const [pref, setPref] = useState<string>('すべて');
  const [prefOptions, setPrefOptions] = useState<string[]>(['すべて']);
  const [list, setList] = useState<Aquarium[]>([]);

  useEffect(() => {
    supabase
      .from('aquariums')
      .select('id,name,prefecture,address,official_url')
      .order('name', { ascending: true })
      .then(({ data }) => {
        const rows = (data ?? []) as Aquarium[];
        setList(rows);
        const set = new Set<string>(['すべて']);
        rows.forEach((r) => r.prefecture && set.add(r.prefecture));
        setPrefOptions(Array.from(set));
      });
  }, []);

  const filtered = useMemo(
    () =>
      list.filter(
        (a) =>
          a.name.toLowerCase().includes(q.toLowerCase()) &&
          (pref === 'すべて' || a.prefecture === pref)
      ),
    [list, q, pref]
  );

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-semibold">水族館一覧</h1>
      <a href="/aquariums/map" className="inline-block text-sm underline">
      地図で見る
      </a>

      <div className="flex flex-col md:flex-row gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="館名で検索"
          className="border p-2 rounded w-full md:w-2/3"
        />
        <select
          value={pref}
          onChange={(e) => setPref(e.target.value)}
          className="border p-2 rounded w-full md:w-1/3"
        >
          {prefOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <ul className="space-y-2 mt-3">
        {filtered.map((a) => (
          <li key={a.id} className="border rounded p-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">{a.name}</div>
              <div className="text-sm text-gray-500">
                {a.prefecture ?? ''} {a.address ?? ''}
              </div>
            </div>
            <div className="flex gap-2">
              {a.official_url && (
                <a className="underline" href={a.official_url} target="_blank" rel="noreferrer">
                  公式サイト
                </a>
              )}
              <a className="underline" href={`/visits/new?aquarium=${a.id}`}>
                記録する
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
