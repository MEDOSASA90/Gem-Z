/**
 * =============================================================================
 * Phase 5 Integration Tests - Global Scaling & Advanced Features
 * =============================================================================
 * اختبارات تكاملية شاملة للتحقق من:
 * 1. تقسيم أرباح فروع الفرنشايز ذرياً تحت قفل موزع من Redis وتوجيه الحصص لمالك الجيم الرئيسيhq.
 * 2. احتساب الضرائب عابرة الحدود ديناميكياً (SA: 15%, EG: 14%, UAE: 5%) وتوليد هاش SHA-256.
 * 3. لوحة تحكم الشركات B2B HR Analytics وإجراء التراجع بأمان للـ Empty State.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { FranchiseRevenueService } from '../../fitness/gym/franchise-revenue.service';
import { TaxComplianceService } from '../../economy/tax-compliance.service';
import { DashboardService } from './dashboard.service';
import { GymBranch } from '../../fitness/gym/branch.entity';
import { Gym } from '../../fitness/gym/gym.entity';
import { Wallet } from '../../economy/wallet/wallet.entity';
import { Transaction } from '../../economy/wallet/transaction.entity';
import { LedgerEntry } from '../../economy/wallet/ledger-entry.entity';
import { CorporateClient } from '../company/corporate-client.entity';
import { EmployeeWellness } from '../wellness/employee-wellness.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Currency } from '../../../common/enums';

// محاكاة عميل ClickHouse لتفادي محاولة الاتصال الحقيقي بشبكة محرك التحليلات
jest.mock('../../../config/clickhouse.config', () => ({
  createClickHouseClient: jest.fn().mockReturnValue({
    query: jest.fn().mockRejectedValue(new Error('ClickHouse not connected in integration tests')),
  }),
}));

describe('Global Scaling & Advanced Features (Phase 5)', () => {
  let franchiseService: FranchiseRevenueService;
  let taxService: TaxComplianceService;
  let dashboardService: DashboardService;

  // إعداد المحاكيات للاتصال بـ Redis
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
        FranchiseRevenueService,
        TaxComplianceService,
        DashboardService,
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
          provide: 'GymBranchRepository',
          useFactory: mockRepository,
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
          provide: 'CorporateClientRepository',
          useFactory: mockRepository,
        },
        {
          provide: 'EmployeeWellnessRepository',
          useFactory: mockRepository,
        },
      ],
    }).compile();

    franchiseService = module.get<FranchiseRevenueService>(FranchiseRevenueService);
    taxService = module.get<TaxComplianceService>(TaxComplianceService);
    dashboardService = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(franchiseService).toBeDefined();
    expect(taxService).toBeDefined();
    expect(dashboardService).toBeDefined();
  });

  describe('Franchise Split-Payment Mechanics', () => {
    it('should split franchise branch earnings (e.g. 20/80) and resolve HQ owner wallet dynamically', async () => {
      const mockBranch = {
        id: 'branch-uuid',
        name: 'Regional Cairo Branch',
        revenue_split_ratio: 20.00, // 20% HQ split
        settings: { operator_id: 'branch-operator-uuid' },
        gym: {
          id: 'gym-hq-uuid',
          owner_id: 'master-hq-owner-uuid',
        },
      };

      const traineeWallet = {
        id: 'trainee-wallet-uuid',
        user_id: 'trainee-uuid',
        balance: 1000.00,
        currency: Currency.EGP,
      };

      const mockTxManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === GymBranch) {
            return {
              findOne: jest.fn().mockResolvedValue(mockBranch),
            };
          }
          if (entity === Wallet) {
            return {
              findOne: jest.fn()
                .mockResolvedValueOnce(traineeWallet) // Trainee wallet
                .mockResolvedValueOnce(null) // HQ wallet (creates new)
                .mockResolvedValueOnce(null), // Branch wallet (creates new)
              create: jest.fn().mockImplementation((dto) => dto),
              save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'wallet-id', ...entity })),
            };
          }
          return mockRepository();
        }),
      };

      (franchiseService as any).dataSource.transaction = jest.fn().mockImplementation(async (cb) => {
        return cb(mockTxManager);
      });

      const result = await franchiseService.processFranchiseRevenueSplit(
        'branch-uuid',
        'trainee-uuid',
        200.00, // 200 EGP total membership fee
        Currency.EGP,
        'MEMBERSHIP',
        'membership-uuid',
      );

      expect(result).toBeDefined();
      expect(result.grossAmount).toBe(200.00);
      expect(result.hqSplitAmount).toBe(40.00); // 20%
      expect(result.branchSplitAmount).toBe(160.00); // 80%
      expect(result.hqOwnerUserId).toBe('master-hq-owner-uuid');
    });
  });

  describe('Tax Localization Compliance & SHA-256 Hash Footprint', () => {
    it('should calculate 15% VAT for KSA and generate conforming ZATCA metadata locally with SHA-256 footprint', async () => {
      const mockBaseTransaction = {
        id: 'tx-uuid',
        amount: 100.00,
        currency: Currency.SAR,
        metadata: {},
      };

      const mockTxManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Transaction) {
            return {
              findOne: jest.fn().mockResolvedValue(mockBaseTransaction),
              save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
            };
          }
          return mockRepository();
        }),
      };

      (taxService as any).dataSource.transaction = jest.fn().mockImplementation(async (cb) => {
        return cb(mockTxManager);
      });

      const result = await taxService.generateEInvoice(
        'tx-uuid',
        'SA',
        'SESSION',
        100.00, // 100 SAR base price
        Currency.SAR,
      );

      expect(result).toBeDefined();
      expect(result.vatRate).toBe(15);
      expect(result.taxAmount).toBe(15.00);
      expect(result.totalAmount).toBe(115.00);
      expect(result.hashFootprint).toBeDefined();
      expect(result.hashFootprint.length).toBe(64); // SHA-256 length is 64 hex characters
    });

    it('should calculate 14% VAT for Egypt with ETA compliant GS1 unified item codes', async () => {
      const mockBaseTransaction = {
        id: 'tx-uuid',
        amount: 200.00,
        currency: Currency.EGP,
        metadata: {},
      };

      const mockTxManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Transaction) {
            return {
              findOne: jest.fn().mockResolvedValue(mockBaseTransaction),
              save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
            };
          }
          return mockRepository();
        }),
      };

      (taxService as any).dataSource.transaction = jest.fn().mockImplementation(async (cb) => {
        return cb(mockTxManager);
      });

      const result = await taxService.generateEInvoice(
        'tx-uuid',
        'EG',
        'MEMBERSHIP',
        200.00,
        Currency.EGP,
      );

      expect(result).toBeDefined();
      expect(result.vatRate).toBe(14);
      expect(result.taxAmount).toBe(28.00);
      expect(result.totalAmount).toBe(228.00);
    });
  });

  describe('B2B Corporate Wellness Telemetry & Empty State Fallback', () => {
    it('should return empty state values (0 counts) if no corporate logs or database records exist to prevent UI crashes', async () => {
      const mockHRAdminUserId = 'hr-admin-uuid';
      const mockClient = {
        id: 'corporate-client-uuid',
        name: 'Enterprise Inc',
        hr_admin_id: mockHRAdminUserId,
        tenant_id: 'corporate-tenant-uuid',
      };

      // محاكاة عدم وجود أي بيانات في ClickHouse وفي PostgreSQL
      (dashboardService as any).clientRepo.findOne = jest.fn().mockResolvedValue(mockClient);
      (dashboardService as any).wellnessRepo.find = jest.fn().mockResolvedValue([]);

      const result = await dashboardService.getHRAnalytics(mockHRAdminUserId);

      expect(result).toBeDefined();
      expect(result.activeParticipationRate).toBe(0);
      expect(result.challengeCompletionRatio).toBe(0);
      expect(result.corporateWellnessKpi).toBe(0);
      expect(result.totalEmployees).toBe(0);
      expect(result.source).toBe('empty_state');
    });
  });
});
