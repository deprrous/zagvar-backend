import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import { AppModule } from './../src/app.module';

/**
 * End-to-end coverage for authentication and shop-ownership enforcement.
 * Requires a reachable DATABASE_URL that has been migrated and seeded
 * (`npm run db:seed`). Uses the two seeded shops (acme-electronics,
 * trendy-threads) and their admins.
 *
 * Auth is cookie-based: each identity uses a supertest `agent` whose cookie jar
 * persists the httpOnly auth cookies returned by `POST /auth/login`.
 */
jest.setTimeout(30000);

const SUPER_ADMIN = {
  email: process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@zagvar.local',
  password: process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!',
};
const ACME_ADMIN = { username: 'owner@acme.test', password: 'ShopAdmin123!' };

describe('Auth & ownership (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /** Logs an identity in on its own cookie-jar agent. */
  const signIn = async (username: string, password: string) => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent.post('/auth/login').send({ username, password });
    return { agent, res };
  };

  it('GET / is a public health check', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBe('Hello World!');
  });

  it('public discovery lists shops without auth', async () => {
    const res = await request(app.getHttpServer())
      .get('/public/shops')
      .expect(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects bad credentials with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: SUPER_ADMIN.email, password: 'wrong-password' })
      .expect(401);
  });

  it('protected routes require a token', async () => {
    await request(app.getHttpServer()).get('/shops').expect(401);
  });

  it('login sets httpOnly auth cookies and returns the user', async () => {
    const { res } = await signIn(SUPER_ADMIN.email, SUPER_ADMIN.password);
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('super_admin');
    // Tokens are delivered as httpOnly cookies, never in the response body.
    expect(res.body.data.accessToken).toBeUndefined();
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.join(';')).toContain('access_token');
    expect(cookies.join(';')).toContain('refresh_token');
    expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
  });

  it('logs in the super admin and lists shops via the cookie', async () => {
    const { agent, res } = await signIn(SUPER_ADMIN.email, SUPER_ADMIN.password);
    expect(res.status).toBe(200);
    await agent.get('/shops').expect(200);
  });

  it('GET /auth/me returns the authenticated admin', async () => {
    const { agent } = await signIn(SUPER_ADMIN.email, SUPER_ADMIN.password);
    const me = await agent.get('/auth/me').expect(200);
    expect(me.body.data.username).toBe(SUPER_ADMIN.email);
  });

  it('refreshes the token pair using the refresh cookie', async () => {
    const { agent } = await signIn(SUPER_ADMIN.email, SUPER_ADMIN.password);
    const refreshed = await agent.post('/auth/refresh').expect(200);
    const cookies = refreshed.headers['set-cookie'] as unknown as string[];
    expect(cookies.join(';')).toContain('access_token');
    // The rotated cookie keeps the session working.
    await agent.get('/shops').expect(200);
  });

  it('logout clears the cookies', async () => {
    const { agent } = await signIn(SUPER_ADMIN.email, SUPER_ADMIN.password);
    await agent.post('/auth/logout').expect(200);
    await agent.get('/shops').expect(401);
  });

  describe('shop admin ownership', () => {
    let acme: TestAgent;
    let acmeShopId: string;
    let otherShopId: string;
    let otherProductId: string;

    beforeAll(async () => {
      const { agent, res } = await signIn(ACME_ADMIN.username, ACME_ADMIN.password);
      acme = agent;
      acmeShopId = res.body.data.user.shopId;

      // Resolve the *other* shop and one of its products via public endpoints.
      const shops = await request(app.getHttpServer()).get('/public/shops');
      const other = shops.body.data.items.find(
        (s: { id: string; slug: string }) => s.slug === 'trendy-threads',
      );
      otherShopId = other.id;

      const products = await request(app.getHttpServer()).get(
        `/public/products?shopId=${otherShopId}`,
      );
      otherProductId = products.body.data.items[0].id;
    });

    it('can read its own shop', async () => {
      await acme.get(`/shops/${acmeShopId}`).expect(200);
    });

    it('cannot read another shop', async () => {
      await acme.get(`/shops/${otherShopId}`).expect(403);
    });

    it("cannot read another shop's product", async () => {
      await acme.get(`/products/${otherProductId}`).expect(403);
    });

    it("cannot update another shop's product", async () => {
      await acme
        .patch(`/products/${otherProductId}`)
        .send({ name: 'Hacked Name' })
        .expect(403);
    });

    it('cannot access the super-admin-only shop listing', async () => {
      await acme.get('/shops').expect(403);
    });
  });
});
