import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OwnedResource } from '../decorators/ownership.decorator';
import { AuthUser, Role } from '../types/auth.types';
import { ShopOwnershipGuard } from './shop-ownership.guard';

type PrismaMock = {
  shop: { findUnique: jest.Mock };
  product: { findUnique: jest.Mock };
};

function buildContext(
  user: AuthUser | undefined,
  params: Record<string, string>,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('ShopOwnershipGuard', () => {
  let guard: ShopOwnershipGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: PrismaMock;

  const shopAdmin: AuthUser = {
    id: 'admin-1',
    username: 'acme-owner',
    role: Role.ShopAdmin,
    shopId: 'shop-1',
  };
  const superAdmin: AuthUser = {
    id: 'super-1',
    username: 's@b.c',
    role: Role.SuperAdmin,
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    prisma = {
      shop: { findUnique: jest.fn() },
      product: { findUnique: jest.fn() },
    };
    guard = new ShopOwnershipGuard(
      reflector as unknown as Reflector,
      prisma as never,
    );
  });

  it('allows routes without ownership metadata', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(
      guard.canActivate(buildContext(shopAdmin, {})),
    ).resolves.toBe(true);
    expect(prisma.shop.findUnique).not.toHaveBeenCalled();
  });

  it('lets super admins bypass ownership checks', async () => {
    reflector.getAllAndOverride.mockReturnValue({ resource: OwnedResource.Shop });
    await expect(
      guard.canActivate(buildContext(superAdmin, { id: 'any-shop' })),
    ).resolves.toBe(true);
    expect(prisma.shop.findUnique).not.toHaveBeenCalled();
  });

  it('allows a shop admin to act on their own shop', async () => {
    reflector.getAllAndOverride.mockReturnValue({ resource: OwnedResource.Shop });
    prisma.shop.findUnique.mockResolvedValue({ id: 'shop-1' });
    await expect(
      guard.canActivate(buildContext(shopAdmin, { id: 'shop-1' })),
    ).resolves.toBe(true);
  });

  it("forbids a shop admin from acting on another shop", async () => {
    reflector.getAllAndOverride.mockReturnValue({ resource: OwnedResource.Shop });
    prisma.shop.findUnique.mockResolvedValue({ id: 'shop-2' });
    await expect(
      guard.canActivate(buildContext(shopAdmin, { id: 'shop-2' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("forbids a shop admin from touching another shop's product", async () => {
    reflector.getAllAndOverride.mockReturnValue({
      resource: OwnedResource.Product,
    });
    prisma.product.findUnique.mockResolvedValue({ shopId: 'shop-2' });
    await expect(
      guard.canActivate(buildContext(shopAdmin, { id: 'prod-9' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows a shop admin to touch their own shop's product", async () => {
    reflector.getAllAndOverride.mockReturnValue({
      resource: OwnedResource.Product,
    });
    prisma.product.findUnique.mockResolvedValue({ shopId: 'shop-1' });
    await expect(
      guard.canActivate(buildContext(shopAdmin, { id: 'prod-1' })),
    ).resolves.toBe(true);
  });

  it('returns 404 when the target resource does not exist', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      resource: OwnedResource.Product,
    });
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(buildContext(shopAdmin, { id: 'missing' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an unauthenticated request on a scoped route', async () => {
    reflector.getAllAndOverride.mockReturnValue({ resource: OwnedResource.Shop });
    await expect(
      guard.canActivate(buildContext(undefined, { id: 'shop-1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
