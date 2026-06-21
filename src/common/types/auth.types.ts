/** The only two account types in the system. */
export enum Role {
  SuperAdmin = 'super_admin',
  ShopAdmin = 'shop_admin',
}

/** Shape of the signed JWT payload. */
export interface JwtPayload {
  /** Subject — the admin's id (super admin or shop admin). */
  sub: string;
  email: string;
  role: Role;
  /** Present only for shop admins; identifies the shop they own. */
  shopId?: string;
}

/** The authenticated principal attached to `request.user`. */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  shopId?: string;
}
