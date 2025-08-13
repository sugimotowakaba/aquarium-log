// src/lib/uploadVisitPhoto.ts
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';
import heicDecode from 'heic-decode';
import heic2any from 'heic2any';

export type UploadResult = { url: string; path: string; width?: number; height?: number };

// ---- heic ライブラリの最小型 ----
type HeicDecodeResult = { width: number; height: number; data: Uint8ClampedArray | ArrayBufferLike };
type HeicDecodeFn = (opts: { buffer: ArrayBuffer }) => Promise<HeicDecodeResult>;
type Heic2AnyFn = (opts: { blob: Blob; toType?: string; quality?: number }) => Promise<Blob | Blob[]>;
const heicDecodeFn = heicDecode as unknown as HeicDecodeFn;
const heic2anyFn = heic2any as unknown as Heic2AnyFn;
// ---------------------------------

async function getImageSizeFromBlob(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

async function arrayBufferToJpegBlob(buf: ArrayBuffer): Promise<Blob> {
  if (typeof createImageBitmap === 'function') {
    const bmp = await createImageBitmap(new Blob([buf]));
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 生成に失敗しました');
    // 実行時は ImageBitmap を受け付ける
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    ctx.drawImage(bmp, 0, 0);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
    if (!blob) throw new Error('JPEG 変換に失敗しました');
    return blob;
  }
  const blob = new Blob([buf]);
  const { width, height } = await getImageSizeFromBlob(blob);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 生成に失敗しました');
  const url = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  ctx.drawImage(img, 0, 0);
  const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
  if (!out) throw new Error('JPEG 変換に失敗しました');
  return out;
}

/** HEIC/HEIF → JPEG Blob（多段フォールバック） */
async function heicToJpegBlob(file: File): Promise<Blob> {
  // 1) libheif-js (heic-decode)
  try {
    const buf = await file.arrayBuffer();
    const decoded = await heicDecodeFn({ buffer: buf });
    const canvas = document.createElement('canvas');
    canvas.width = decoded.width;
    canvas.height = decoded.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 生成に失敗しました');

    // 必ず Uint8ClampedArray を新規生成してから ImageData に反映
    const src = decoded.data;
    const rgba =
      src instanceof Uint8ClampedArray ? new Uint8ClampedArray(src) : new Uint8ClampedArray(src as ArrayBuffer);
    const imgData = ctx.createImageData(decoded.width, decoded.height);
    imgData.data.set(rgba);
    ctx.putImageData(imgData, 0, 0);

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
    if (!blob) throw new Error('libheif 変換失敗');
    return blob;
  } catch {
    // 続行
  }
  // 2) heic2any
  try {
    const out = await heic2anyFn({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const blob = Array.isArray(out) ? out[0] : out;
    if (blob instanceof Blob) return blob;
  } catch {
    // 続行
  }
  // 3) createImageBitmap
  try {
    const buf = await file.arrayBuffer();
    return await arrayBufferToJpegBlob(buf);
  } catch {
    // 続行
  }
  throw new Error('[HEIC→JPEG 変換] 全変換処理が失敗しました');
}

/** JPEG 化＆圧縮（目安 2MB） */
async function toJpegAndCompress(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  let jpegBlob: Blob;
  if (ext === 'heic' || ext === 'heif' || file.type === 'image/heic' || file.type === 'image/heif') {
    jpegBlob = await heicToJpegBlob(file);
  } else if (file.type === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg') {
    jpegBlob = file;
  } else {
    const buf = await file.arrayBuffer();
    jpegBlob = await arrayBufferToJpegBlob(buf);
  }

  const compressed = await imageCompression(new File([jpegBlob], 'in.jpg', { type: 'image/jpeg' }), {
    maxSizeMB: 2,
    maxWidthOrHeight: 4000,
    initialQuality: 0.9,
    useWebWorker: true,
  });

  const { width, height } = await getImageSizeFromBlob(compressed);
  return { blob: compressed, width, height };
}

/** 1枚アップロード → photos / visit_photos 登録 */
export async function uploadVisitPhoto(file: File, visitId: string): Promise<UploadResult> {
  const { data: s } = await supabase.auth.getSession();
  const userId = s.session?.user.id;
  if (!userId) throw new Error('ログインが必要です');

  const { blob, width, height } = await toJpegAndCompress(file);

  const filename = `${Date.now()}.jpg`;
  const path = `${userId}/${visitId}/${filename}`;

  const { error: upErr } = await supabase.storage.from('photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from('photos').getPublicUrl(path);
  const url = pub?.publicUrl;
  if (!url) throw new Error('公開URLの取得に失敗しました');

  const { data: pIns, error: pErr } = await supabase
    .from('photos')
    .insert({ path, url, width, height })
    .select('id')
    .single();
  if (pErr) throw pErr;
  const photoId = pIns!.id as string;

  const { error: vpErr } = await supabase.from('visit_photos').insert({ visit_id: visitId, photo_id: photoId });
  if (vpErr) throw vpErr;

  return { url, path, width, height };
}

/** 複数ファイルを“甘めに”：成功分だけ返す（編集画面互換のため alias を用意） */
export type UploadManyResult = {
  uploaded: UploadResult[];
  skipped: { file: File; error: unknown }[];
  ok: UploadResult[]; // 互換
  ng: { file: File; error: unknown }[]; // 互換
};

export async function uploadVisitPhotosLenient(files: File[], visitId: string): Promise<UploadManyResult> {
  const ok: UploadResult[] = [];
  const ng: { file: File; error: unknown }[] = [];
  for (const f of files) {
    try {
      const res = await uploadVisitPhoto(f, visitId);
      ok.push(res);
    } catch (e) {
      console.warn('[uploadVisitPhotosLenient] failed:', e);
      ng.push({ file: f, error: e });
    }
  }
  return { uploaded: ok, skipped: ng, ok, ng };
}

// 両対応（named / default）
export default uploadVisitPhoto;
