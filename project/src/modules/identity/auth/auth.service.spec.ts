import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { SessionService } from '../session/session.service';
import { MFAService } from './mfa.service';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '../user/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let sessionService: SessionService;
  let mfaService: MFAService;
  let jwtService: JwtService;
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    const mockUserService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      comparePassword: jest.fn(),
      isTrustedDevice: jest.fn(),
      updateLastLogin: jest.fn(),
      addTrustedDevice: jest.fn(),
    };

    const mockSessionService = {
      create: jest.fn(),
      hashToken: jest.fn(),
      validateRefreshTokenHash: jest.fn(),
      revokeAll: jest.fn(),
    };

    const mockMFAService = {
      setup: jest.fn(),
      verify: jest.fn(),
      hasMFASetup: jest.fn(),
      sendCode: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt_token'),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: MFAService, useValue: mockMFAService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: 'default_IORedisModuleConnectionToken', useValue: mockRedis },
        { provide: 'default_RedisModuleConnectionToken', useValue: mockRedis },
        { provide: 'IORedis', useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    sessionService = module.get<SessionService>(SessionService);
    mfaService = module.get<MFAService>(MFAService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should initiate Egyptian OTP login and generate mock 123456 code', async () => {
    const testEmail = 'egyptian_user@gemz.eg';
    const mockUser = {
      id: 'usr-123',
      email: testEmail,
      phone: '+201012345678',
      status: UserStatus.ACTIVE,
    };
    
    jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser as any);
    jest.spyOn(mfaService, 'sendCode').mockResolvedValue({ code: '123456', ttl: 600 });

    const result = await service.forgotPassword({ email: testEmail });
    expect(result).toBeDefined();
    expect(result.message).toContain('تم ارسال رابط استعادة كلمة المرور');
  });

  it('should block OTP generation if rate limit exceeds 5 per day', async () => {
    const testEmail = 'egyptian_user@gemz.eg';
    jest.spyOn(userService, 'findByEmail').mockResolvedValue({ id: 'usr-123', email: testEmail } as any);
    
    mockRedis.get.mockResolvedValue('6'); // Greater than 5

    await expect(service.login({
      email: testEmail,
      password: 'password',
      deviceInfo: { ip: '127.0.0.1', fingerprint: 'fingerprint', userAgent: 'Chrome' }
    })).rejects.toThrow(ForbiddenException);
  });

  it('should verify correct OTP and return secure JWT signatures', async () => {
    const testEmail = 'egyptian_user@gemz.eg';
    const mockUser = {
      id: 'usr-123',
      email: testEmail,
      passwordHash: 'hashed_password',
      status: UserStatus.ACTIVE,
      fraudScore: 0,
    };

    jest.spyOn(userService, 'findByEmailWithPassword').mockResolvedValue(mockUser as any);
    jest.spyOn(userService, 'comparePassword').mockResolvedValue(true);
    jest.spyOn(userService, 'isTrustedDevice').mockResolvedValue(true);
    jest.spyOn(sessionService, 'create').mockResolvedValue({
      id: 'sess-123',
      tokenHash: 'token_hash',
      refreshTokenHash: 'refresh_hash',
    } as any);

    const result = await service.login({
      email: testEmail,
      password: 'password',
      deviceInfo: { ip: '127.0.0.1', fingerprint: 'fingerprint', userAgent: 'Chrome' }
    });

    expect(result).toBeDefined();
    expect(result.accessToken).toBe('jwt_token');
    expect(result.refreshToken).toBe('jwt_token');
    expect(result.mfaRequired).toBeFalsy();
  });
});
