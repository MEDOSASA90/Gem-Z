/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GEM Z API — Swagger/OpenAPI 3.0 Configuration
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Serves interactive API docs at /api-docs via swagger-ui-express.
 * Loads modular YAML schema and path definitions for clean organization.
 *
 * @module docs/swagger
 */

import swaggerUi from 'swagger-ui-express';
import { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import YAML from 'yamljs';

// ─── Resolve absolute path to docs folder ─────────────────────
const DOCS_DIR = path.join(__dirname);

/**
 * Recursively collect all `.yaml` files under a directory.
 */
function collectYamlFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...collectYamlFiles(fullPath));
        } else if (entry.isFile() && fullPath.endsWith('.yaml')) {
            results.push(fullPath);
        }
    }

    return results;
}

/**
 * Load all YAML schema and path files into the OpenAPI spec.
 */
function buildSpec() {
    // ─── Base OpenAPI 3.0 specification ───────────────────────
    const spec: any = {
        openapi: '3.0.3',

        info: {
            title: 'GEM Z API',
            description: `
**GEM Z** is a comprehensive fitness & wellness platform backend serving trainees, trainers, gym admins, and store admins.

## Key Features
- **Authentication**: JWT-based auth with refresh tokens, email verification, password reset
- **Wallet**: Ledger-based financial system with top-up, withdrawal, P2P transfers, payments
- **Gym Management**: Daily passes, turnstile integration, smart lockers, crowd tracking
- **AI-Powered**: Workout plan generation, form analysis, food scanning, body composition analysis
- **Social**: Feed, workout buddy matching, squads, challenges
- **Store**: E-commerce for fitness products, marketplace, NFT minting
- **Trainer Tools**: Client management, revenue tracking, plan assignment
- **Coins & Gamification**: Earn, stake, and redeem fitness coins

## Authentication
Most endpoints require a **Bearer token** in the \`Authorization\` header:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

## Rate Limiting
API endpoints are rate-limited per user/IP. Check response headers:
- \`X-RateLimit-Limit\` — Maximum requests allowed
- \`X-RateLimit-Remaining\` — Remaining requests in window
- \`Retry-After\` — Seconds until retry (when limited)

## Idempotency
Write operations (payments, transfers) support idempotency via the \`Idempotency-Key\` header.

## Pagination
List endpoints use cursor/page-based pagination with \`page\` and \`limit\` query params.
      `,
            version: '1.0.0',
            contact: {
                name: 'GEM Z Engineering',
                email: 'api@gemz.fit',
                url: 'https://gemz.fit',
            },
            license: {
                name: 'Proprietary',
                url: 'https://gemz.fit/terms',
            },
        },

        servers: [
            {
                url: 'http://localhost:5000/api/v1',
                description: 'Local development',
            },
            {
                url: 'https://staging-api.gemz.fit/api/v1',
                description: 'Staging environment',
            },
            {
                url: 'https://api.gemz.fit/api/v1',
                description: 'Production environment',
            },
        ],

        tags: [
            { name: 'Auth', description: 'Authentication & authorization (login, register, tokens, password reset)' },
            { name: 'User', description: 'User profile management, KYC, password changes' },
            { name: 'Wallet', description: 'Financial wallet — balance, top-up, withdrawal, transfers, payments, reconciliation' },
            { name: 'Gym', description: 'Gym operations — passes, turnstile, lockers, crowd tracking, equipment' },
            { name: 'Trainer', description: 'Trainer dashboard — clients, revenue, plans, churn prediction' },
            { name: 'Store', description: 'E-commerce — products, checkout, marketplace, NFTs' },
            { name: 'AI', description: 'AI-powered features — workout plans, form analysis, food scanner, body scan' },
            { name: 'Social', description: 'Social features — feed, posts, workout buddy matching' },
            { name: 'Trainee', description: 'Trainee dashboard, progress tracking' },
            { name: 'Coins', description: 'Fitness coin system — earn, redeem, stake' },
            { name: 'Challenges', description: 'Fitness challenges — join, track, leaderboards' },
            { name: 'Squads', description: 'Fitness squads (teams) — create, join, compete' },
            { name: 'Bidding', description: 'Trainer bidding system' },
            { name: 'Recipes', description: 'Recipe discovery, grocery lists, live cook-alongs' },
            { name: 'Admin', description: 'Admin operations — user management, withdrawals, reconciliation' },
            { name: 'Health', description: 'Health checks and system status' },
            { name: 'Upload', description: 'File upload endpoints' },
            { name: 'Chat', description: 'Real-time messaging' },
        ],

        // ─── Security Schemes ─────────────────────────────────
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT access token obtained from /auth/login or /auth/refresh',
                },
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-Key',
                    description: 'API key for service-to-service or turnstile communication',
                },
                RefreshTokenCookie: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'refreshToken',
                    description: 'HTTP-only cookie containing the refresh token',
                },
            },

            // ─── Schemas will be loaded from YAML files ─────────
            schemas: {},

            // ─── Reusable responses ──────────────────────────────
            responses: {
                BadRequest: {
                    description: 'Bad Request — validation failed',
                    headers: {
                        'X-Request-ID': { schema: { type: 'string' }, description: 'Unique request trace ID' },
                        'X-RateLimit-Limit': { schema: { type: 'integer' }, description: 'Rate limit ceiling' },
                        'X-RateLimit-Remaining': { schema: { type: 'integer' }, description: 'Remaining requests in window' },
                    },
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: {
                                success: false,
                                message: 'Validation failed: email is required',
                                code: 'VALIDATION_ERROR',
                                requestId: 'req_abc123',
                            },
                        },
                    },
                },
                Unauthorized: {
                    description: 'Unauthorized — missing or invalid token',
                    headers: {
                        'X-Request-ID': { schema: { type: 'string' } },
                        'X-RateLimit-Limit': { schema: { type: 'integer' } },
                        'X-RateLimit-Remaining': { schema: { type: 'integer' } },
                        'WWW-Authenticate': { schema: { type: 'string' }, description: 'Bearer realm="GEM Z API"' },
                    },
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: {
                                success: false,
                                message: 'Access token required',
                                code: 'UNAUTHORIZED',
                                requestId: 'req_def456',
                            },
                        },
                    },
                },
                Forbidden: {
                    description: 'Forbidden — insufficient permissions',
                    headers: {
                        'X-Request-ID': { schema: { type: 'string' } },
                    },
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: {
                                success: false,
                                message: 'Insufficient permissions for this resource',
                                code: 'FORBIDDEN',
                                requestId: 'req_ghi789',
                            },
                        },
                    },
                },
                NotFound: {
                    description: 'Resource not found',
                    headers: {
                        'X-Request-ID': { schema: { type: 'string' } },
                    },
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: {
                                success: false,
                                message: 'Resource not found',
                                code: 'NOT_FOUND',
                                requestId: 'req_jkl012',
                            },
                        },
                    },
                },
                Conflict: {
                    description: 'Conflict — resource already exists',
                    headers: {
                        'X-Request-ID': { schema: { type: 'string' } },
                    },
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: {
                                success: false,
                                message: 'Email already in use',
                                code: 'CONFLICT',
                                requestId: 'req_mno345',
                            },
                        },
                    },
                },
                TooManyRequests: {
                    description: 'Too Many Requests — rate limit exceeded',
                    headers: {
                        'X-Request-ID': { schema: { type: 'string' } },
                        'Retry-After': { schema: { type: 'integer' }, description: 'Seconds until retry is allowed' },
                        'X-RateLimit-Limit': { schema: { type: 'integer' } },
                        'X-RateLimit-Remaining': { schema: { type: 'integer', example: 0 } },
                        'X-RateLimit-Reset': { schema: { type: 'integer', description: 'Unix timestamp when limit resets' } },
                    },
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: {
                                success: false,
                                message: 'Too many requests, please try again later',
                                code: 'RATE_LIMIT_EXCEEDED',
                                requestId: 'req_pqr678',
                            },
                        },
                    },
                },
                InternalServerError: {
                    description: 'Internal Server Error',
                    headers: {
                        'X-Request-ID': { schema: { type: 'string' } },
                    },
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: {
                                success: false,
                                message: 'Internal server error',
                                code: 'INTERNAL_ERROR',
                                requestId: 'req_stu901',
                            },
                        },
                    },
                },
            },

            // ─── Reusable parameters ─────────────────────────────
            parameters: {
                PageParam: {
                    name: 'page',
                    in: 'query',
                    description: 'Page number (1-based)',
                    schema: { type: 'integer', minimum: 1, default: 1 },
                },
                LimitParam: {
                    name: 'limit',
                    in: 'query',
                    description: 'Items per page (max 100)',
                    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                },
                IdempotencyKeyHeader: {
                    name: 'Idempotency-Key',
                    in: 'header',
                    description: 'Unique key for idempotent request handling (UUID recommended)',
                    required: false,
                    schema: { type: 'string', format: 'uuid' },
                },
                RequestIdHeader: {
                    name: 'X-Request-ID',
                    in: 'header',
                    description: 'Client-generated trace ID for request tracking',
                    required: false,
                    schema: { type: 'string' },
                },
            },
        },

        paths: {},
    };

    // ─── Load all YAML files ──────────────────────────────────
    const yamlFiles = collectYamlFiles(DOCS_DIR);

    for (const filePath of yamlFiles) {
        const parsed = YAML.load(filePath);

        // Merge schemas
        if (parsed.schemas) {
            Object.assign(spec.components.schemas, parsed.schemas);
        }

        // Merge paths
        if (parsed.paths) {
            for (const [pathKey, pathValue] of Object.entries(parsed.paths)) {
                if (!spec.paths[pathKey]) {
                    spec.paths[pathKey] = {};
                }
                Object.assign(spec.paths[pathKey], pathValue);
            }
        }
    }

    return spec;
}

