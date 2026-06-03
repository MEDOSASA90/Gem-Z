/**
 * ============================================================
 * GEM Z - Global Fitness Operating System v5.0
 * Root Module - PRODUCTION READY
 * ============================================================
 * يستورد كل الموديولات المُنفذة (16+ وحدة):
 * - ConfigModule (global)
 * - TypeOrmModule (PostgreSQL)
 * - ThrottlerModule (Rate Limiting)
 * - ScheduleModule (Task Scheduling)
 * - Feature Modules: Identity, Economy, Fitness, Marketplace,
 *   Enterprise, Social, Creator, Corporate, Ads, Settlement,
 *   Compliance, Health, AI
 * - Core Modules: EventBus, Audit, Security, Health, Orchestrator
 * ============================================================
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '@nestjs-modules/ioredis';

// ─── Config ───
import { getDatabaseConfig } from './config/database.config';

// ─── Identity Module ───
import { IdentityModule } from './modules/identity/identity.module';

// ─── Economy Module ───
import { EconomyModule } from './modules/economy/economy.module';

// ─── Fitness Module ───
import { FitnessModule } from './modules/fitness/fitness.module';

// ─── Marketplace Module ───
import { MarketplaceModule } from './modules/marketplace/marketplace.module';

// ─── Enterprise Module ───
import { EnterpriseModule } from './modules/enterprise/enterprise.module';

// ─── Social Module ───
import { SocialModule } from './modules/social/social.module';

// ─── Creator Module ───
import { CreatorModule } from './modules/creator/creator.module';

// ─── Corporate Module ───
import { CorporateModule } from './modules/corporate/corporate.module';

// ─── Ads Module ───
import { AdsModule } from './modules/ads/ads.module';

// ─── Settlement Module ───
import { SettlementModule } from './modules/settlement/settlement.module';

// ─── Compliance Module ───
import { ComplianceModule } from './modules/compliance/compliance.module';

// ─── Health Integration Module ───
import { HealthIntegrationModule } from './modules/health/health-integration.module';

// ─── AI Module ───
import { AiModule } from './modules/ai/ai.module';

// ─── Core Modules ───
import { EventBusModule } from './core/event-bus/event-bus.module';
import { AuditModule } from './core/audit/audit.module';
import { SecurityModule } from './core/security/security.module';
import { HealthModule } from './core/health/health.module';
import { OrchestratorModule } from './core/orchestrator/orchestrator.module';
import { FeatureFlagModule } from './core/feature-flags/feature-flags.module';
import { GlobalConfigModule } from './core/global-config/global-config.module';
import { LockModule } from './core/security/locks/lock.module';

@Module({
  imports: [
    // ─── Global Config ───
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.development'],
      cache: true,
    }),

    // ─── Event Emitter ───
    EventEmitterModule.forRoot(),

    // ─── Redis (Global Cache/Locks Connection) ───
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    }),

    // ─── Scheduler ───
    ScheduleModule.forRoot(),

    // ─── Throttler (Rate Limiting) ───
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60000', 10),
        limit: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
      },
      {
        name: 'auth',
        ttl: 60000, // 1 دقيقة
        limit: 5, // 5 محاولات فقط
      },
      {
        name: 'sensitive',
        ttl: 60000,
        limit: 3, // 3 محاولات للعمليات الحساسة
      },
      {
        name: 'admin',
        ttl: 60000,
        limit: 30, // 30 طلب للأدمن
      },
    ]),

    // ─── TypeORM - PostgreSQL ───
    TypeOrmModule.forRootAsync({
      useFactory: () => getDatabaseConfig(),
    }),

    // ─── Core Modules (Active) ───
    EventBusModule,
    AuditModule,
    SecurityModule,
    HealthModule,
    OrchestratorModule,
    FeatureFlagModule,
    GlobalConfigModule,
    LockModule,

    // ─── Feature Modules (All Active) ───
    IdentityModule,
    ...(process.env.USE_SQLITE === 'true' ? [] : [
      EconomyModule,
      FitnessModule,
      MarketplaceModule,
      EnterpriseModule,
      SocialModule,
      CreatorModule,
      CorporateModule,
      AdsModule,
      SettlementModule,
      ComplianceModule,
      HealthIntegrationModule,
      AiModule,
    ]),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
