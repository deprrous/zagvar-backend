import {
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ShopOwnershipGuard } from './common/guards/shop-ownership.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { StorageUrlInterceptor } from './common/interceptors/storage-url.interceptor';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { BannersModule } from './modules/banners/banners.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductImagesModule } from './modules/product-images/product-images.module';
import { ProductsModule } from './modules/products/products.module';
import { PublicModule } from './modules/public/public.module';
import { ShopAdminsModule } from './modules/shop-admins/shop-admins.module';
import { ShopContactsModule } from './modules/shop-contacts/shop-contacts.module';
import { ShopSocialsModule } from './modules/shop-socials/shop-socials.module';
import { ShopsModule } from './modules/shops/shops.module';
import { SubcategoriesModule } from './modules/subcategories/subcategories.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    ShopsModule,
    ShopAdminsModule,
    ShopContactsModule,
    ShopSocialsModule,
    CategoriesModule,
    SubcategoriesModule,
    ProductsModule,
    ProductImagesModule,
    BannersModule,
    UploadsModule,
    PublicModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global validation: strips unknown props, transforms payloads to DTO types.
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        // NB: implicit conversion is intentionally OFF. With it on,
        // class-transformer coerces query strings to the reflected type before
        // @Transform runs, so Boolean("false") === true silently breaks every
        // boolean filter (e.g. ?isActive=false). Numeric query params already
        // declare @Type(() => Number) and body booleans arrive as real JSON
        // booleans, so neither relies on implicit conversion.
      }),
    },
    // Guards run in registration order: authenticate -> role -> ownership.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ShopOwnershipGuard },
    // ResponseInterceptor is outermost (wraps the envelope last); the storage
    // interceptor is registered after it so it runs on the raw payload first.
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: StorageUrlInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
