/**
 * GEM Z — Environment Variable Validation
 * 
 * On startup, validates ALL required env vars are present.
 * Throws descriptive error if any are missing.
 * 
 * Benefits:
 * - Fails fast on startup (not at runtime)
 * - Clear error messages
 * - Single source of truth for env var names
 * - Prevents 'undefined' bugs in production
 */

interface EnvVar {
    name: string;
    required: boolean;
    type: 'string' | 'number' | 'boolean' | 'url';
    default?: string | number | boolean;
}

const REQUIRED_VARS: EnvVar[] = [
    // ─── Database ─────────────────────────────────
    { name: 'DATABASE_URL', required: true, type: 'url' },

    // ─── Auth Secrets ─────────────────────────────
    { name: 'JWT_SECRET', required: true, type: 'string' },
    { name: 'REFRESH_SECRET', required: true, type: 'string' },

    // ─── Server ───────────────────────────────────
    { name: 'NODE_ENV', required: false, type: 'string', default: 'development' },
    { name: 'PORT', required: false, type: 'number', default: 5000 },

    // ─── CORS ─────────────────────────────────────
    { name: 'CLIENT_URL', required: false, type: 'url', default: 'http://localhost:3000' },
    { name: 'API_URL', required: false, type: 'url', default: 'http://localhost:5000' },

    // ─── Email ────────────────────────────────────
    { name: 'SMTP_HOST', required: false, type: 'string', default: 'smtp.gmail.com' },
    { name: 'SMTP_PORT', required: false, type: 'number', default: 587 },
    { name: 'SMTP_SECURE', required: false, type: 'boolean', default: false },
    { name: 'SMTP_USER', required: true, type: 'string' },
    { name: 'SMTP_PASS', required: true, type: 'string' },
    { name: 'SMTP_FROM', required: false, type: 'string', default: 'Gem Z <noreply@gemz.app>' },

    // ─── OpenAI ───────────────────────────────────
    { name: 'OPENAI_API_KEY', required: false, type: 'string' },

    // ─── Redis ────────────────────────────────────
    { name: 'REDIS_URL', required: false, type: 'url', default: 'redis://localhost:6379' },

    // ─── Web Push ─────────────────────────────────
    { name: 'VAPID_PUBLIC_KEY', required: false, type: 'string' },
    { name: 'VAPID_PRIVATE_KEY', required: false, type: 'string' },
    { name: 'VAPID_SUBJECT', required: false, type: 'string' },
];

/**
 * Validates environment variables against schema.
 * Call this ONCE on app startup (before anything else).
 */
export function validateEnv(): Record<string, string | number | boolean> {
    const errors: string[] = [];
    const config: Record<string, string | number | boolean> = {};

    for (const envVar of REQUIRED_VARS) {
        const value = process.env[envVar.name];

        if (envVar.required && !value) {
            errors.push(`[${envVar.name}] is REQUIRED but not set`);
            continue;
        }

        // Use default if not set
        if (!value && envVar.default !== undefined) {
            config[envVar.name] = envVar.default;
            continue;
        }

        if (!value && !envVar.required) {
            config[envVar.name] = '';
            continue;
        }

        // Type validation
        switch (envVar.type) {
            case 'number': {
                const num = Number(value);
                if (isNaN(num)) {
                    errors.push(`[${envVar.name}] must be a number, got: "${value}"`);
                } else {
                    config[envVar.name] = num;
                }
                break;
            }
            case 'boolean': {
                config[envVar.name] = value === 'true' || value === '1' || value === 'yes';
                break;
            }
            case 'url': {
                try {
                    new URL(value!);
                    config[envVar.name] = value!;
                } catch {
                    errors.push(`[${envVar.name}] must be a valid URL, got: "${value}"`);
                }
                break;
            }
            default: {
                config[envVar.name] = value!;
            }
        }
    }

    // ─── Security Validation ──────────────────────

    if (config['JWT_SECRET']) {
        const secret = String(config['JWT_SECRET']);
        if (secret.length < 32) {
            errors.push(`[JWT_SECRET] is too weak! Must be at least 32 characters (got ${secret.length})`);
        }
        if (['dev_secret', 'change_me', 'test', 'default'].some(w => secret.toLowerCase().includes(w))) {
            errors.push(`[JWT_SECRET] appears to be a weak/default value! Generate a strong secret.`);
        }
    }

    if (config['REFRESH_SECRET']) {
        const secret = String(config['REFRESH_SECRET']);
        if (secret.length < 32) {
            errors.push(`[REFRESH_SECRET] is too weak! Must be at least 32 characters (got ${secret.length})`);
        }
    }

    if (errors.length > 0) {
        console.error('\n❌ [Config] Environment Validation FAILED:\n');
        errors.forEach(e => console.error(`   - ${e}`));
        console.error('\n⚠️  Run: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
        console.error('   Then set the values in your .env file\n');
        process.exit(1);
    }

    console.log('✅ [Config] All environment variables validated successfully');
    return config;
}
