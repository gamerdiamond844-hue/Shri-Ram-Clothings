'use strict';

/**
 * Input sanitisation middleware.
 *
 * Applied to ERP write routes (POST / PUT / PATCH).
 * Rejects requests that contain:
 *   - null bytes (\u0000) anywhere in the body — common SQL/NoSQL injection vector
 *   - any single string field that exceeds MAX_FIELD_LENGTH characters
 *
 * Returns HTTP 422 with a descriptive message so the client can fix the payload.
 */

const MAX_FIELD_LENGTH = 10_000; // characters — well above any legitimate field

function containsNullByte(value) {
  if (typeof value === 'string') return value.includes('\u0000');
  if (Array.isArray(value))      return value.some(containsNullByte);
  if (value && typeof value === 'object') return Object.values(value).some(containsNullByte);
  return false;
}

function exceedsMaxLength(value) {
  if (typeof value === 'string') return value.length > MAX_FIELD_LENGTH;
  if (Array.isArray(value))      return value.some(exceedsMaxLength);
  if (value && typeof value === 'object') return Object.values(value).some(exceedsMaxLength);
  return false;
}

const sanitize = (req, res, next) => {
  // Only inspect bodies on state-changing methods
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
  const body = req.body;
  if (!body || typeof body !== 'object') return next();

  if (containsNullByte(body)) {
    return res.status(422).json({ message: 'Invalid input: null bytes are not permitted.' });
  }
  if (exceedsMaxLength(body)) {
    return res.status(422).json({ message: `Invalid input: a field exceeds the maximum allowed length of ${MAX_FIELD_LENGTH} characters.` });
  }

  next();
};

module.exports = { sanitize };
