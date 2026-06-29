import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ACCESS_COOKIE, cookieExtractor } from '../utils/auth-cookies';
import { AuthUser, JwtPayload } from '../types/auth.types';

/**
 * Validates the access token. Primary transport is the httpOnly `access_token`
 * cookie; a Bearer Authorization header is accepted as a fallback for API
 * tooling and tests.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor(ACCESS_COOKIE),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    if (!payload?.sub || !payload?.role) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      shopId: payload.shopId,
    };
  }
}
