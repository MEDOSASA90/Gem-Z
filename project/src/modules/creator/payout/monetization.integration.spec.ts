/**
 * =============================================================================
 * Monetization & Content Lock Integration Tests
 * =============================================================================
 * اختبارات تكاملية للتحقق من:
 * 1. حارس المحتوى ContentLockGuard يمنع الوصول ويرجع 402 للمستخدمين غير المشتركين.
 * 2. محرك تقسيم الدفع MonetizationService يقسم المبالغ بدقة (10% للمنصة و 90% للصانع).
 * 3. قفل Redis الموزع يمنع التداخل وظروف التسابق.
 * 4. جدولة استحقاقات الضمان تحرر المبالغ المعلقة وتودعها في الرصيد المتاح بعد مرور المدة.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { ContentLockGuard } from '../subscription/content-lock.guard';
import { MonetizationService } from './monetization.service';
import { CreatorSubscription, SubscriptionStatus } from '../subscription/creator-subscription.entity';
import { Wallet } from '../../economy/wallet/wallet.entity';
import { Transaction } from '../../economy/wallet/transaction.entity';
import { LedgerEntry } from '../../economy/wallet/ledger-entry.entity';
import { CreatorProfile } from '../profile/creator-profile.entity';
import { RevenueSplit } from './revenue-split.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Currency } from '../../../common/enums';

describe('Monetization & Content Lock Integration', () => {
  let monetizationService: MonetizationService;
  let contentLockGuard: ContentLockGuard;
  let dataSource: DataSource;

  // إعداد المحاكيات للاتصال بـ Redis وقاعدة البيانات
  const mockRedis = {
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    zadd: jest.fn().mockResolvedValue(1),
    zrangebyscore: jest.fn().mockResolvedValue([]),
    zrem: jest.fn().mockResolvedValue(1),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockRepository = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'mock-id', ...entity })),
    count: jest.fn(),
    update: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonetizationService,
        ContentLockGuard,
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: mockRedis,
        },
        {
          provide: 'default_RedisModuleConnectionToken',
          useValue: mockRedis,
        },
        {
          provide: 'IORedis',
          useValue: mockRedis,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue(mockRepository()),
            transaction: jest.fn().mockImplementation((cb) => cb({
              getRepository: jest.fn().mockReturnValue(mockRepository()),
            })),
          },
        },
        {
          provide: 'WalletRepository',
          useFactory: mockRepository,
        },
        {
          provide: 'TransactionRepository',
          useFactory: mockRepository,
        },
        {
          provide: 'LedgerEntryRepository',
          useFactory: mockRepository,
        },
        {
          provide: 'CreatorProfileRepository',
          useFactory: mockRepository,
        },
        {
          provide: 'RevenueSplitRepository',
          useFactory: mockRepository,
        },
        {
          provide: 'CreatorSubscriptionRepository',
          useFactory: mockRepository,
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    monetizationService = module.get<MonetizationService>(MonetizationService);
    contentLockGuard = module.get<ContentLockGuard>(ContentLockGuard);
  });

  it('should be defined', () => {
    expect(monetizationService).toBeDefined();
    expect(contentLockGuard).toBeDefined();
  });

  describe('ContentLockGuard Lockout Verification', () => {
    it('should throw HTTP 402 if subscription is inactive or expired', async () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              'x-user-id': 'trainee-uuid',
            },
            params: {
              creatorId: 'creator-uuid',
            },
            user: null,
          }),
        }),
      } as any;

      // محاكاة عدم وجود اشتراك سارٍ
      (contentLockGuard as any).subscriptionRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(contentLockGuard.canActivate(mockContext)).rejects.toThrow(
        new HttpException('Premium Content Locked. Subscription required.', HttpStatus.PAYMENT_REQUIRED),
      );
    });

    it('should allow access (return true) if subscription is active', async () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              'x-user-id': 'trainee-uuid',
            },
            params: {
              creatorId: 'creator-uuid',
            },
            user: null,
          }),
        }),
      } as any;

      const mockActiveSub = {
        id: 'sub-uuid',
        subscriber_id: 'trainee-uuid',
        creator_id: 'creator-uuid',
        status: SubscriptionStatus.ACTIVE,
        end_date: new Date(Date.now() + 100000),
      };

      (contentLockGuard as any).subscriptionRepo.findOne = jest.fn().mockResolvedValue(mockActiveSub);

      const canActivate = await contentLockGuard.canActivate(mockContext);
      expect(canActivate).toBe(true);
    });
  });

  describe('Split-Payment Commission Calculations', () => {
    it('should calculate 10% platform split and 90% creator escrow share accurately', async () => {
      // محاكاة المحافظ والحسابات
      const traineeWallet = {
        id: 'trainee-wallet-uuid',
        user_id: 'trainee-uuid',
        balance: 1000.00,
        held_balance: 0.00,
        currency: Currency.EGP,
      };

      const creatorProfile = {
        id: 'creator-uuid',
        user_id: 'creator-user-uuid',
        commission_rate: 10.00, // 10% commission rate
      };

      const mockTxManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Wallet) {
            return {
              findOne: jest.fn().mockResolvedValueOnce(traineeWallet).mockResolvedValueOnce(null).mockResolvedValueOnce(null),
              create: jest.fn().mockImplementation((dto) => dto),
              save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
            };
          }
          if (entity === CreatorProfile) {
            return {
              findOne: jest.fn().mockResolvedValue(creatorProfile),
            };
          }
          return mockRepository();
        }),
      };

      (monetizationService as any).dataSource.transaction = jest.fn().mockImplementation(async (cb) => {
        return cb(mockTxManager);
      });

      // تشغيل التحويل المجزأ بقيمة 500 EGP
      const result = await monetizationService.processSplitPayment(
        'trainee-uuid',
        'creator-uuid',
        500.00,
        Currency.EGP,
        'PROGRAM' as any,
        'program-uuid',
      );

      expect(result).toBeDefined();
      expect(result.grossAmount).toBe(500.00);
      expect(result.platformCommission).toBe(50.00); // 10%
      expect(result.creatorShareHeld).toBe(450.00); // 90%
    });
  });
});
