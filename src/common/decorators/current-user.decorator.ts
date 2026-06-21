import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../types/auth.types';

/**
 * Injects the authenticated principal (or one of its properties) into a
 * handler parameter, e.g. `@CurrentUser() user: AuthUser` or
 * `@CurrentUser('shopId') shopId: string`.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
