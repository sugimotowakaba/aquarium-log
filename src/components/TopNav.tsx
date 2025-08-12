'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAVS = [
  { href: '/', label: 'HOME' },
  { href: '/aquariums', label: '一覧' },
  { href: '/aquariums/map', label: '地図' },
  { href: '/visits/new', label: '記録する' },
  { href: '/history', label: '履歴' },
];

// ナビを出したくないページ
const HIDDEN_PREFIXES = ['/auth'];

export default function TopNav() {
  const pathname = usePathname() || '/';
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b bg-white/80 backdrop-blur">
      <nav className="mx-auto max-w-3xl px-4">
        <ul className="flex h-12 items-center gap-3 overflow-x-auto">
          {NAVS.map((n) => {
            const active =
              pathname === n.href ||
              (n.href !== '/' && pathname.startsWith(n.href));
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    'rounded px-3 py-1.5 text-sm ' +
                    (active
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100')
                  }
                >
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
