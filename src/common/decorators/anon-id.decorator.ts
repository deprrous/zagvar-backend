import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';
import { parseCookies } from '../utils/auth-cookies';

/** Name of the long-lived anonymous-visitor cookie set by the storefront. */
export const ANON_COOKIE = 'anon_id';

/**
 * Injects the anonymous visitor id read from the `anon_id` cookie.
 *
 * The storefront middleware guarantees this cookie exists before any like
 * action, so a missing value means cookies are disabled (or the request did
 * not come through the storefront) — we reject with 400 rather than silently
 * inventing an id the client can never see again.
 */
export const AnonId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const cookies = parseCookies(request.headers?.cookie);
    const anonId = cookies[ANON_COOKIE];
    if (!anonId) {
      throw new BadRequestException(
        'Missing anonymous id cookie; enable cookies to like products',
      );
    }
    return anonId;
  },
);
