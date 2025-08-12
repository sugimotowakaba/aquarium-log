'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { uploadVisitPhotosLenient } from '@/lib/uploadVisitPhoto';
import Image from 'next/image';
import { toErrorMessage } from '@/lib/err';

type Aquarium = { id: string; name: string };
type Photo = { id: string; url: string; path: string | null };
type Visit = {
  id: string; aquarium_id: string; visited_on: string; rating: number | null; note: string | null;
};

export default function EditVisitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [aquariums, setAquariums] = useState<Aquarium[]>([]);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  // 初期ロード
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/auth');

      const [{ data: aqs }, { data: v }, { data: ph }] = await Promise.all([
        supabase.from('aquariums').select('id,name').order('name'),
        supabase.from('visits').select('id,aquarium_id,visited_on,rating,note').eq('id', id).single(),
        supabase.from('photos').select('id,url,path').eq('visit_id', id),
      ]);
      setAquariums((aqs ?? []) as Aquarium[]);
      setVisit(v as Visit);
      setPhotos((ph ?? []) as Photo[]);
    })();
  }, [id, router]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files ?? []).slice(0, 5));
  };

  const save = async () => {
    if (!visit) return;
    try {
      setSaving(true);
      // 1) visits を更新
      const { error: upErr } = await supabase
        .from('visits')
        .update({
          aquarium_id: visit.aquarium_id,
          visited_on: visit.visited_on,
          rating: visit.rating,
          note: visit.note,
        })
        .eq('id', visit.id);
      if (upErr) throw new Error(upErr.message);

      // 2) 追加写真があれば 寛容版アップロード → photos insert
      if (files.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const { uploaded, skipped } = await uploadVisitPhotosLenient(files, user!.id);

        if (uploaded.length) {
          const rows = uploaded.map(u => ({
            visit_id: visit.id,
            url: u.url,
            path: u.path,              // ※ photos.path 列がある前提（無い場合はこの行を外してください）
            width: u.width ?? null,
            height: u.height ?? null,
          }));
          const { error: phErr } = await supabase.from('photos').insert(rows);
          if (phErr) throw new Error(phErr.message);
          // 画面反映
          setPhotos(prev => [...prev, ...rows.map((r, i) => ({
            id: `tmp-${Date.now()}-${i}`, url: r.url, path: r.path ?? null
          }))]);
        }
        if (skipped.length) {
          alert(`次のファイルは変換に失敗したためスキップしました:\n- ${skipped.join('\n- ')}`);
        }
      }

      alert('更新しました');
      router.replace('/history');
    } catch (e: unknown) {
      alert(toErrorMessage(e, '更新に失敗しました'));
    } finally {
      setSaving(false);
    }
  };

  const deletePhoto = async (photo: Photo) => {
    if (!confirm('この写真を削除しますか？')) return;
    try {
      // DB行を先に削除
      const { error } = await supabase.from('photos').delete().eq('id', photo.id);
      if (error) throw error;
      // Storage からも削除（pathがあれば）
      if (photo.path) {
        await supabase.storage.from('visit-photos').remove([photo.path]);
      }
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (e: unknown) {
      alert(toErrorMessage(e, '写真の削除に失敗しました'));
    }
  };

  const deleteVisit = async () => {
    if (!visit) return;
    if (!confirm('この記録を削除しますか？（写真も一緒に消えます）')) return;
    try {
      // 先に Storage のファイルをなるべく削除（path があるぶんだけ）
      const paths = photos.map(p => p.path).filter(Boolean) as string[];
      if (paths.length) await supabase.storage.from('visit-photos').remove(paths);
      // visits を削除（FK CASCADE で photos 行も消える）
      const { error } = await supabase.from('visits').delete().eq('id', visit.id);
      if (error) throw error;
      router.replace('/history');
    } catch (e: unknown) {
      alert(toErrorMessage(e, '削除に失敗しました'));
    }
  };

  if (!visit) return <main className="max-w-xl mx-auto p-6">読み込み中…</main>;

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">訪問を編集</h1>

      <label className="block">
        <span className="text-sm">水族館</span>
        <select
          value={visit.aquarium_id}
          onChange={(e) => setVisit({ ...visit!, aquarium_id: e.target.value })}
          className="border p-2 w-full rounded"
        >
          {aquariums.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="text-sm">訪問日</span>
        <input
          type="date"
          value={visit.visited_on}
          onChange={(e) => setVisit({ ...visit!, visited_on: e.target.value })}
          className="border p-2 w-full rounded"
        />
      </label>

      <label className="block">
        <span className="text-sm">評価（1〜5）</span>
        <input
          type="number" min={1} max={5}
          value={visit.rating ?? 5}
          onChange={(e) => setVisit({ ...visit!, rating: parseInt(e.target.value) || 1 })}
          className="border p-2 w-full rounded"
        />
      </label>

      <label className="block">
        <span className="text-sm">メモ</span>
        <textarea
          value={visit.note ?? ''}
          onChange={(e) => setVisit({ ...visit!, note: e.target.value })}
          rows={4}
          className="border p-2 w-full rounded"
        />
      </label>

      {/* 既存写真 */}
      <div>
        <span className="text-sm">既存の写真</span>
        {photos.length === 0 ? (
          <p className="text-gray-500">写真はまだありません。</p>
        ) : (
          <ul className="mt-2 grid grid-cols-3 gap-2">
            {photos.map(ph => (
              <li key={ph.id} className="relative">
                <Image src={ph.url} alt="" width={96} height={96} className="w-full h-24 object-cover rounded" />
                <button
                  onClick={() => deletePhoto(ph)}
                  className="absolute top-1 right-1 text-xs bg-white/90 border rounded px-2 py-0.5"
                >削除</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 追加アップロード */}
      <label className="block">
        <span className="text-sm">写真を追加（任意）</span>
        <input type="file" accept="image/*,.heic,.heif" multiple onChange={onFileChange}/>
        <p className="text-xs text-gray-500 mt-1">
          HEICで失敗する場合は「設定→カメラ→フォーマット→互換性優先」をお試しください。
          変換できないHEICは自動的にスキップされます。
        </p>
      </label>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {saving ? '保存中…' : '更新する'}
        </button>
        <button onClick={deleteVisit} className="border px-4 py-2 rounded">記録を削除</button>
      </div>
    </main>
  );
}
