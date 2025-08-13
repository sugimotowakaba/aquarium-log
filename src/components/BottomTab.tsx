'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type TabItem = {
  href: string;
  match: (path: string) => boolean;
  label: string;
  icon: string;
  active: string;
};

const TABS: TabItem[] = [
  {
    href: '/',
    match: (p) => p === '/',
    label: 'ホーム',
    icon: '/assets/icons/tab-home.svg',
    active: '/assets/icons/tab-home-active.svg',
  },
  {
    href: '/history',
    match: (p) => p === '/history' || p.startsWith('/visits'),
    label: '記録手帳',
    icon: '/assets/icons/tab-history.svg',
    active: '/assets/icons/tab-history-active.svg',
  },
  {
    href: '/aquariums/map',
    match: (p) => p.startsWith('/aquariums'),
    label: 'マップ',
    icon: '/assets/icons/tab-map.svg',
    active: '/assets/icons/tab-map-active.svg',
  },
  {
    href: '/profile',
    match: (p) => p.startsWith('/profile'),
    label: 'プロフィール',
    icon: '/assets/icons/tab-user.svg',
    active: '/assets/icons/tab-user-active.svg',
  },
];

export default function BottomTab() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-[420px] border-t border-slate-100 bg-white/95 backdrop-blur">
      <ul className="grid grid-cols-4">
        {TABS.map((t) => {
          const isActive = t.match(path);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs ${isActive ? 'text-sky-600' : 'text-gray-500'}`}
              >
                <Image
                  src={isActive ? t.active : t.icon}
                  alt=""
                  width={22}
                  height={22}
                  className="mb-0.5"
                  priority={t.href === '/'}
                />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
