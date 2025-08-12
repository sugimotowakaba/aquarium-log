// types/next-pwa.d.ts
declare module 'next-pwa' {
  import type { NextConfig } from 'next';

  type Init = (options?: Record<string, unknown>) =>
    (config: NextConfig) => NextConfig;

  const init: Init;
  export default init;
}
