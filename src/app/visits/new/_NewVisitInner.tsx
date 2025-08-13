'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import uploadVisitPhoto from '@/lib/uploadVisitPhoto'; // ★ ここを default import に

type Aquarium = { id: string; name: string };
type VisitInsert = {
  aquarium_id: string;
  visited_on: string;
  rating: number;
  note?: string | null;
};

export default function NewVisitInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [aquariums, setAquariums] = useState<Aquarium[]>([]);
  const [form, setForm] = useState<VisitInsert>({
    aquarium_id: '',
    visited_on: new Date().toISOString().slice(0, 10),
    rating: 3,
    note: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialAquariumId = sp.get('aquariumId') ?? '';

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) {
        router.replace('/auth');
        return;
      }
      const { data, error } = await supabase
        .from('aquariums')
        .select('id,name')
        .order('name', { ascending: true });
      if (error) {
        setError(error.message);
        return;
      }
      setAquariums(data ?? []);
      if (initialAquariumId) {
        setForm((f) => ({ ...f, aquarium_id: initialAquariumId }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) throw new Error('ログインが必要です');

      const { data: inserted, error: insErr } = await supabase
        .from('visits')
        .insert({
          aquarium_id: form.aquarium_id,
          visited_on: form.visited_on,
          rating: form.rating,
          note: form.note ?? null,
        })
        .select('id')
        .single();

      if (insErr) throw insErr;
      const visitId = inserted!.id as string;

      if (photoFile) {
        const up = await uploadVisitPhoto(photoFile, visitId);
        if (!up?.path) {
          console.warn('[photo upload failed]', up);
        }
      }

      router.replace('/history');
    } catch (e) {
      const m = e instanceof Error ? e.message : '保存に失敗しました';
      setError(m);
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = useMemo(
    () => !!form.aquarium_id && !!form.visited_on && !saving,
    [form.aquarium_id, form.visited_on, saving]
  );

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">記録する</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-gray-700">水族館</span>
          <select
            required
            value={form.aquarium_id}
            onChange={(e) => setForm((f) => ({ ...f, aquarium_id: e.target.value }))}
            className="mt-1 w-full rounded border px-3 py-2 bg-white"
          >
            <option value="">選択してください</option>
            {aquariums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-gray-700">訪問日</span>
          <input
            type="date"
            required
            value={form.visited_on}
            onChange={(e) => setForm((f) => ({ ...f, visited_on: e.target.value }))}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-700">評価（1〜5）</span>
          <input
            type="number"
            min={1}
            max={5}
            value={form.rating}
            onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) || 3 }))}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-700">メモ</span>
          <textarea
            rows={3}
            value={form.note ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="楽しかった展示・推しポイントなど"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-700">写真（任意）</span>
          <input
            type="file"
            accept="image/*,.heic,.HEIC,.jpg,.jpeg,.png"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full"
          />
          <p className="text-xs text-gray-500 mt-1">HEIC対応済み。失敗しても記録自体は保存されます。</p>
        </label>

        <div className="pt-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? '保存中…' : '保存する'}
          </button>
        </div>
      </form>
    </main>
  );
}
