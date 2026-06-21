import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    superAdmin: { findUnique: jest.Mock };
    shopAdmin: { findUnique: jest.Mock };
  };
  let jwt: { signAsync: jest.Mock };
  let config: { getOrThrow: jest.Mock; get: jest.Mock };

  const password = 'StrongPass123!';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 4); // cheap rounds for tests
  });

  beforeEach(() => {
    prisma = {
      superAdmin: { findUnique: jest.fn() },
      shopAdmin: { findUnique: jest.fn() },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
    config = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
      get: jest.fn((_key: string, fallback?: unknown) => fallback),
    };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );
  });

  it('logs in a super admin with valid credentials', async () => {
    prisma.superAdmin.findUnique.mockResolvedValue({
      id: 'super-1',
      email: 'super@zagvar.local',
      name: 'Super',
      passwordHash,
    });

    const result = await service.login('super@zagvar.local', password);

    expect(result.user).toMatchObject({
      id: 'super-1',
      role: Role.SuperAdmin,
    });
    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.refreshToken).toBe('signed.jwt.token');
    expect(jwt.signAsync).toHaveBeenCalledTimes(2);
  });

  it('logs in a shop admin and includes shopId on the principal', async () => {
    prisma.superAdmin.findUnique.mockResolvedValue(null);
    prisma.shopAdmin.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'owner@acme.test',
      name: 'Owner',
      passwordHash,
      shopId: 'shop-1',
      isActive: true,
    });

    const result = await service.login('owner@acme.test', password);

    expect(result.user).toMatchObject({
      role: Role.ShopAdmin,
      shopId: 'shop-1',
    });
  });

  it('rejects an unknown email', async () => {
    prisma.superAdmin.findUnique.mockResolvedValue(null);
    prisma.shopAdmin.findUnique.mockResolvedValue(null);
    await expect(service.login('nobody@x.io', password)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an incorrect password', async () => {
    prisma.superAdmin.findUnique.mockResolvedValue({
      id: 'super-1',
      email: 'super@zagvar.local',
      name: 'Super',
      passwordHash,
    });
    await expect(
      service.login('super@zagvar.local', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a disabled shop admin', async () => {
    prisma.superAdmin.findUnique.mockResolvedValue(null);
    prisma.shopAdmin.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'owner@acme.test',
      name: 'Owner',
      passwordHash,
      shopId: 'shop-1',
      isActive: false,
    });
    await expect(
      service.login('owner@acme.test', password),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
