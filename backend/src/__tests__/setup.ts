/**
 * GEM Z — Test Setup File
 *
 * Runs before all test suites. Configures the test environment:
 * - Loads .env.test variables
 * - Mocks external services (Redis, OpenAI, Nodemailer)
 * - Mocks the config module with test values
 * - Sets up test database connection
 * - Cleans up after all tests
 */

import dotenv from 'dotenv';
import path from 'path';

// ─── Load Test Environment Variables ──────────────────────────

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// ─── Mock pg (PostgreSQL) ─────────────────────────────────────

jest.mock('pg', () => {
    const mockQuery = jest.fn();
    const mockConnect = jest.fn();
    const mockRelease = jest.fn();
    const mockBegin = jest.fn();
    const mockCommit = jest.fn();
    const mockRollback = jest.fn();

    const mockClient = {
        query: mockQuery,
        release: mockRelease,
    };

    const mockPool = jest.fn().mockImplementation(() => ({
        query: mockQuery,
        connect: mockConnect,
        on: jest.fn(),
    }));

    return {
        Pool: mockPool,
        PoolClient: jest.fn(),
        __mockQuery: mockQuery,
        __mockConnect: mockConnect,
        __mockRelease: mockRelease,
        __mockClient: mockClient,
    };
});

// ─── Mock Redis (ioredis) ─────────────────────────────────────

jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        setex: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        exists: jest.fn().mockResolvedValue(0),
        expire: jest.fn().mockResolvedValue(1),
        ttl: jest.fn().mockResolvedValue(-1),
        keys: jest.fn().mockResolvedValue([]),
        flushall: jest.fn().mockResolvedValue('OK'),
        flushdb: jest.fn().mockResolvedValue('OK'),
        ping: jest.fn().mockResolvedValue('PONG'),
        info: jest.fn().mockResolvedValue(''),
        lpush: jest.fn().mockResolvedValue(1),
        rpop: jest.fn().mockResolvedValue(null),
        blpop: jest.fn().mockResolvedValue(null),
        lrange: jest.fn().mockResolvedValue([]),
        llen: jest.fn().mockResolvedValue(0),
        publish: jest.fn().mockResolvedValue(0),
        subscribe: jest.fn().mockResolvedValue(undefined),
        unsubscribe: jest.fn().mockResolvedValue(undefined),
        multi: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
        }),
        pipeline: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
        }),
    }));
});

// ─── Mock OpenAI ──────────────────────────────────────────────

jest.mock('openai', () => {
    const mockCreate = jest.fn().mockResolvedValue({
        choices: [
            {
                message: {
                    content: JSON.stringify({
                        fullName: 'Test User',
                        nationalId: '12345678901234',
                        dateOfBirth: '1990-01-01',
                        address: 'Test Address',
                    }),
                    role: 'assistant',
                },
                finish_reason: 'stop',
            },
        ],
        usage: { total_tokens: 100, prompt_tokens: 50, completion_tokens: 50 },
    });

    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: mockCreate,
            },
        },
        __mockCreate: mockCreate,
    }));
});

// ─── Mock Nodemailer ──────────────────────────────────────────

jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: '<test-message-id>' }),
        verify: jest.fn().mockResolvedValue(true),
        close: jest.fn().mockResolvedValue(undefined),
    }),
}));

// ─── Mock BullMQ ──────────────────────────────────────────────

jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => ({
        add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
        getJob: jest.fn().mockResolvedValue(null),
        getJobs: jest.fn().mockResolvedValue([]),
        close: jest.fn().mockResolvedValue(undefined),
    })),
    Worker: jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
    })),
    QueueScheduler: jest.fn().mockImplementation(() => ({
        close: jest.fn().mockResolvedValue(undefined),
    })),
    FlowProducer: jest.fn().mockImplementation(() => ({
        add: jest.fn().mockResolvedValue({}),
        close: jest.fn().mockResolvedValue(undefined),
    })),
}));

// ─── Mock Config Module ───────────────────────────────────────

jest.mock('../config', () => ({
    config: {
        nodeEnv: 'test',
        port: 5000,
        isDevelopment: false,
        isProduction: false,
        databaseUrl: 'postgresql://test_user:test_pass@localhost:5433/gemz_test_db',
        databaseSsl: false,
        jwtSecret: 'test-jwt-secret-minimum-32-characters-long-for-testing',
        refreshSecret: 'test-refresh-secret-minimum-32-characters-long-for-testing',
        clientUrl: 'http://localhost:3000',
        apiUrl: 'http://localhost:5000',
        smtp: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            user: 'test@gemz.app',
            pass: 'test-smtp-password',
            from: 'Gem Z Test <noreply@gemz.app>',
        },
        openaiApiKey: 'sk-test-key-for-testing-only',
        redisUrl: 'redis://localhost:6379/1',
        vapid: {
            publicKey: '',
            privateKey: '',
            subject: '',
        },
        sentryDsn: '',
        upload: {
            maxSize: 10 * 1024 * 1024,
            path: './public/uploads',
        },
        rateLimit: {
            general: { windowMs: 60 * 1000, max: 100 },
            login: { windowMs: 15 * 60 * 1000, max: 5 },
            register: { windowMs: 60 * 60 * 1000, max: 3 },
            passwordReset: { windowMs: 15 * 60 * 1000, max: 3 },
            walletWrite: { windowMs: 60 * 1000, max: 10 },
            withdrawal: { windowMs: 60 * 1000, max: 5 },
            upload: { windowMs: 60 * 60 * 1000, max: 20 },
        },
    },
}));

// ─── Mock Web Push ────────────────────────────────────────────

jest.mock('web-push', () => ({
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }),
}));

// ─── Mock Multer ──────────────────────────────────────────────

jest.mock('multer', () => {
    const mockMulter = jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
        array: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
        fields: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
        none: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
        any: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
    });

    (mockMulter as any).diskStorage = jest.fn().mockReturnValue({});
    (mockMulter as any).memoryStorage = jest.fn().mockReturnValue({});

    return mockMulter;
});

// ─── Mock bcrypt (for faster tests) ───────────────────────────

jest.mock('bcrypt', () => ({
    genSalt: jest.fn().mockResolvedValue('$2b$12$test_salt'),
    hash: jest.fn().mockResolvedValue('$2b$12$hashed_password_value'),
    compare: jest.fn().mockImplementation((plaintext: string, hash: string) => {
        return Promise.resolve(plaintext === 'correct_password');
    }),
}));

// ─── Global Test Hooks ────────────────────────────────────────

beforeAll(async () => {
    // Any one-time setup before all tests run
    console.log('\n🧪 GEM Z Test Suite Starting...\n');
});

afterAll(async () => {
    // Cleanup after all tests complete
    console.log('\n✅ GEM Z Test Suite Complete\n');
});
