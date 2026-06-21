import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  OWNERSHIP_KEY,
  OwnedResource,
  OwnershipMeta,
} from '../decorators/ownership.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser, Role } from '../types/auth.types';

/**
 * Enforces that a shop admin only ever touches data belonging to their own
 * shop. Super admins bypass the check entirely. The guard resolves the owning
 * shop for the targeted resource (loading it from the DB when necessary) and
 * compares it to the shop id baked into the admin's token.
 *
 * Routes opt in with @CheckOwnership(resource, param). The guard also serves as
 * an existence check: a missing resource yields 404.
 */
@Injectable()
export class ShopOwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<OwnershipMeta | undefined>(
      OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!meta) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser; params: Record<string, string> }>();
    const user = request.user;
    if (!user) throw new ForbiddenException('Not authenticated');

    // Super admins are not shop-scoped.
    if (user.role === Role.SuperAdmin) return true;

    if (user.role !== Role.ShopAdmin || !user.shopId) {
      throw new ForbiddenException('Not allowed to access shop-scoped data');
    }

    const id = request.params[meta.param ?? 'id'];
    if (!id) throw new ForbiddenException('Missing resource identifier');

    const ownerShopId = await this.resolveOwnerShopId(meta.resource, id);
    if (ownerShopId !== user.shopId) {
      throw new ForbiddenException('You do not own this resource');
    }
    return true;
  }

  private async resolveOwnerShopId(
    resource: OwnedResource,
    id: string,
  ): Promise<string> {
    switch (resource) {
      case OwnedResource.Shop: {
        const shop = await this.prisma.shop.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!shop) throw new NotFoundException('Shop not found');
        return shop.id;
      }
      case OwnedResource.Product: {
        const product = await this.prisma.product.findUnique({
          where: { id },
          select: { shopId: true },
        });
        if (!product) throw new NotFoundException('Product not found');
        return product.shopId;
      }
      default:
        throw new ForbiddenException('Unsupported ownership resource');
    }
  }
}
