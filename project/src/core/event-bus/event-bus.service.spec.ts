import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from './event-bus.service';
import { EventEnvelope, EventType } from './event.types';

// Mock Redis client
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: jest.fn(),
      publish: jest.fn().mockResolvedValue(1),
      subscribe: jest.fn().mockImplementation((channel, cb) => {
        if (cb) cb(null);
      }),
      unsubscribe: jest.fn().mockImplementation((channel, cb) => {
        if (cb) cb(null);
      }),
      quit: jest.fn().mockResolvedValue('OK'),
      rpush: jest.fn().mockResolvedValue(1),
    };
  });
});

describe('EventBusService', () => {
  let service: EventBusService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBusService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<EventBusService>(EventBusService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should initialize and connect to Redis Pub/Sub', async () => {
    await expect(service.onModuleInit()).resolves.not.toThrow();
    const stats = service.getStats();
    expect(stats).toBeDefined();
    expect(stats.totalPublished).toBe(0);
  });

  it('should wrap dynamic payloads in validated EventEnvelope', async () => {
    await service.onModuleInit();
    const payload = { userId: 'usr-123', event: 'test' };
    
    const publishSpy = jest.spyOn(service, 'publish');
    
    await service.publishSimple(
      'USER_REGISTERED' as EventType,
      payload,
      'usr-123',
      'identity',
    );

    expect(publishSpy).toHaveBeenCalled();
    const stats = service.getStats();
    expect(stats.totalPublished).toBe(1);
  });

  it('should automatically route failed messages to DLQ after 3 retries', async () => {
    await service.onModuleInit();
    
    const envelope: EventEnvelope<any> = {
      event_id: 'evt-123',
      event_type: 'USER_REGISTERED' as EventType,
      correlation_id: 'corr-123',
      actor_id: 'usr-123',
      source_module: 'identity',
      timestamp: new Date().toISOString(),
      device_metadata: {
        fingerprint: 'sys',
        userAgent: 'sys',
        ip: '127.0.0.1',
        geo: { country: 'EG', city: 'Cairo', lat: 30, lon: 31 },
      },
      fraud_metadata: {
        score: 0,
        signals: [],
        action: 'ALLOW',
      },
      payload: { userId: 'usr-123' },
    };

    let attempts = 0;
    const failingHandler = jest.fn().mockImplementation(() => {
      attempts++;
      throw new Error('Handler simulated failure');
    });

    service.subscribeWithOptions(
      {
        pattern: 'events:USER_REGISTERED',
        maxRetries: 2, // 3 total attempts (1 initial + 2 retries)
        retryDelay: 1, // 1ms delay for tests
        timeout: 1000,
      },
      failingHandler,
    );

    // Get the wrapped handler we registered
    const handlers = (service as any).handlers.get('events:USER_REGISTERED');
    expect(handlers).toBeDefined();
    const registeredHandler = Array.from(handlers)[0] as any;

    // Execute the handler to trigger retries and routing to DLQ
    await registeredHandler(envelope);

    expect(attempts).toBe(3); // Initial attempt + 2 retries
    const stats = service.getStats();
    expect(stats.failedDeliveries).toBe(1); // One permanent failure registered
  });
});
