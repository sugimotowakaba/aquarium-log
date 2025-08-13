// src/lib/uploadVisitPhoto.ts
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';
import heicDecode from 'heic-decode';
import heic2any from 'heic2any';

export type UploadResult = { url: string; path: string; width?: number; height?: number };

// heic ライブラリ最小型
type HeicDecodeResult = { width: number; height: number; data: Uint8ClampedArray | ArrayBufferLike };
type HeicDecodeFn = (opts: { buffer: ArrayBuffer }) => Promise<HeicDecodeResult>;
type Heic2AnyFn = (opts: { blob: Blob; toType?: string; quality?: number }) => Promise<Blob | Blob[]>;
const heicDecodeFn = heicDecode as unknown as HeicDecodeFn;
const heic2anyFn = heic2any as unknown as Heic2AnyFn;

// 画像サイズ取得
async function getImageSizeFromBlob(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

// ArrayBuffer → JPEG Blob（toBlob が null の場合は“元の Blob”を返す）
async function arrayBufferToJpegBlob(buf: ArrayBuffer, fallbackMime = 'image/jpeg'): Promise<Blob> {
  try {
    if (typeof createImageBitmap === 'function') {
      const bmp = await createImageBitmap(new Blob([buf]));
      const canvas = document.createElement('canvas');
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 生成に失敗');
      // @ts-expect-error drawImage accepts ImageBitmap
      ctx.drawImage(bmp, 0, 0);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
      return blob ?? new Blob([buf], { type: fallbackMime });
    }
    const blob = new Blob([buf], { type: fallbackMime });
    const { width, height } = await getImageSizeFromBlob(blob);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob; // フォールバック
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    // @ts-expect-error drawImage accepts HTMLImageElement
    ctx.drawImage(img, 0, 0);
    const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
    return out ?? blob; // toBlob が null でも元の blob を返す
  } catch {
    return new Blob([buf], { type: fallbackMime });
  }
}

// JPEG推定
function isLikelyJpeg(file: File, buf?: ArrayBuffer): boolean {
  const name = file.name || '';
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  if (file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/pjpeg') return true;
  if (ext === 'jpg' || ext === 'jpeg') return true;
  if (buf && buf.byteLength >= 3) {
    const u8 = new Uint8Array(buf);
    if (u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) return true; // FF D8 FF
  }
  return false;
}

// HEIC → JPEG（全部ダメでも“必ず Blob を返す”）
async function heicToJpegBlob(file: File): Promise<Blob> {
  // 1) heic-decode
  try {
    const buf = await file.arrayBuffer();
    const decoded = await heicDecodeFn({ buffer: buf });
    const canvas = document.createElement('canvas');
    canvas.width = decoded.width;
    canvas.height = decoded.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const src = decoded.data;
      const rgba =
        src instanceof Uint8ClampedArray ? new Uint8ClampedArray(src) : new Uint8ClampedArray(src as ArrayBuffer);
      const imgData = ctx.createImageData(decoded.width, decoded.height);
      imgData.data.set(rgba);
      ctx.putImageData(imgData, 0, 0);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
      if (blob) return blob;
    }
  } catch {}
  // 2) heic2any
  try {
    const out = await heic2anyFn({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const blob = Array.isArray(out) ? out[0] : out;
    if (blob instanceof Blob) return blob;
  } catch {}
  // 3) createImageBitmap フォールバック
  try {
    const buf = await file.arrayBuffer();
    return await arrayBufferToJpegBlob(buf);
  } catch {}
  // 4) 最後の砦：そのまま返す
  return file;
}

// JPEG 化＆圧縮（“絶対 throw しない”設計）
async function toJpegAndCompress(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const buf = await file.arrayBuffer();

  // 1) JPEG ならそのまま or 圧縮（失敗しても元を返す）
  if (isLikelyJpeg(file, buf)) {
    try {
      const compressed = await imageCompression(new File([file], file.name || 'in.jpg', { type: 'image/jpeg' }), {
        maxSizeMB: 2,
        maxWidthOrHeight: 4000,
        initialQuality: 0.9,
        useWebWorker: true,
      });
      const { width, height } = await getImageSizeFromBlob(compressed);
      return { blob: compressed, width, height };
    } catch {
      const { width, height } = await getImageSizeFromBlob(file);
      return { blob: file, width, height };
    }
  }

  // 2) 非JPEG → JPEG 化（全部失敗しても元を返す）
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  const isHeic = ext === 'heic' || ext === 'heif' || file.type === 'image/heic' || file.type === 'image/heif';

  try {
    const jpegBlob = isHeic ? await heicToJpegBlob(file) : await arrayBufferToJpegBlob(buf, file.type || 'image/*');
    const compressed = await imageCompression(new File([jpegBlob], 'in.jpg', { type: 'image/jpeg' }), {
      maxSizeMB: 2,
      maxWidthOrHeight: 4000,
      initialQuality: 0.9,
      useWebWorker: true,
    });
    const { width, height } = await getImageSizeFromBlob(compressed);
    return { blob: compressed, width, height };
  } catch {
    const { width, height } = await getImageSizeFromBlob(file);
    return { blob: file, width, height };
  }
}

// 1枚アップロード（原則 throw しない。Supabase エラーのみ表に出る）
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

// 複数：成功分だけ返す（既存互換の ok/ng も同梱）
export type UploadManyResult = {
  uploaded: UploadResult[];
  skipped: { file: File; error: unknown }[];
  ok: UploadResult[];
  ng: { file: File; error: unknown }[];
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

export default uploadVisitPhoto;
