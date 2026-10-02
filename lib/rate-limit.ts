type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function clientIp(h: Headers): string {
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

// Fixed-window limiter. In-memory, so per serverless instance (fine for a demo;
// use Upstash/Redis for a shared limit in production).
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();

  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  b.count++;
  if (b.count <= limit) return { ok: true, retryAfter: 0 };
  return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
}