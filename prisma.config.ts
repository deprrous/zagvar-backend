import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 configuration.
 *
 * The connection URL lives here (not in schema.prisma) and is used by the
 * Prisma CLI for `migrate`, `db push`, `studio`, etc. At application runtime
 * the PrismaClient is constructed with the `@prisma/adapter-pg` driver
 * adapter (see src/prisma/prisma.service.ts).
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
});
