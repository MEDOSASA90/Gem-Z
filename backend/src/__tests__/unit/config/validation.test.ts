/**
 * GEM Z — Config Validation Unit Tests
 *
 * Tests the validateEnv() function:
 * - Returns config when all required vars are set
 * - Throws when DATABASE_URL is missing
 * - Throws when JWT_SECRET is too weak
 * - Throws when JWT_SECRET contains 'dev_secret'
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { validateEnv } from '../../../config/validation';

describe('Config — validateEnv()', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset process.env before each test
        process.env = { ...originalEnv };
        // Prevent process.exit from actually exiting
        jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
            throw new Error(`PROCESS_EXIT_${code}`);
        });
        // Mock console.error to suppress output in tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.restoreAllMocks();
    });

    // ─── Success Paths ──────────────────────────────────────────

    it('returns config when all required vars are set', () => {
        // Arrange: Set all required environment variables
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'this_is_a_very_strong_secret_key_32_chars';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';
        process.env.OPENAI_API_KEY = 'sk-test-key';

        // Act
        const config = validateEnv();

        // Assert
        expect(config).toBeDefined();
        expect(config.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/gemz');
        expect(config.JWT_SECRET).toBe('this_is_a_very_strong_secret_key_32_chars');
        expect(config.REFRESH_SECRET).toBe('this_is_another_very_strong_secret_key');
    });

    it('uses default values for optional vars', () => {
        // Arrange: Set only required vars
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'this_is_a_very_strong_secret_key_32_chars';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';

        // Act
        const config = validateEnv();

        // Assert
        expect(config.NODE_ENV).toBe('development');
        expect(config.PORT).toBe(5000);
        expect(config.CLIENT_URL).toBe('http://localhost:3000');
        expect(config.API_URL).toBe('http://localhost:5000');
        expect(config.SMTP_HOST).toBe('smtp.gmail.com');
        expect(config.SMTP_PORT).toBe(587);
        expect(config.SMTP_SECURE).toBe(false);
    });

    it('validates URL type correctly', () => {
        // Arrange
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'this_is_a_very_strong_secret_key_32_chars';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';
        process.env.CLIENT_URL = 'https://example.com';

        // Act
        const config = validateEnv();

        // Assert
        expect(config.CLIENT_URL).toBe('https://example.com');
    });

    it('validates number type correctly', () => {
        // Arrange
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'this_is_a_very_strong_secret_key_32_chars';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';
        process.env.PORT = '8080';

        // Act
        const config = validateEnv();

        // Assert
        expect(config.PORT).toBe(8080);
    });

    it('validates boolean type correctly', () => {
        // Arrange
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'this_is_a_very_strong_secret_key_32_chars';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';
        process.env.SMTP_SECURE = 'true';

        // Act
        const config = validateEnv();

        // Assert
        expect(config.SMTP_SECURE).toBe(true);
    });

    // ─── Error Paths ────────────────────────────────────────────

    it('throws when DATABASE_URL is missing', () => {
        // Arrange
        delete process.env.DATABASE_URL;
        process.env.JWT_SECRET = 'this_is_a_very_strong_secret_key_32_chars';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';

        // Act & Assert
        expect(() => validateEnv()).toThrow('PROCESS_EXIT_1');
    });

    it('throws when JWT_SECRET is too weak (less than 32 chars)', () => {
        // Arrange
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'short_secret';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';

        // Act & Assert
        expect(() => validateEnv()).toThrow('PROCESS_EXIT_1');
    });

    it('throws when JWT_SECRET contains "dev_secret"', () => {
        // Arrange
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'my_dev_secret_key_is_not_safe_enough';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';

        // Act & Assert
        expect(() => validateEnv()).toThrow('PROCESS_EXIT_1');
    });

    it('throws when JWT_SECRET contains "change_me"', () => {
        // Arrange
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'please_change_me_this_is_insecure!!';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';

        // Act & Assert
        expect(() => validateEnv()).toThrow('PROCESS_EXIT_1');
    });

    it('throws when JWT_SECRET contains "test"', () => {
        // Arrange
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'this_is_just_a_test_secret_key!!';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';

        // Act & Assert
        expect(() => validateEnv()).toThrow('PROCESS_EXIT_1');
    });

    it('throws when JWT_SECRET contains "default"', () => {
        // Arrange
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'default_secret_key_for_jwt_is_bad';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';

        // Act & Assert
        expect(() => validateEnv()).toThrow('PROCESS_EXIT_1');
    });

    it('throws when REFRESH_SECRET is too weak', () => {
        // Arrange
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'this_is_a_very_strong_secret_key_32_chars';
        process.env.REFRESH_SECRET = 'weak_refresh';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';

        // Act & Assert
        expect(() => validateEnv()).toThrow('PROCESS_EXIT_1');
    });

    it('throws when SMTP_USER is missing', () => {
        // Arrange
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'this_is_a_very_strong_secret_key_32_chars';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        delete process.env.SMTP_USER;
        process.env.SMTP_PASS = 'smtp_password';

        // Act & Assert
        expect(() => validateEnv()).toThrow('PROCESS_EXIT_1');
    });

    it('throws when SMTP_PASS is missing', () => {
        // Arrange
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'this_is_a_very_strong_secret_key_32_chars';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        delete process.env.SMTP_PASS;

        // Act & Assert
        expect(() => validateEnv()).toThrow('PROCESS_EXIT_1');
    });

    it('throws when DATABASE_URL is invalid', () => {
        // Arrange
        process.env.DATABASE_URL = 'not-a-valid-url';
        process.env.JWT_SECRET = 'this_is_a_very_strong_secret_key_32_chars';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';

        // Act & Assert
        expect(() => validateEnv()).toThrow('PROCESS_EXIT_1');
    });

    it('throws when PORT is not a number', () => {
        // Arrange
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'this_is_a_very_strong_secret_key_32_chars';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';
        process.env.PORT = 'not_a_number';

        // Act & Assert
        expect(() => validateEnv()).toThrow('PROCESS_EXIT_1');
    });

    it('does not throw for weak JWT_SECRET if empty and not required in test', () => {
        // This test validates that empty optional secrets don't trigger weak checks
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'this_is_a_very_strong_secret_key_32_chars';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';
        delete process.env.OPENAI_API_KEY;

        // Act
        const config = validateEnv();

        // Assert
        expect(config).toBeDefined();
        expect(config.OPENAI_API_KEY).toBe('');
    });

    it('throws when REFRESH_SECRET is missing', () => {
        // Arrange
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/gemz';
        process.env.JWT_SECRET = 'this_is_a_very_strong_secret_key_32_chars';
        delete process.env.REFRESH_SECRET;
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';

        // Act & Assert
        expect(() => validateEnv()).toThrow('PROCESS_EXIT_1');
    });

    it('logs descriptive error messages on failure', () => {
        // Arrange
        delete process.env.DATABASE_URL;
        process.env.JWT_SECRET = 'this_is_a_very_strong_secret_key_32_chars';
        process.env.REFRESH_SECRET = 'this_is_another_very_strong_secret_key';
        process.env.SMTP_USER = 'smtp_user';
        process.env.SMTP_PASS = 'smtp_password';

        // Act
        try {
            validateEnv();
        } catch {
            // Expected
        }

        // Assert
        expect(console.error).toHaveBeenCalled();
    });
});
