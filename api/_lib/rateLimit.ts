type RateLimitEntry = {
  timestamps: number[];
};

const LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const buckets = new Map<string, RateLimitEntry>();

export const isRateLimited = (key: string): boolean => {
  const now = Date.now();
  const entry = buckets.get(key) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < LIMIT_WINDOW_MS);
  entry.timestamps.push(now);
  buckets.set(key, entry);
  return entry.timestamps.length > MAX_REQUESTS;
};
