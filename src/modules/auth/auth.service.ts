import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthUser, JwtPayload, Role } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends TokenPair {
  user: {
    id: string;
    username: string;
    role: Role;
    name: string | null;
    shopId?: string;
  };
}

/**
 * Authentication for the two admin types. Credentials are checked against the
 * super_admins and shop_admins tables. Tokens are stateless: refresh validates
 * the signed refresh token and mints a fresh pair. (The DBML has no token
 * storage column, so logout is client-side token disposal.)
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(username: string, password: string): Promise<AuthResult> {
    const principal = await this.findPrincipalByUsername(username);
    if (!principal) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, principal.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (principal.role === Role.ShopAdmin && !principal.active) {
      throw new UnauthorizedException('Account is disabled');
    }

    const tokens = await this.issueTokens(principal);
    return {
      ...tokens,
      user: {
        id: principal.id,
        username: principal.username,
        role: principal.role,
        name: principal.name,
        shopId: principal.shopId,
      },
    };
  }

  /** Re-validates the principal behind a refresh token and rotates the pair. */
  async refresh(user: AuthUser): Promise<TokenPair> {
    const principal = await this.findPrincipalById(user.role, user.id);
    if (!principal) throw new UnauthorizedException('Account no longer exists');
    if (principal.role === Role.ShopAdmin && !principal.active) {
      throw new UnauthorizedException('Account is disabled');
    }
    return this.issueTokens(principal);
  }

  /** Returns the current principal's profile (for `GET /auth/me` hydration). */
  async me(user: AuthUser): Promise<AuthResult['user']> {
    const principal = await this.findPrincipalById(user.role, user.id);
    if (!principal) throw new UnauthorizedException('Account no longer exists');
    if (principal.role === Role.ShopAdmin && !principal.active) {
      throw new UnauthorizedException('Account is disabled');
    }
    return {
      id: principal.id,
      username: principal.username,
      role: principal.role,
      name: principal.name,
      shopId: principal.shopId,
    };
  }

  private async issueTokens(principal: Principal): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: principal.id,
      username: principal.username,
      role: principal.role,
      shopId: principal.shopId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        payload,
        this.signOptions(
          this.config.getOrThrow<string>('JWT_SECRET'),
          this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        ),
      ),
      this.jwt.signAsync(
        payload,
        this.signOptions(
          this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
        ),
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private signOptions(secret: string, expiresIn: string): JwtSignOptions {
    // ms-style duration string ("15m", "7d") narrowed to the expected type.
    return { secret, expiresIn: expiresIn as JwtSignOptions['expiresIn'] };
  }

  private async findPrincipalByUsername(
    username: string,
  ): Promise<Principal | null> {
    // Super admins log in with their email; shop admins with their username.
    const superAdmin = await this.prisma.superAdmin.findUnique({
      where: { email: username },
    });
    if (superAdmin) {
      return {
        id: superAdmin.id,
        username: superAdmin.email,
        name: superAdmin.name,
        passwordHash: superAdmin.passwordHash,
        role: Role.SuperAdmin,
        active: true,
      };
    }

    const shopAdmin = await this.prisma.shopAdmin.findUnique({
      where: { username },
    });
    if (shopAdmin) {
      return {
        id: shopAdmin.id,
        username: shopAdmin.username,
        name: null,
        passwordHash: shopAdmin.passwordHash,
        role: Role.ShopAdmin,
        shopId: shopAdmin.shopId,
        active: shopAdmin.isActive,
      };
    }

    return null;
  }

  private async findPrincipalById(
    role: Role,
    id: string,
  ): Promise<Principal | null> {
    if (role === Role.SuperAdmin) {
      const superAdmin = await this.prisma.superAdmin.findUnique({
        where: { id },
      });
      return superAdmin
        ? {
            id: superAdmin.id,
            username: superAdmin.email,
            name: superAdmin.name,
            passwordHash: superAdmin.passwordHash,
            role: Role.SuperAdmin,
            active: true,
          }
        : null;
    }

    const shopAdmin = await this.prisma.shopAdmin.findUnique({ where: { id } });
    return shopAdmin
      ? {
          id: shopAdmin.id,
          username: shopAdmin.username,
          name: null,
          passwordHash: shopAdmin.passwordHash,
          role: Role.ShopAdmin,
          shopId: shopAdmin.shopId,
          active: shopAdmin.isActive,
        }
      : null;
  }
}

interface Principal {
  id: string;
  username: string;
  name: string | null;
  passwordHash: string;
  role: Role;
  shopId?: string;
  active: boolean;
}
