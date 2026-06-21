import { SetMetadata } from '@nestjs/common';

/** Resource families whose owning shop the ShopOwnershipGuard can resolve. */
export enum OwnedResource {
  /** The route param holds a shop id directly. */
  Shop = 'shop',
  /** The route param holds a product id; ownership comes from product.shopId. */
  Product = 'product',
}

export interface OwnershipMeta {
  resource: OwnedResource;
  /** Route param that carries the id. Defaults to 'id'. */
  param?: string;
}

export const OWNERSHIP_KEY = 'ownership';

/**
 * Declares that a route is shop-scoped. Super admins bypass the check; shop
 * admins may only act on resources belonging to their own shop.
 */
export const CheckOwnership = (resource: OwnedResource, param = 'id') =>
  SetMetadata<string, OwnershipMeta>(OWNERSHIP_KEY, { resource, param });
