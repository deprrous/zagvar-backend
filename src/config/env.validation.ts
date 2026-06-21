import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Strongly-typed view of the environment. Validated once at boot; the app
 * refuses to start if anything required is missing or malformed.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  PORT = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(16)
  JWT_SECRET!: string;

  @IsString()
  @MinLength(16)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN = '7d';

  // CORS + auth-cookie configuration.
  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsString()
  @IsOptional()
  COOKIE_SAMESITE?: string;

  @IsString()
  @IsOptional()
  COOKIE_SECURE?: string;

  @IsString()
  @IsOptional()
  COOKIE_DOMAIN?: string;

  // Seed configuration (used by prisma/seed.ts).
  @IsString()
  @IsOptional()
  SEED_SUPER_ADMIN_EMAIL = 'superadmin@zagvar.local';

  @IsString()
  @IsOptional()
  SEED_SUPER_ADMIN_PASSWORD = 'ChangeMe123!';

  @IsString()
  @IsOptional()
  SEED_SUPER_ADMIN_NAME = 'Super Admin';
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors
        .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
        .join('\n')}`,
    );
  }
  return validated;
}
