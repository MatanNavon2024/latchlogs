export function extractLockIdFromUrl(url: string): string | null {
  const match = url.match(/\/clip\/([a-f0-9-]+)/i);
  return match?.[1] ?? null;
}
