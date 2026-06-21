# Zagvar — Online Shop Directory API

A NestJS + Prisma backend for an online shop directory. Two admin roles
(**super admin** and **shop admin**) manage shops and products; a public,
unauthenticated surface powers discovery, filtering and search.

## Stack

- **NestJS 11** (TypeScript, strict mode)
- **PostgreSQL** via **Prisma 7** (UUID PKs, `gen_random_uuid()`, pg driver adapter)
- **JWT** auth (access + refresh), **bcrypt** password hashing
- **class-validator** / **class-transformer** DTO validation
- **Swagger** docs at `/docs`
- **Docker Compose** (Postgres + app)

## Domain model & rules

- **No end-user accounts.** Only `super_admin` and `shop_admin`.
- **Super admin:** full CRUD on shops, shop admins, and the global
  categories/subcategories taxonomy.
- **Shop admin:** manages only their own shop (profile, contacts, socials) and
  their own products/images. Ownership is enforced on every shop-scoped route —
  a shop admin can never touch another shop's data.
- **Categories/subcategories are global** (super admin only). Shop admins assign
  them to products but cannot create them.
- **Public read endpoints** browse/search shops and products and view product
  detail. Viewing a product **atomically increments `products.click_count`**.

## Project layout

```
prisma/
  schema.prisma         # Source of truth, generated from the DBML
  migrations/           # SQL migrations
  seed.ts               # Super admin (from env) + sample shops/products
prisma.config.ts        # Prisma 7 config (connection URL for the CLI)
src/
  common/               # Guards, decorators, filters, interceptors, dto, utils
  config/               # Env validation
  prisma/               # PrismaService (pg adapter) + global PrismaModule
  modules/
    auth/               # login / refresh / logout, JWT strategies
    shops/ shop-admins/ shop-contacts/ shop-socials/
    categories/ subcategories/
    products/ product-images/
    public/             # Read-only discovery + click endpoint
    file/               # Cloudflare R2 upload service (used by product images)
```

## Getting started

### 1. Install

```bash
npm install
```

> Native modules (`bcrypt`, `prisma`, `pg`) require install scripts. If your npm
> blocks them, run `npm approve-scripts bcrypt prisma @prisma/engines`.

### 2. Configure environment

```bash
cp .env.example .env
# edit .env — set DATABASE_URL and JWT secrets
```

### 3. Database (choose one)

**Local via Docker Compose** (Postgres only):

```bash
docker compose up -d db
```

Then point `DATABASE_URL` at it (see `.env.example`).

### 4. Migrate, generate, seed

```bash
npm run prisma:generate      # generate the client
npm run prisma:migrate       # create/apply migrations (dev)
npm run db:seed              # super admin + sample data
```

For an existing database, apply migrations without prompting:

```bash
npm run prisma:deploy
```

### 5. Run

```bash
npm run start:dev            # watch mode
# or
npm run build && npm run start:prod
```

- API: `http://localhost:3010`
- Swagger: `http://localhost:3010/docs`

### Run everything in Docker

```bash
docker compose up --build
```

This starts Postgres and the app; the app container runs `prisma migrate deploy`
on boot. Seed manually afterwards with
`docker compose exec app npx prisma db seed`.

## Authentication

`POST /auth/login` with an admin email/password returns:

```json
{ "accessToken": "...", "refreshToken": "...", "user": { "id": "...", "role": "super_admin" } }
```

- Send the access token as `Authorization: Bearer <token>`.
- `POST /auth/refresh` with `{ "refreshToken": "..." }` rotates the pair.
- `POST /auth/logout` is a client-side token disposal (see note below).

Seeded credentials (from `.env`):

| Role        | Email                        | Password        |
| ----------- | ---------------------------- | --------------- |
| Super admin | `superadmin@zagvar.local`    | `ChangeMe123!`  |
| Shop admin  | `owner@acme.test`            | `ShopAdmin123!` |
| Shop admin  | `owner@trendy.test`          | `ShopAdmin123!` |

## API surface (high level)

| Area                    | Route                                   | Access                          |
| ----------------------- | --------------------------------------- | ------------------------------- |
| Auth                    | `POST /auth/{login,refresh,logout}`     | public / token                  |
| Shops                   | `… /shops`                              | super admin (CRUD)              |
| Shop (own)              | `GET/PATCH /shops/:id`, `GET /shops/me` | owning shop admin               |
| Shop contacts / socials | `… /shops/:shopId/{contacts,socials}`   | super admin or owning shop admin|
| Shop admins             | `… /shop-admins`                        | super admin                     |
| Categories / subcats    | `… /categories`, `… /subcategories`     | super admin (public read below) |
| Products                | `… /products`                           | super admin (any) / shop admin (own) |
| Product images          | `… /products/:productId/images`         | super admin or owning shop admin|
| Public discovery        | `GET /public/shops`, `/public/products` | public                          |
| Product detail (+click) | `GET /public/products/:id`              | public (increments click_count) |
| Click endpoint          | `POST /public/products/:id/click`       | public (atomic increment)       |

All list endpoints support `?page=&limit=&sortBy=&sortOrder=&search=` plus
resource-specific filters (e.g. products: `categoryId`, `subcategoryId`,
`shopId`, `minPrice`, `maxPrice`, `isActive`).

Responses are wrapped in a consistent envelope:

```json
{ "success": true, "statusCode": 200, "path": "/public/products", "timestamp": "...", "data": { "items": [], "meta": { "total": 0, "page": 1, "limit": 20, "totalPages": 1 } } }
```

## Authorization architecture

Three global guards run in order on every request:

1. `JwtAuthGuard` — authenticates the Bearer token unless the route is `@Public()`.
2. `RolesGuard` — enforces `@Roles(Role.SuperAdmin, …)`.
3. `ShopOwnershipGuard` — for routes marked `@CheckOwnership(resource, param)`,
   resolves the targeted resource's owning shop and rejects shop admins acting
   outside their own shop. Super admins bypass it. Creation paths force a shop
   admin's `shopId` from their token, so they cannot create data for other shops.

## Notes & decisions

- **Timestamps** use `timestamptz(6)` (the DBML said `timestamp`; UTC-aware is
  the safer default). `updated_at` is managed by Prisma's `@updatedAt`.
- **Refresh tokens are stateless.** The DBML has no token-storage column, so
  `logout` is client-side disposal and refresh validates the signed token and
  mints a new pair. To support server-side revocation you would add a
  `refresh_token_hash` column (a schema change beyond the provided DBML).
- **Click counting:** `GET /public/products/:id` increments `click_count`
  atomically (`{ increment: 1 }`, single column) as it returns the detail; a
  dedicated `POST /public/products/:id/click` is also available.
- **Product images** can be added by URL or uploaded to Cloudflare R2 via
  `POST /products/:productId/images/upload` (uses the existing `FileModule`).

## Tests

```bash
npm test          # unit tests (auth + ownership guard)
npm run test:e2e  # e2e (auth flow + ownership enforcement)
```

The e2e suite requires a reachable `DATABASE_URL`.
