/**
 * lib/rate-limit.js
 *
 * Simple in-memory rate limiter based on IP address.
 * NOTE: This state is per-process. In a multi-process (PM2 cluster) setup,
 * each process maintains its own counter — use Redis for shared state at scale.
 *
 * @param {number} maxRequests  Maximum requests allowed in the window
 * @param {number} windowMs     Time window in milliseconds (default: 60 000ms)
 */

const store = new Map(); // Map<ip, { count: number, resetAt: number }>

export function rateLimit(maxRequests = 10, windowMs = 60_000) {
  /**
   * Check rate limit for a given request.
   * @param {Request} req  Next.js Request object
   * @returns {{ ok: boolean, remaining: number, resetAt: number }}
   */
  return function check(req) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(ip, entry);
    }

    entry.count += 1;

    return {
      ok: entry.count <= maxRequests,
      remaining: Math.max(0, maxRequests - entry.count),
      resetAt: entry.resetAt,
    };
  };
}

// Periodically prune expired entries to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(ip);
  }
}, 5 * 60_000); // every 5 minutes
