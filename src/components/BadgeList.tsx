// src/components/BadgeList.tsx
'use client';

import Image from 'next/image';
import { useMemo } from 'react';

export type BadgeItem = {
  id: string;
  /** 表示名（例：青の常客） */
  name: string;
  /** public 直下のパス想定（例：/assets/badge-visit10.svg） */
  iconPath: string;
  /** 獲得済みなら true */
  achieved: boolean;
  /** 初達成日など（任意） */
  achievedAt?: string | null;
  /** 進捗（未獲得の一覧を表示する場合に利用可） */
  progress?: { current: number; goal: number };
};

export default function BadgeList({
  badges,
  emptyText = 'まだバッジがありません',
  showCaption = true,
  coinBg = { from: '#EAF4FF', to: '#F8FAFF' },
}: {
  badges: BadgeItem[];
  /** 0件時のテキスト */
  emptyText?: string;
  /** バッジ名のキャプションを出すか */
  showCaption?: boolean;
  /** コイン背景のグラデ */
  coinBg?: { from: string; to: string };
}) {
  const achieved = useMemo(() => badges.filter((b) => b.achieved), [badges]);

  if (achieved.length === 0) {
    return (
      <div className="rounded-xl border border-sky-100 bg-white p-4 text-center text-sm text-gray-500">
        {emptyText}
      </div>
    );
  }

  return (
    <ul className="flex flex-wrap gap-4">
      {achieved.map((b) => (
        <li key={b.id} className="w-24">
          <div
            className={`grid h-20 w-20 place-items-center rounded-full border border-sky-100 bg-white shadow-[0_2px_10px_rgba(15,80,140,0.08)] ${
              b.achieved ? 'animate-[bounce_1.2s_ease_1]' : ''
            }`}
            style={{
              background: `linear-gradient(135deg, ${coinBg.from}, ${coinBg.to})`,
            }}
            title={b.name}
          >
            {/* SVG/PNG どちらでもOK */}
            <Image src={b.iconPath} alt={b.name} width={40} height={40} />
          </div>
          {showCaption && (
            <p className="mt-2 line-clamp-2 text-center text-[12px] leading-tight text-gray-600">{b.name}</p>
          )}
          {b.achievedAt && (
            <p className="mt-1 text-center text-[10px] text-gray-400">取得: {formatDate(b.achievedAt)}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function formatDate(v?: string | null) {
  if (!v) return '';
  // ISO 文字列や "YYYY-MM-DD" 想定
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}
