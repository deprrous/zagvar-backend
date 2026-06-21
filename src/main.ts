import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Behind nginx (TLS terminated at the proxy): trust the first hop so secure
  // cookies are emitted and `req.ip` reflects the real client, not the proxy.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Credentialed CORS so browsers send/receive the httpOnly auth cookies.
  // With credentials, the allowed origin cannot be the `*` wildcard: an
  // explicit allowlist (CORS_ORIGINS, comma-separated) is used when configured,
  // otherwise the request origin is reflected (convenient for local dev).
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Zagvar Shop Directory API')
    .setDescription(
      'Online shop directory backend. Super admins manage shops, shop ' +
        'admins, and the global taxonomy; shop admins manage their own shop ' +
        'and products. Public endpoints power discovery.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth')
    .addTag('public')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
  logger.log(`🚀 Application running on http://localhost:${port}`);
}

void bootstrap();
