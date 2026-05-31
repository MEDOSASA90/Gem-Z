/**
 * ============================================================
 * GEM Z - Global Fitness Operating System v5.0
 * Entry Point - main.ts
 * ============================================================
 * - NestFactory مع إعدادات Production-ready
 * - ValidationPipe global مع whitelist و transform
 * - Swagger/OpenAPI documentation
 * - API Versioning (VERSION_NEUTRAL)
 * - CORS, Helmet, Morgan logging
 * - Throttler (Rate Limiting)
 * - Graceful shutdown hooks
 * ============================================================
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  // إنشاء تطبيق NestJS
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // ─── Compression ───
  app.use(compression());

  // ─── Security - Helmet ───
  app.use(helmet());

  // ─── Morgan HTTP Logging ───
  app.use(
    morgan(':method :url :status :res[content-length] - :response-time ms', {
      skip: (req: any) => req.url === '/health',
    }),
  );

  // ─── CORS ───
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // ─── Global Prefix ───
  app.setGlobalPrefix('api');

  // ─── API Versioning ───
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ─── Global Validation Pipe ───
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // إزالة الحقول غير المُعلنة في DTO
      transform: true, // تحويل الأنواع تلقائياً
      forbidNonWhitelisted: true, // رفض الطلبات التي تحتوي على حقول غير معروفة
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Swagger Documentation ───
  const config = new DocumentBuilder()
    .setTitle('GEM Z API')
    .setDescription(
      'GEM Z - Global Fitness Operating System v5.0\n\n' +
        'Modular monolith enterprise fitness platform with multi-currency support, ' +
        'AI intelligence, gym management, marketplace, and creator economy.',
    )
    .setVersion('5.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT access token',
      },
      'JWT',
    )
    .addTag('Auth', 'Authentication & Authorization')
    .addTag('Users', 'User management')
    .addTag('KYC', 'Know Your Customer')
    .addTag('Wallets', 'Wallet & Transactions')
    .addTag('FX', 'Foreign Exchange')
    .addTag('Gyms', 'Gym Management')
    .addTag('Bookings', 'Class Booking Engine')
    .addTag('Products', 'Marketplace Products')
    .addTag('Orders', 'Order Management')
    .addTag('Admin', 'Enterprise Admin')
    .addTag('Health', 'System Health')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'GEM Z API Docs',
  });

  // ─── Graceful Shutdown ───
  app.enableShutdownHooks();

  // ─── Start Server ───
  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');

  console.log(`✅ GEM Z API running on http://localhost:${port}`);
  console.log(`📚 Swagger Docs: http://localhost:${port}/docs`);
}

// تشغيل التطبيق مع معالجة الأخطاء
bootstrap().catch((err) => {
  console.error('❌ Failed to start GEM Z API:', err);
  process.exit(1);
});
