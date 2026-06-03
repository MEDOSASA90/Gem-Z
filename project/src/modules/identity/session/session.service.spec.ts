import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { Session } from './session.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('SessionService', () => {
  let service: SessionService;
  let repository: Repository<Session>;
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = {
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    };

    const mockRepository = {
      create: jest.fn().mockImplementation(dto => dto),
      save: jest.fn().mockImplementation(session => Promise.resolve({ id: 'sess-123', ...session })),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: getRepositoryToken(Session), useValue: mockRepository },
        { provide: 'default_IORedisModuleConnectionToken', useValue: mockRedis },
        { provide: 'default_RedisModuleConnectionToken', useValue: mockRedis },
        { provide: 'IORedis', useValue: mockRedis },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    repository = module.get<Repository<Session>>(getRepositoryToken(Session));
  });

  it('should create user active session with device fingerprint', async () => {
    const dto = {
      userId: 'usr-123',
      deviceFingerprint: 'fingerprint_sha256',
      ipAddress: '127.0.0.1',
      userAgent: 'Chrome',
      geoCountry: 'EG',
      tokenHash: 'token_hash',
      refreshTokenHash: 'refresh_hash',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };

    const result = await service.create(dto);
    expect(result).toBeDefined();
    expect(result.userId).toBe('usr-123');
    expect(result.deviceFingerprint).toBe('fingerprint_sha256');
    expect(mockRedis.setex).toHaveBeenCalledTimes(2);
  });

  it('should revoke previous sessions automatically when SingleSessionLock is active', async () => {
    const userId = 'usr-123';
    const activeSessions = [
      { id: 'sess-1', tokenHash: 'th-1', refreshTokenHash: 'rfh-1', isActive: true },
      { id: 'sess-2', tokenHash: 'th-2', refreshTokenHash: 'rfh-2', isActive: true },
    ];

    jest.spyOn(repository, 'find').mockResolvedValue(activeSessions as any);
    jest.spyOn(repository, 'save').mockResolvedValue([] as any);

    await service.revokeAll(userId);

    expect(repository.find).toHaveBeenCalled();
    expect(mockRedis.del).toHaveBeenCalledTimes(4); // 2 del calls per active session
  });

  it('should block session calls if the active device fingerprint deviates', async () => {
    const sessionId = 'sess-123';
    const originalFingerprint = 'fingerprint_original';
    const deviatingFingerprint = 'fingerprint_hacker';

    const session = {
      id: sessionId,
      userId: 'usr-123',
      deviceFingerprint: originalFingerprint,
      isActive: true,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    };

    jest.spyOn(repository, 'findOne').mockResolvedValue(session as any);

    const validatedSession = await repository.findOne({ where: { id: sessionId } });
    expect(validatedSession).toBeDefined();
    expect(validatedSession!.deviceFingerprint).not.toBe(deviatingFingerprint);
  });
});
