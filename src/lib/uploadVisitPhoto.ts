// src/lib/uploadVisitPhoto.ts
// HEIC → JPEG 変換（createImageBitmap → heic2any → heic-decode）＋ 圧縮 ＋ Storage アップロード
// ・厳格版：uploadVisitPhotos（失敗したら throw）
// ・寛容版：uploadVisitPhotosLenient（変換できないファイルをスキップして続行）
import { supabase } from '@/lib/supabaseClient';

export type UploadResult = { url: string; path: string; width?: number; height?: number };
export type UploadBatchResult = { uploaded: UploadResult[]; skipped: string[] };

class StageError extends Error {
  stage: string;
  original?: unknown;
  constructor(stage: string, message: string, original?: unknown) {
    super(`[${stage}] ${message}`);
    this.stage = stage;
    this.original = original;
  }
}

// ---- ここが肝：ブラウザ専用ライブラリは必要なときにだけ読み込む（SSR回避） ----
async function loadImageCompression() {
  const mod = await import('browser-image-compression');
  return mod.default as typeof import('browser-image-compression')['default'];
}
async function loadHeic2Any() {
  const mod = await import('heic2any');
  return mod.default as typeof import('heic2any')['default'];
}
async function loadHeicDecode() {
  const mod = await import('heic-decode');
  return mod.default as typeof import('heic-decode')['default'];
}

const isHeicLike = (file: File): boolean => {
  const name = (file?.name || '').toLowerCase();
  const type = (file?.type || '').toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif') || type.includes('heic') || type.includes('heif');
};
const safeName = (file: File, fallback = 'photo.jpg'): string => (file?.name && file.name.trim()) || fallback;
const guessExt = (file: File, fallback = 'jpg'): string => {
  const t = (file?.type || '').toLowerCase();
  if (t.includes('/')) {
    const p = t.split('/')[1];
    if (p) return p.replace('jpeg', 'jpg');
  }
  const n = (file?.name || '').toLowerCase();
  const m = n.match(/\.(\w{3,5})$/);
  if (m?.[1]) return m[1].replace('jpeg', 'jpg');
  return fallback;
};
const uuid = (): string =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ---------- 変換：HEICを安全にJPEGへ（3段構え） ----------
async function ensureJpeg(file: File): Promise<File> {
  const originalName = safeName(file);

  if (!isHeicLike(file)) {
    return new File([file], originalName, { type: file.type || 'image/jpeg' });
  }

  // 1) createImageBitmap（ブラウザ環境のみ）
  try {
    if (typeof window !== 'undefined' && typeof (window as unknown as { createImageBitmap?: unknown }).createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file as unknown as ImageBitmapSource);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D not available');
      ctx.drawImage(bitmap, 0, 0);
      const jpgBlob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.9)
      );
      const name = originalName.replace(/\.(heic|heif)$/i, '.jpg');
      return new File([jpgBlob], name, { type: 'image/jpeg' });
    }
  } catch (e) {
    console.warn('[createImageBitmap failed]', e);
  }

  // 2) heic2any（動的 import）
  try {
    const heic2any = await loadHeic2Any();
    const blob = (await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })) as Blob;
    const name = originalName.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([blob], name, { type: 'image/jpeg' });
  } catch (e) {
    console.warn('[heic2any failed]', e);
  }

  // 3) heic-decode（動的 import → RGBA を Canvas 経由で JPEG へ）
  try {
    const heicDecode = await loadHeicDecode();
    const buf = await file.arrayBuffer();
    const decoded = await heicDecode({ data: new Uint8Array(buf) });
    const { width, height, data } = decoded;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    const imageData = new ImageData(new Uint8ClampedArray(data), width, height);
    ctx.putImageData(imageData, 0, 0);
    const jpgBlob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.9)
    );
    const name = originalName.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([jpgBlob], name, { type: 'image/jpeg' });
  } catch (e: unknown) {
    throw new StageError('HEIC→JPEG 変換', '全変換処理が失敗しました', e);
  }
}

// ---------- 画像サイズ取得（失敗しても無視） ----------
async function getImageSizeSafe(file: File): Promise<{ width?: number; height?: number }> {
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve((fr.result as string) || '');
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
    if (!dataUrl) return {};
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });
    return { width: img.width, height: img.height };
  } catch {
    return {};
  }
}

// ---------- アップロード（厳格版：失敗したら throw） ----------
export async function uploadVisitPhotos(files: File[], userId: string): Promise<UploadResult[]> {
  // セッション確認
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new StageError('セッション確認', 'セッションが失効しました。再サインインしてください。');

  const results: UploadResult[] = [];
  const safeFiles = Array.isArray(files) ? files.filter((f): f is File => !!f) : [];

  for (const original of safeFiles) {
    const pickedName = safeName(original);
    try {
      // 1) 変換
      const jpgFile = await ensureJpeg(original);

      // 2) 圧縮（動的 import）
      const imageCompression = await loadImageCompression();
      const compressedBlob = (await imageCompression(jpgFile, {
        maxWidthOrHeight: 2048,
        maxSizeMB: 3,
        useWebWorker: true,
        initialQuality: 0.82,
      })) as Blob;

      // 3) File化（MIME保証）
      const finalFile = new File([compressedBlob], safeName(jpgFile, 'photo.jpg'), {
        type: (compressedBlob.type || jpgFile.type || 'image/jpeg'),
      });

      // 4) Storageへ
      const ext = (guessExt(finalFile) || 'jpg').replace('jpeg', 'jpg');
      const path = `${userId}/${uuid()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('visit-photos')
        .upload(path, finalFile, { upsert: true, cacheControl: '3600' });
      if (upErr) throw new StageError('Storageアップロード', upErr.message || 'Storage upload failed', upErr);

      // 5) 公開URL
      const { data } = supabase.storage.from('visit-photos').getPublicUrl(path);

      // 6) 寸法
      const dims = await getImageSizeSafe(finalFile);

      results.push({ url: data.publicUrl, path, ...dims });
    } catch (e: unknown) {
      console.error('[Upload pipeline failed]', { file: pickedName, error: e });
      throw e;
    }
  }

  return results;
}

// ---------- アップロード（寛容版：失敗ファイルはスキップ） ----------
export async function uploadVisitPhotosLenient(files: File[], userId: string): Promise<UploadBatchResult> {
  const uploaded: UploadResult[] = [];
  const skipped: string[] = [];

  // セッション確認（ここでは落とさない）
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { uploaded, skipped };
  } catch {
    return { uploaded, skipped };
  }

  const safeFiles = Array.isArray(files) ? files.filter((f): f is File => !!f) : [];
  for (const original of safeFiles) {
    const name = safeName(original, 'photo.heic');
    try {
      const [res] = await uploadVisitPhotos([original], userId);
      uploaded.push(res);
    } catch {
      skipped.push(name);
    }
  }
  return { uploaded, skipped };
}
