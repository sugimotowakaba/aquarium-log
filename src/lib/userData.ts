// src/lib/userData.ts
// Homeで使う統計とバッジデータをまとめて取得するユーティリティ。
// ※ クライアント（ブラウザ）側での呼び出しを想定しています。
//    サーバー側で使う場合は userId を直接渡す関数（fetchUserStats）を利用してください。

import { supabase } from '@/lib/supabaseClient';

// ====== 型 ======
export type UserStats = {
  visitCount: number;       // 訪問回数（visits 件数）
  aquariumCount: number;    // 異なる水族館数（distinct aquarium_id）
  maxSameAquariumCount: number; // 同一館の最多訪問回数（再訪計測用）
  photoCount: number;       // 写真枚数（visit_photos の件数）
};

export type BadgeItem = {
  id: string;
  name: string;
  /** public 直下のパス（例: /assets/badge-visit10.svg） */
  iconPath: string;
  /** 獲得済み(true)のみ BadgeList で表示されます */
  achieved: boolean;
  /** 初達成日（今回は計算バッジのため null 固定） */
  achievedAt?: string | null;
  /** 進捗（未獲得一覧のUIを作る時に利用） */
  progress?: { current: number; goal: number };
};

// ====== 内部：ユーティリティ ======
async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** distinct 計算用 */
function countDistinct<T>(arr: T[]): number {
  return new Set(arr.map((v) => String(v ?? ''))).size - (arr.includes(null as any) ? 1 : 0);
}

// ====== Public API ======

/**
 * クライアント側で現在ログイン中のユーザーの統計を取得
 * （サーバーで使いたい場合は fetchUserStats(userId) を使う）
 */
export async function getUserStats(): Promise<UserStats> {
  const uid = await getCurrentUserId();
  if (!uid) return { visitCount: 0, aquariumCount: 0, maxSameAquariumCount: 0, photoCount: 0 };
  return fetchUserStats(uid);
}

/**
 * 指定ユーザーの統計を取得（サーバー／クライアント両対応）
 * - visits から件数/異館数/最多再訪回数
 * - visit_photos から写真枚数
 */
export async function fetchUserStats(userId: string): Promise<UserStats> {
  // visits をまとめて取得
  const { data: visits, error: vErr } = await supabase
    .from('visits')
    .select('id,aquarium_id')
    .eq('user_id', userId);

  if (vErr) {
    console.error('[getUserStats] visits error', vErr);
    return { visitCount: 0, aquariumCount: 0, maxSameAquariumCount: 0, photoCount: 0 };
  }

  const visitCount = visits?.length ?? 0;

  const aquariumIds = (visits ?? []).map((r) => r.aquarium_id) as (string | null)[];
  const aquariumCount = countDistinct(aquariumIds);

  // 同一館の最多訪問回数
  const counter = new Map<string, number>();
  for (const aid of aquariumIds) {
    if (!aid) continue;
    counter.set(aid, (counter.get(aid) ?? 0) + 1);
  }
  const maxSameAquariumCount = Math.max(0, ...Array.from(counter.values()));

  // visit_photos 枚数（visit_id の in でカウント）
  let photoCount = 0;
  if (visitCount > 0) {
    const visitIds = (visits ?? []).map((v) => String(v.id));
    const { count, error: pErr } = await supabase
      .from('visit_photos')
      .select('photo_id', { head: true, count: 'exact' })
      .in('visit_id', visitIds);

    if (pErr) {
      console.error('[getUserStats] photos error', pErr);
    }
    photoCount = count ?? 0;
  }

  return { visitCount, aquariumCount, maxSameAquariumCount, photoCount };
}

/**
 * バッジ一覧（達成済のみ）を返す。
 * DBに achievements テーブルがなくても、統計値から「計算」で判定します。
 * 必要に応じてマイルストーンを増やせます。
 */
export async function getUserBadges(): Promise<BadgeItem[]> {
  const uid = await getCurrentUserId();
  if (!uid) return [];

  const s = await fetchUserStats(uid);

  // --- ここで「獲得バッジ」を定義（必要に応じて増やす） ---
  const CATALOG: Array<{
    id: string;
    name: string;
    iconPath: string;
    goal: number;
    current: number;
  }> = [
    // 例1: 訪問10回で「青の常客」
    {
      id: 'visit-10',
      name: '青の常客',
      iconPath: '/assets/badge-visit10.svg',
      goal: 10,
      current: s.visitCount,
    },
    // 例2: 異なる館 5 で「海辺の記録者」
    {
      id: 'places-5',
      name: '海辺の記録者',
      iconPath: '/assets/badge-places5.svg',
      goal: 5,
      current: s.aquariumCount,
    },
    // 例3: 同じ館に2回以上で「再訪の波紋」
    {
      id: 'revisit-2',
      name: '再訪の波紋',
      iconPath: '/assets/badge-revisit.svg',
      goal: 2,
      current: s.maxSameAquariumCount,
    },
  ];

  // 達成済のみ返却（BadgeList は achieved==true のみ表示する設計）
  const achieved: BadgeItem[] = CATALOG.filter((b) => b.current >= b.goal).map((b) => ({
    id: b.id,
    name: b.name,
    iconPath: b.iconPath,
    achieved: true,
    achievedAt: null,
    progress: { current: b.current, goal: b.goal },
  }));

  return achieved;
}
