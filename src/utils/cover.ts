/**
 * A book's cover is a link: an https image (Open Library, Google Books) or a photo from the device, stored as a
 * small JPEG data URI so it lives in the database and travels with backups like every other field.
 */

/** Own photos are cropped to 2:3 and scaled to this width (enough for the book page at 3× density). */
export const OWN_COVER_WIDTH = 360;
/** Upper bound for an own cover (~300 KB of JPEG); real ones are ~30–50 KB. */
const MAX_OWN_COVER_LENGTH = 400_000;
const OWN_COVER = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

export const isOwnCover = (url: string | null): boolean => url != null && url.startsWith("data:image/jpeg;base64,");

/** For untrusted input (backups): an https link, or an own cover that is really just a JPEG. */
export function isValidCoverUrl(url: string): boolean {
  if (isOwnCover(url)) return url.length <= MAX_OWN_COVER_LENGTH && OWN_COVER.test(url);
  return url.length <= 2000 && /^https:\/\//.test(url);
}

/** The largest centred 2:3 rectangle in an image. */
export function coverCrop(width: number, height: number) {
  const cropWidth = Math.min(width, Math.round((height * 2) / 3));
  const cropHeight = Math.min(height, Math.round((cropWidth * 3) / 2));
  return {
    originX: Math.round((width - cropWidth) / 2),
    originY: Math.round((height - cropHeight) / 2),
    width: cropWidth,
    height: cropHeight,
  };
}
