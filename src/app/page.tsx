'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// 小パーツ
function ShadowCard({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={'rounded-2xl border border-sky-100 bg-white shadow-[0_2px_10px_rgba(15,80,140,0.08)] ' + className}>
      {children}
    </div>
  );
}

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <ShadowCard className="flex-1 px-5 py-4 text-center">
      <div className="text-[28px] leading-none font-semibold text-sky-600">{value}</div>
      <div className="mt-2 text-[12px] text-gray-500">{label}</div>
    </ShadowCard>
  );
}

function BadgeCoin({
  src,
  label,
  tintFrom = '#E2F2FF',
  tintTo = '#FAFBFF',
}: {
  src: string;
  label: string;
  tintFrom?: string;
  tintTo?: string;
}) {
  return (
    <div className="flex w-24 flex-col items-center gap-2">
      <div
        className="grid h-20 w-20 place-items-center rounded-full"
        style={{ background: `linear-gradient(135deg, ${tintFrom}, ${tintTo})` }}
      >
        <Image src={src} alt="" width={40} height={40} />
      </div>
      <div className="text-[12px] text-gray-600 text-center leading-tight">{label}</div>
    </div>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-sky-100">
      <div className="h-full rounded-full bg-sky-400 transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  );
}

function GoalRow({
  iconSrc,
  title,
  subtitle,
  value,
  max,
}: {
  iconSrc: string;
  title: string;
  subtitle: string;
  value: number;
  max: number;
}) {
  return (
    <ShadowCard className="flex items-start gap-3 px-4 py-3">
      <div className="mt-1">
        <Image src={iconSrc} alt="" width={44} height={44} className="rounded-xl" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[15px] text-gray-800">{title}</div>
        <div className="mt-0.5 text-[12px] text-gray-500">{subtitle}</div>
        <div className="mt-2">
          <ProgressBar value={value} max={max} />
          <div className="mt-1 flex justify-between text-[12px] text-gray-500">
            <span>
              {value} / {max}
            </span>
            <span>あと{Math.max(0, max - value)}</span>
          </div>
        </div>
      </div>
    </ShadowCard>
  );
}

function Fab() {
  return (
    <Link
      href="/visits/new"
      className="fixed bottom-24 right-5 grid h-16 w-16 place-items-center rounded-full bg-[#3C73B9] text-white shadow-[0_10px_20px_rgba(20,80,140,0.25)]"
      aria-label="記録する"
    >
      <Image src="/assets/icons/fab-pencil.svg" alt="" width={28} height={28} />
    </Link>
  );
}

// 型（any回避）
type VisitIdRow = { id: string };
type VisitAquariumRow = { aquarium_id: string | null };

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [visitCount, setVisitCount] = useState(0);
  const [aquariumCount, setAquariumCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        const uid = s.session?.user.id;
        if (!uid) {
          window.location.href = '/auth';
          return;
        }

        // 訪問回数
        {
          const { count } = await supabase
            .from('visits')
            .select('id', { head: true, count: 'exact' })
            .eq('user_id', uid);
          setVisitCount(count ?? 0);
        }

        // 水族館数（distinct）
        {
          const { data } = await supabase
            .from('visits')
            .select('aquarium_id')
            .eq('user_id', uid);
          const arr = (data ?? []) as VisitAquariumRow[];
          const distinct = new Set(arr.map((r) => String(r.aquarium_id ?? '')));
          distinct.delete(''); // nullを除外
          setAquariumCount(distinct.size);
        }

        // 写真枚数：visit_photos の件数
        {
          const { data: vids } = await supabase.from('visits').select('id').eq('user_id', uid);
          const ids = ((vids ?? []) as VisitIdRow[]).map((r) => r.id);
          if (ids.length) {
            const { count } = await supabase
              .from('visit_photos')
              .select('photo_id', { head: true, count: 'exact' })
              .in('visit_id', ids);
            setPhotoCount(count ?? 0);
          } else {
            setPhotoCount(0);
          }
        }
      } catch (e) {
        console.error('[home load]', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const goals = useMemo(
    () => [
      { icon: '/assets/badge-goal-visit20.svg', title: '海景の収集家', subtitle: '20回訪問する', value: visitCount, max: 20 },
      { icon: '/assets/badge-goal-places10.svg', title: '湖の観察者', subtitle: '10箇所の水族館に行く', value: aquariumCount, max: 10 },
      { icon: '/assets/badge-goal-same5.svg', title: '馴染みの水面', subtitle: '同じ水族館に5回行く', value: Math.min(visitCount, 5), max: 5 },
    ],
    [visitCount, aquariumCount]
  );

  return (
    <div className="min-h-screen bg-[#EEF6FB]">
      {/* ヘッダー（ロゴ） */}
      <header className="mx-auto max-w-[420px] px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Image src="/assets/logo-mark.svg" alt="SuizokuLog" width={32} height={32} />
          <div className="text-[20px] font-semibold text-sky-700">SuizokuLog</div>
        </div>
      </header>

      {/* 本文 */}
      <main className="mx-auto max-w-[420px] px-4 pb-28">
        {/* 上の3カード（アイコン無し） */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard value={loading ? '—' : visitCount} label="訪問回数" />
          <StatCard value={loading ? '—' : aquariumCount} label="水族館数" />
          <StatCard value={loading ? '—' : photoCount} label="写真枚数" />
        </div>

        {/* 獲得バッジ（固定3種の見た目。DB連携は別途で可） */}
        <ShadowCard className="mt-5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Image src="/assets/icons/bell.svg" alt="" width={18} height={18} />
            <h2 className="text-[16px] font-semibold text-gray-800">獲得バッジ</h2>
          </div>

          <div className="flex gap-4">
            <BadgeCoin src="/assets/badge-visit10.svg" label="青の常客" />
            <BadgeCoin src="/assets/badge-places5.svg" label="海辺の記録者" tintFrom="#D9F2F0" tintTo="#E6F7FB" />
            <BadgeCoin src="/assets/badge-revisit.svg" label="再訪の波紋" tintFrom="#FFF1B8" tintTo="#FFF9DB" />
          </div>

          <hr className="my-4 border-sky-100" />

          <div className="mb-2 flex items-center gap-2">
            <Image src="/assets/icons/megaphone.svg" alt="" width={18} height={18} />
            <h3 className="text-[15px] font-semibold text-gray-800">次のバッジ獲得まで</h3>
          </div>

          <div className="space-y-3">
            {goals.map((g) => (
              <GoalRow
                key={g.title}
                iconSrc={g.icon}
                title={g.title}
                subtitle={g.subtitle}
                value={g.value}
                max={g.max}
              />
            ))}
          </div>
        </ShadowCard>
      </main>

      {/* 右下FAB */}
      <Fab />
    </div>
  );
}
