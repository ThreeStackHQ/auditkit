/**
 * In-memory sliding window rate limiter.
 * In production, swap for a Redis-backed implementation.
 */

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

/** Clean up expired entries every 5 minutes */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => now - ts < 60_000);
      if (entry.timestamps.length === 0) store.delete(key);
    }
  }, 5 * 60_000);
}

/**
 * Returns true if the request is allowed, false if rate limited.
 * @param key - Unique identifier (e.g. API key ID)
 * @param limit - Max requests per window (default: 1000)
 * @param windowMs - Window size in ms (default: 60000 = 1 minute)
 */
export function checkRateLimit(
  key: string,
  limit = 1000,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };

  // Slide the window — drop timestamps older than windowMs
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

  if (entry.timestamps.length >= limit) {
    store.set(key, entry);
    return false; // Rate limited
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return true;
}
