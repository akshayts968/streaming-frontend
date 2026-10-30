/**
 * Resolves a thumbnail or media URL.
 * If given a relative API endpoint (e.g. /api/videos/thumbnail-tg/45),
 * it prepends the backend NEXT_PUBLIC_API_URL so the browser can load it directly.
 */
export const formatMediaUrl = (url) => {
  if (!url) return '/no-thumbnail.jpg';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/api/')) {
    const api = process.env.NEXT_PUBLIC_API_URL || '';
    return `${api.replace(/\/$/, '')}${url}`;
  }
  return url;
};
