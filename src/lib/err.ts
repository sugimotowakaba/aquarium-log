export function toErrorMessage(e: unknown, fallback = 'エラーが発生しました'): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return fallback;
  }
}
