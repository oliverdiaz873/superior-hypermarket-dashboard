export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Resuelve la imagen de un producto a una URL visualizable por el Dashboard.
 * - URL absoluta (http/https) -> se usa tal cual (el backend devuelve la URL pública).
 * - URL relativa con `/uploads/...` -> `/uploads/...` tal cual (Angular proxy se encarga del transporte).
 * - Key relativa (p. ej. `products/.../x.webp`) -> `/uploads/<key>`,
 *   ruta relativa same-origin (proxy en dev, mismo origen en prod).
 */
export function resolveDashboardImageUrl(image: string | null | undefined): string | null {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith('/uploads/')) {
    return image;
  }
  const raw = image.startsWith('/') ? image.slice(1) : image;
  return `/uploads/${raw}`;
}
