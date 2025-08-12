'use client';

type Props = {
  title: string;         // 投稿文の先頭
  text?: string;         // 本文
  url: string;           // 共有したいURL
  variant?: 'line' | 'x' | 'system'; // 見た目切替（任意）
};

export default function ShareButton({ title, text, url, variant='system' }: Props) {
  const share = async () => {
    const fullText = [title, text].filter(Boolean).join('\n');
    // Web Share API (対応ブラウザ)
    if (navigator.share) {
      try {
        await navigator.share({ title, text: fullText, url });
        return;
      } catch { /* ユーザーキャンセル等は無視 */ }
    }
    // Fallback: X(Twitter) 共有
    const tweet = encodeURIComponent(fullText + '\n' + url);
    window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank');
  };

  const className = {
    system: 'px-3 py-1.5 rounded bg-blue-600 text-white text-sm',
    x: 'px-3 py-1.5 rounded bg-black text-white text-sm',
    line: 'px-3 py-1.5 rounded bg-green-600 text-white text-sm',
  }[variant];

  return <button onClick={share} className={className}>共有</button>;
}