/**
 * Generate the OpenAPI spec object (can be used for Postman, etc.)
 */
export const openApiSpec = buildSpec();

/**
 * Mount Swagger UI at /api-docs on the Express app.
 */
export function setupSwagger(app: Express): void {
    // ─── Custom CSS for GEM Z branding ────────────────────────
    const customCss = `
        .topbar { display: none; }
        .swagger-ui .info { margin: 30px 0; }
        .swagger-ui .info .title { color: #22c55e; font-weight: 700; }
        .swagger-ui .scheme-container { background: #f8fafc; }
    `;

    const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
        customCss,
        customSiteTitle: 'GEM Z API Docs',
        swaggerOptions: {
            persistAuthorization: true,
            docExpansion: 'list',
            filter: true,
            tryItOutEnabled: true,
            displayRequestDuration: true,
            defaultModelsExpandDepth: 2,
        },
    };

    // ─── Serve Swagger UI ─────────────────────────────────────
    app.use(
        '/api-docs',
        swaggerUi.serve,
        swaggerUi.setup(openApiSpec, swaggerUiOptions)
    );

    // ─── Also serve raw spec as JSON ──────────────────────────
    app.get('/api-docs.json', (_req: Request, res: Response) => {
        res.setHeader('Content-Type', 'application/json');
        res.json(openApiSpec);
    });

    console.log('[Swagger] API docs available at /api-docs');
    console.log('[Swagger] Raw spec available at /api-docs.json');
}
