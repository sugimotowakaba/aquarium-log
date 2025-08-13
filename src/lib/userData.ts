// src/lib/userData.ts
// Homeで使う統計とバッジデータを取得するユーティリティ（クライアント／サーバー両対応）

import { supabase } from '@/lib/supabaseClient';

// ====== 型 ======
export type UserStats = {
  visitCount: number;            // visits 件数
  aquariumCount: number;         // distinct aquarium_id 件数
  maxSameAquariumCount: number;  // 同一館の最多訪問回数
  photoCount: number;            // visit_photos 件数
};

export type BadgeItem = {
  id: string;
  name: string;
  iconPath: string;              // 例: "/assets/badge-visit10.svg"
  achieved: boolean;
  achievedAt?: string | null;
  progress?: { current: number; goal: number };
};

// ====== 内部：ユーティリティ ======
async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** null/undefined を除外して distinct 件数を返す */
function countDistinctNullable(arr: Array<string | number | null | undefined>): number {
  const filtered: Array<string | number> = [];
  for (const v of arr) {
    if (v !== null && v !== undefined) {
      filtered.push(v);
    }
  }
  return new Set(filtered).size;
}

// ====== Public API ======

/** 現在ログイン中ユーザーの統計（クライアント想定） */
export async function getUserStats(): Promise<UserStats> {
  const uid = await getCurrentUserId();
  if (!uid) return { visitCount: 0, aquariumCount: 0, maxSameAquariumCount: 0, photoCount: 0 };
  return fetchUserStats(uid);
}

/** 指定ユーザーの統計（クライアント／サーバー両対応） */
export async function fetchUserStats(userId: string): Promise<UserStats> {
  // visits: id, aquarium_id を取得
  const { data: visits, error: vErr } = await supabase
    .from('visits')
    .select('id,aquarium_id')
    .eq('user_id', userId);

  if (vErr) {
    console.error('[getUserStats] visits error', vErr);
    return { visitCount: 0, aquariumCount: 0, maxSameAquariumCount: 0, photoCount: 0 };
  }

  type VisitRow = { id: string; aquarium_id: string | null };
  const vrows: VisitRow[] = (visits ?? []) as VisitRow[];

  const visitCount = vrows.length;

  // distinct aquarium_id
  const aquariumIds = vrows.map((r) => r.aquarium_id);
  const aquariumCount = countDistinctNullable(aquariumIds);

  // 同一館の最多訪問回数
  const counter = new Map<string, number>();
  for (const aid of aquariumIds) {
    if (aid) counter.set(aid, (counter.get(aid) ?? 0) + 1);
  }
  const counts = [...counter.values()];
  const maxSameAquariumCount = counts.length ? Math.max(...counts) : 0;

  // visit_photos 件数
  let photoCount = 0;
  if (visitCount > 0) {
    const visitIds = vrows.map((v) => v.id);
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

/** バッジ（達成済のみ）。DBテーブルが無くても統計から計算して返す */
export async function getUserBadges(): Promise<BadgeItem[]> {
  const uid = await getCurrentUserId();
  if (!uid) return [];

  const s = await fetchUserStats(uid);

  const CATALOG: Array<{
    id: string;
    name: string;
    iconPath: string;
    goal: number;
    current: number;
  }> = [
    { id: 'visit-10',   name: '青の常客',     iconPath: '/assets/badge-visit10.svg',   goal: 10, current: s.visitCount },
    { id: 'places-5',   name: '海辺の記録者', iconPath: '/assets/badge-places5.svg',   goal: 5,  current: s.aquariumCount },
    { id: 'revisit-2',  name: '再訪の波紋',   iconPath: '/assets/badge-revisit.svg',   goal: 2,  current: s.maxSameAquariumCount },
  ];

  const achieved: BadgeItem[] = CATALOG
    .filter((b) => b.current >= b.goal)
    .map((b) => ({
      id: b.id,
      name: b.name,
      iconPath: b.iconPath,
      achieved: true,
      achievedAt: null,
      progress: { current: b.current, goal: b.goal },
    }));

  return achieved;
}
