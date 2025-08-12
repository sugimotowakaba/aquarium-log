// types/heic.d.ts

declare module 'heic-decode' {
  export interface HeicDecodeInput {
    data: Uint8Array;
  }
  export interface HeicDecodeResult {
    width: number;
    height: number;
    data: Uint8Array; // RGBA
  }
  export default function heicDecode(
    input: HeicDecodeInput
  ): Promise<HeicDecodeResult>;
}

declare module 'heic2any' {
  export interface Heic2AnyOptions {
    blob: Blob;
    toType?: string;   // e.g. 'image/jpeg'
    quality?: number;  // 0..1
  }
  export default function heic2any(
    options: Heic2AnyOptions
  ): Promise<Blob>;
}
