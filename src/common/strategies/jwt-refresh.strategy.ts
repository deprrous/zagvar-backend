import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  REFRESH_COOKIE,
  cookieExtractor,
  parseCookies,
} from '../utils/auth-cookies';
import { AuthUser, JwtPayload } from '../types/auth.types';

interface RefreshAuthUser extends AuthUser {
  refreshToken: string;
}

/**
 * Validates the refresh token. Primary transport is the httpOnly
 * `refresh_token` cookie; a `refreshToken` body field is accepted as a fallback
 * for API tooling and tests. The raw token is kept on the principal so the
 * service can re-validate and rotate the pair.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor(REFRESH_COOKIE),
        ExtractJwt.fromBodyField('refreshToken'),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): RefreshAuthUser {
    const refreshToken =
      parseCookies(req.headers?.cookie)[REFRESH_COOKIE] ??
      (req.body as { refreshToken?: string })?.refreshToken;
    if (!refreshToken || !payload?.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      shopId: payload.shopId,
      refreshToken,
    };
  }
}
