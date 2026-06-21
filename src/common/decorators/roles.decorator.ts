import { SetMetadata } from '@nestjs/common';
import { Role } from '../types/auth.types';

export const ROLES_KEY = 'roles';

/** Restrict a route (or controller) to the given admin roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
