/**
 * GEM Z — Centralized Configuration
 * 
 * All config values come from environment variables (validated on startup).
 * Never put secrets here — always use env vars.
 */

export const config = {
    // ─── Server ───────────────────────────────────
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 5000,
    isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
    isProduction: (process.env.NODE_ENV) === 'production',

    // ─── Database ─────────────────────────────────
    databaseUrl: process.env.DATABASE_URL!,
    databaseSsl: process.env.DATABASE_SSL === 'true',

    // ─── Auth ─────────────────────────────────────
    jwtSecret: process.env.JWT_SECRET!,
    refreshSecret: process.env.REFRESH_SECRET!,

    // ─── CORS ─────────────────────────────────────
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || 'http://localhost:5000',

    // ─── Email ────────────────────────────────────
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || 'Gem Z <noreply@gemz.app>',
    },

    // ─── OpenAI ───────────────────────────────────
    openaiApiKey: process.env.OPENAI_API_KEY,

    // ─── Redis ────────────────────────────────────
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

    // ─── Web Push ─────────────────────────────────
    vapid: {
        publicKey: process.env.VAPID_PUBLIC_KEY || '',
        privateKey: process.env.VAPID_PRIVATE_KEY || '',
        subject: process.env.VAPID_SUBJECT || '',
    },

    // ─── Sentry ───────────────────────────────────
    sentryDsn: process.env.SENTRY_DSN || '',

    // ─── Upload ───────────────────────────────────
    upload: {
        maxSize: 10 * 1024 * 1024, // 10MB
        path: process.env.UPLOAD_PATH || './public/uploads',
    },

    // ─── Pi Network ───────────────────────────────
    piApiKey: process.env.PI_API_KEY || '',
    piWalletSeed: process.env.PI_WALLET_SEED || '',

    // ─── Rate Limits ──────────────────────────────
    rateLimit: {
        general: { windowMs: 60 * 1000, max: 100 },
        login: { windowMs: 15 * 60 * 1000, max: 5 },
        register: { windowMs: 60 * 60 * 1000, max: 3 },
        passwordReset: { windowMs: 15 * 60 * 1000, max: 3 },
        walletWrite: { windowMs: 60 * 1000, max: 10 },
        withdrawal: { windowMs: 60 * 1000, max: 5 },
        upload: { windowMs: 60 * 60 * 1000, max: 20 },
    },
} as const;
