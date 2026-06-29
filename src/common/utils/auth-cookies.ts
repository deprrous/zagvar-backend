import { CookieOptions, Request, Response } from 'express';

/**
 * httpOnly cookie transport for the JWT pair. Keeping tokens in httpOnly
 * cookies (rather than a JS-readable store) means client-side scripts — and
 * therefore XSS payloads — cannot read or exfiltrate them. Tokens are sent as
 * cookies on login/refresh and read back via the passport strategies.
 */
export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

/** Parses a raw `Cookie` header into a name→value map. */
export function parseCookies(
  header: string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

/** passport-jwt extractor that reads a named cookie off the request. */
export function cookieExtractor(name: string) {
  return (req: Request): string | null => {
    const cookies = parseCookies(req.headers?.cookie);
    return cookies[name] ?? null;
  };
}

/**
 * Converts a token-expiry duration string (e.g. "15m", "7d", "30s", "1h") into
 * milliseconds for the cookie's maxAge. A bare number is treated as seconds.
 */
export function durationToMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)\s*([smhd]?)$/.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2] || 's';
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * (multipliers[unit] ?? 1000);
}

function baseOptions(): CookieOptions {
  const sameSite =
    (process.env.COOKIE_SAMESITE as CookieOptions['sameSite']) || 'lax';
  return {
    httpOnly: true,
    sameSite,
    // Secure is required for SameSite=None and recommended in production;
    // disabled for local http development.
    secure:
      process.env.COOKIE_SECURE === 'true' ||
      process.env.NODE_ENV === 'production',
    path: '/',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };
}

/** Sets both auth cookies, scoping each maxAge to its token's TTL. */
export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const accessMs = durationToMs(
    process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    900_000,
  );
  const refreshMs = durationToMs(
    process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    604_800_000,
  );
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    maxAge: accessMs,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    maxAge: refreshMs,
  });
}

/** Clears both auth cookies (logout / failed refresh). */
export function clearAuthCookies(res: Response): void {
  const opts = baseOptions();
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
}
