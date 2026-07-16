'use strict';

/**
 * Simple in-memory rate limiter — no external dependency.
 * Stores request counts per IP in a Map, cleared on a rolling window.
 *
 * Usage:
 *   const { authRateLimit, erpWriteRateLimit } = require('./rateLimiter');
 *   router.post('/login', authRateLimit, loginHandler);
 */

// ip -> { count, resetAt }
const store = new Map();

/**
 * Build a rate-limit middleware.
 * @param {object} opts
 * @param {number} opts.windowMs   - window length in ms
 * @param {number} opts.max        - max requests per window per IP
 * @param {string} [opts.message]  - error message when limit exceeded
 */
function createLimiter({ windowMs = 60_000, max = 60, message = 'Too many requests. Please try again later.' } = {}) {
  // Prune stale entries every 5 minutes to prevent memory leak
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of store.entries()) {
      if (val.resetAt < now) store.delete(key);
    }
  }, 5 * 60_000).unref();

  return function rateLimiter(req, res, next) {
    // Extract real IP (handles proxies)
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      'unknown';

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || entry.resetAt < now) {
      // First request in this window
      store.set(ip, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit',     String(max));
      res.setHeader('X-RateLimit-Remaining', String(max - 1));
      return next();
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    res.setHeader('X-RateLimit-Limit',     String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset',     String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      return res.status(429).json({ message });
    }

    next();
  };
}

// Auth endpoints: 20 requests per minute per IP
const authRateLimit = createLimiter({
  windowMs: 60_000,
  max: 20,
  message: 'Too many authentication attempts. Please wait a minute and try again.',
});

// ERP write endpoints: 200 requests per minute per IP (generous for normal use)
const erpWriteRateLimit = createLimiter({
  windowMs: 60_000,
  max: 200,
  message: 'Request rate exceeded. Please slow down.',
});

module.exports = { createLimiter, authRateLimit, erpWriteRateLimit };
