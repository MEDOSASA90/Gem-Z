/**
 * GEM Z — Jest Configuration
 *
 * - ts-jest preset for TypeScript support
 * - Coverage thresholds: 70% lines, 70% functions, 60% branches
 * - Module path mapping for @/ alias
 * - Test environment: node (for Express/PostgreSQL)
 */

import type { Config } from 'jest';

const config: Config = {
    // Use ts-jest for TypeScript transpilation
    preset: 'ts-jest',
    testEnvironment: 'node',

    // Root directories for test discovery
    roots: ['<rootDir>/src'],

    // Test file patterns
    testMatch: [
        '**/__tests__/**/*.test.ts',
    ],

    // Setup files for test environment
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],

    // Module path aliases (@/ → src/)
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },

    // File extensions Jest will look for
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

    // Transform TypeScript files with ts-jest
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/tsconfig.json',
                diagnostics: {
                    ignoreCodes: [151001], // Ignore 'cannot find name' for test globals
                },
            },
        ],
    },

    // Ignore patterns (node_modules handled by default)
    transformIgnorePatterns: [
        'node_modules/(?!(bullmq|ioredis|@bull-board)/)',
    ],

    // Collect coverage from source files (not tests, mocks, or config)
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/__tests__/**',
        '!src/**/__tests__/**',
        '!src/**/*.routes.ts',
        '!src/**/index.ts',
        '!src/**/*.types.ts',
        '!src/migrate.ts',
        '!src/run_sql.ts',
        '!src/core/sockets/**',
        '!src/core/logging/**',
        '!src/core/queue/**',
        '!src/core/redis/**',
        '!src/core/cache/**',
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            lines: 70,
            functions: 70,
            branches: 60,
            statements: 70,
        },
    },

    // Coverage report formats
    coverageReporters: ['text', 'text-summary', 'lcov', 'html'],

    // Coverage output directory
    coverageDirectory: '<rootDir>/coverage',

    // Test timeout (10s for DB operations)
    testTimeout: 10000,

    // Verbose output for better test visibility
    verbose: true,

    // Clear mock calls between tests
    clearMocks: true,

    // Restore mock state between tests
    restoreMocks: true,

    // Detect open handles (e.g., DB connections not closed)
    detectOpenHandles: true,

    // Force exit after all tests complete
    forceExit: true,

    // Error on deprecated API usage
    errorOnDeprecated: true,
};

export default config;
