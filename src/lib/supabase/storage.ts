export const MENU_IMAGES_BUCKET = "menu-images";

/**
 * Extracts the storage object path from a Supabase public Storage URL, so we
 * can best-effort delete the previous image when a menu's photo is replaced.
 * Returns null if the URL doesn't look like one of our own bucket's public URLs
 * (e.g. it's from a different origin) — callers should treat that as "nothing
 * to clean up" rather than an error.
 */
export function extractStoragePathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${MENU_IMAGES_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
}
