'use client';

// In-memory set to prevent duplicate pre-fetches during the same browser session
const prefetchedVideoIds = new Set();

/**
 * Pre-fetches the initial header chunk (0–1 MB) of the target video in the background.
 * Triggers backend Redis caching before the user navigates, enabling sub-30ms instant playback.
 * 
 * @param {string|number} videoOrFileId - Telegram messageId or video ID
 */
export const prefetchNextVideo = async (videoOrFileId) => {
  if (!videoOrFileId) return;

  const key = String(videoOrFileId).trim();
  if (!key || prefetchedVideoIds.has(key)) {
    return; // Already pre-fetched or currently active
  }

  prefetchedVideoIds.add(key);

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
  // If numeric or starts with tg_, use stream-tg, else fallback to stream route
  const isTgMessageId = /^\d+$/.test(key) || key.startsWith('tg_');
  const targetPath = isTgMessageId
    ? `/api/videos/stream-tg/${key.replace(/^tg_/, '')}`
    : `/api/videos/stream/${key}`;

  const prefetchUrl = `${backendUrl}${targetPath}`;

  try {
    // Low priority background fetch with 0-1MB range
    const controller = new AbortController();
    const fetchOptions = {
      headers: {
        'Range': 'bytes=0-1048575',
      },
      priority: 'low',
      signal: controller.signal,
    };

    const response = await fetch(prefetchUrl, fetchOptions);

    if (response.ok || response.status === 206) {
      // Consume the stream or abort once headers confirm caching triggered
      if (response.body && response.body.getReader) {
        const reader = response.body.getReader();
        reader.read().then(() => {
          controller.abort();
        }).catch(() => {});
      }
    }
  } catch (err) {
    // Background prefetch errors are silent to avoid interfering with user playback
  }
};

/**
 * React hook for automated video pre-fetching
 */
export default function useVideoPrefetch() {
  return {
    prefetchNextVideo,
    isPrefetched: (id) => prefetchedVideoIds.has(String(id)),
  };
}
