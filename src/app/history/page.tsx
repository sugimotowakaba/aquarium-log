// src/app/history/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type VisitRow = {
  id: string;
  aquarium_id: string;
  visited_on: string;
  rating: number;
  note: string | null;
  aquariums: { name: string } | null;
};

type PhotoRow = { id: string; visit_id: string; url: string; created_at: string };

const BADGE_STEPS = [3,5,10,20,30,40,50,60,70,80,90,100];

export const metadata = { title: '履歴' };
export const dynamic = 'force-dynamic';

export default function HistoryPage() {
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 認証 & 訪問履歴
  useEffect(() => {
    (async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        const uid = s.session?.user.id ?? null;
        if (!uid) {
          window.location.href = '/auth';
          return;
        }
        setMyUserId(uid);

        const { data, error } = await supabase
          .from('visits')
          .select('id,aquarium_id,visited_on,rating,note,aquariums(name)')
          .order('visited_on', { ascending: false });
        if (error) throw error;

        setVisits((data ?? []) as VisitRow[]);

        // サムネ（各visitにつき最新1枚）
        const ids = (data ?? []).map((v) => v.id);
        if (ids.length) {
          const { data: photos } = await supabase
            .from('visit_photos')
            .select('visit_id, photos(url, created_at)')
            .in('visit_id', ids)
            .order('created_at', { ascending: false });

          const firstUrl: Record<string, string> = {};
          (photos ?? []).forEach((row: any) => {
            const url = row?.photos?.url;
            const vid = row?.visit_id;
            if (vid && url && !firstUrl[vid]) {
              firstUrl[vid] = url;
            }
          });
          setThumbs(firstUrl);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const count = visits.length;
  const { achieved, nextTarget, remain } = useMemo(() => {
    const got = BADGE_STEPS.filter((n) => n <= count);
    const next = BADGE_STEPS.find((n) => n > count) ?? null;
    return { achieved: got, nextTarget: next, remain: next ? next - count : 0 };
  }, [count]);

  const onDelete = async (visitId: string) => {
    if (!confirm('この記録を削除しますか？')) return;
    // 先に関連写真を消す（RLSの都合上、所有者のみ許可）
    const { data: vp } = await supabase.from('visit_photos').select('photo_id').eq('visit_id', visitId);
    const photoIds = (vp ?? []).map((x: any) => x.photo_id);
    if (photoIds.length) {
      await supabase.from('photos').delete().in('id', photoIds);
    }
    await supabase.from('visit_photos').delete().eq('visit_id', visitId);
    const { error } = await supabase.from('visits').delete().eq('id', visitId);
    if (error) {
      alert('削除に失敗しました：' + error.message);
      return;
    }
    setVisits((prev) => prev.filter((v) => v.id !== visitId));
  };

  if (loading) {
    return <main className="max-w-3xl mx-auto p-4">読み込み中…</main>;
  }

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-xl font-semibold">履歴</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* バッジパネル */}
      <section className="rounded-lg border p-3">
        <h2 className="font-medium mb-2">バッジ</h2>
        <div className="flex flex-wrap gap-2">
          {BADGE_STEPS.map((n) => {
            const done = n <= count;
            return (
              <div
                key={n}
                className={
                  'flex items-center gap-2 rounded-full px-3 py-1 text-sm ' +
                  (done ? 'bg-yellow-100 text-yellow-900 border border-yellow-300' : 'bg-gray-100 text-gray-500')
                }
                title={done ? `${n}館達成！` : `${n}館バッジまで残り${Math.max(0, n - count)}館`}
              >
                <span>🏆</span>
                <span>{n}館</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-sm text-gray-700">
          {nextTarget ? (
            <>次のバッジまで <b>{remain}</b> 館</>
          ) : (
            <>おめでとうございます！最大バッジ（100館）まで到達しています🎉</>
          )}
        </div>
      </section>

      {/* 履歴一覧 */}
      {visits.length === 0 ? (
        <p>まだ記録がありません。<Link href="/visits/new" className="text-blue-600 underline">最初の記録を作成</Link></p>
      ) : (
        <ul className="space-y-3">
          {visits.map((v) => {
            const photoUrl = thumbs[v.id];
            return (
              <li key={v.id} className="rounded-lg border p-3">
                <div className="flex gap-3">
                  {photoUrl ? (
                    // next/image を使わず img（外部ストレージのため）
                    <img
                      src={photoUrl}
                      alt="サムネイル"
                      className="h-24 w-24 flex-none rounded object-cover bg-gray-100"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-24 w-24 flex-none rounded bg-gray-100 grid place-items-center text-gray-400">
                      なし
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">{v.aquariums?.name ?? '（不明）'}</div>
                      <div className="text-sm text-gray-500">{v.visited_on}</div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">評価：{v.rating} / 5</div>
                    {v.note && <p className="text-sm mt-1 whitespace-pre-wrap">{v.note}</p>}

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href={`/visits/${v.id}/edit`}
                        className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                      >
                        編集
                      </Link>
                      <button
                        className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                        onClick={() => onDelete(v.id)}
                      >
                        削除
                      </button>
                      <Link
                        href={`/visits/new?aquariumId=${v.aquarium_id}`}
                        className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                      >
                        同じ館で記録する
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
