type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000, now = Date.now()) {
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  b.count += 1;
  return { allowed: b.count <= limit, retryAfterSec: Math.ceil((b.reset - now) / 1000) };
}

export function clientIp(headers: Record<string, string | string[] | undefined>): string {
  const xff = headers["x-forwarded-for"];
  const v = Array.isArray(xff) ? xff[0] : xff;
  const first = v?.split(",")[0]?.trim();
  const real = headers["x-real-ip"];
  return first || (Array.isArray(real) ? real[0] : real) || "unknown";
}

export function resetRateLimits() {
  buckets.clear();
}
