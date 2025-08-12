'use client';

import { useEffect, useState } from 'react';

type Props = { storageKey?: string };

export default function OnboardingModal({ storageKey = 'onboarding_v1' }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem(storageKey);
    if (!seen) setOpen(true);
  }, [storageKey]);

  const close = () => {
    localStorage.setItem(storageKey, '1');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[92%] max-w-md space-y-3">
        <h2 className="text-lg font-semibold">ようこそ！</h2>
        <ol className="text-sm text-gray-700 list-decimal pl-5 space-y-1">
          <li>「現在地の許可」をオンにすると、近くの水族館が表示されます。</li>
          <li>行ったら「訪問を記録」→写真やメモを残せます。</li>
          <li>訪問を重ねるとバッジが解放されます🎉</li>
        </ol>
        <div className="text-right">
          <button onClick={close} className="px-4 py-2 bg-blue-600 text-white rounded">
            はじめる
          </button>
        </div>
      </div>
    </div>
  );
}
