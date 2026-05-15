/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GEM Z API — Postman Collection Generator
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Generates a Postman v2.1 collection from the OpenAPI spec.
 * Run with: npx ts-node scripts/generate-postman.ts
 *
 * @module scripts/generate-postman
 */

import fs from 'fs';
import path from 'path';

// Import the OpenAPI spec from the docs module
import { openApiSpec } from '../src/docs/swagger';

// ─── Postman Collection Types ──────────────────────────────────

interface PostmanCollection {
    info: {
        _postman_id: string;
        name: string;
        description: string;
        schema: string;
    };
    item: PostmanFolder[];
    variable: PostmanVariable[];
    auth?: PostmanAuth;
}

interface PostmanFolder {
    name: string;
    description?: string;
    item: PostmanRequestItem[];
}

interface PostmanRequestItem {
    name: string;
    request: PostmanRequest;
    response: any[];
}

interface PostmanRequest {
    method: string;
    header: PostmanHeader[];
    url: PostmanUrl;
    description?: string;
    auth?: PostmanAuth;
    body?: PostmanBody;
}

interface PostmanHeader {
    key: string;
    value: string;
    type: string;
    description?: string;
}

interface PostmanUrl {
    raw: string;
    host: string[];
    path: string[];
    query?: PostmanQueryParam[];
    variable?: PostmanUrlVariable[];
}

interface PostmanQueryParam {
    key: string;
    value?: string;
    description?: string;
}

interface PostmanUrlVariable {
    key: string;
    value: string;
    description?: string;
}

interface PostmanAuth {
    type: string;
    bearer?: Array<{ key: string; value: string; type: string }>;
}

interface PostmanBody {
    mode: string;
    raw?: string;
    options?: { raw: { language: string } };
    formdata?: any[];
}

interface PostmanVariable {
    key: string;
    value: string;
    type: string;
    description?: string;
}

// ─── Helpers ───────────────────────────────────────────────────

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function generateExampleValue(schema: any): any {
    if (!schema) return '';

    if (schema.example !== undefined) return schema.example;

    switch (schema.type) {
        case 'string':
            if (schema.format === 'email') return 'user@example.com';
            if (schema.format === 'uuid') return generateUUID();
            if (schema.format === 'date') return '2024-01-15';
            if (schema.format === 'date-time') return '2024-01-15T10:30:00.000Z';
            if (schema.format === 'password') return 'StrongPass123!';
            if (schema.enum) return schema.enum[0];
            return schema.description || 'string_value';
        case 'integer':
            return schema.minimum || 1;
        case 'number':
            return schema.minimum || 10;
        case 'boolean':
            return schema.default !== undefined ? schema.default : true;
        case 'array':
            if (schema.items) {
                return [generateExampleValue(schema.items)];
            }
            return [];
        case 'object':
            if (schema.properties) {
                const obj: any = {};
                for (const [key, prop] of Object.entries(schema.properties)) {
                    obj[key] = generateExampleValue(prop);
                }
                return obj;
            }
            return {};
        default:
            if (schema.$ref) {
                return resolveRefExample(schema.$ref);
            }
            return '';
    }
}

function resolveRefExample(ref: string): any {
    // Simple ref resolution — in practice would traverse the full spec
    const refName = ref.split('/').pop() || '';
    const schemas: Record<string, any> = (openApiSpec as any).components?.schemas || {};
    const schema = schemas[refName];
    if (schema) {
        return generateExampleValue(schema);
    }
    return {};
}

function buildExampleBody(schema: any): string {
    const example = generateExampleValue(schema);
    return JSON.stringify(example, null, 2);
}

function pathToPostmanUrl(path: string, operation: any): PostmanUrl {
    // Convert OpenAPI path params {param} to Postman {{param}}
    const segments = path.split('/').filter(Boolean);
    const pathVars: PostmanUrlVariable[] = [];

    const convertedSegments = segments.map((segment) => {
        if (segment.startsWith('{') && segment.endsWith('}')) {
            const varName = segment.slice(1, -1);
            pathVars.push({
                key: varName,
                value: generateUUID().slice(0, 8),
                description: `Path parameter: ${varName}`,
            });
            return `:${varName}`;
        }
        return segment;
    });

    // Build query params from operation parameters
    const queryParams: PostmanQueryParam[] = [];
    if (operation.parameters) {
        for (const param of operation.parameters) {
            if (param.in === 'query') {
                const val = generateExampleValue(param.schema);
                queryParams.push({
                    key: param.name,
                    value: String(val),
                    description: param.description,
                });
            }
        }
    }

    const baseUrl = '{{baseUrl}}';
    const rawPath = convertedSegments.join('/');

    return {
        raw: `${baseUrl}/${rawPath}${queryParams.length > 0 ? '?' + queryParams.map(q => `${q.key}={{${q.key}}}`).join('&') : ''}`,
        host: ['{{baseUrl}}'],
        path: convertedSegments,
        ...(queryParams.length > 0 ? { query: queryParams } : {}),
        ...(pathVars.length > 0 ? { variable: pathVars } : {}),
    };
}

function buildHeaders(operation: any): PostmanHeader[] {
    const headers: PostmanHeader[] = [
        { key: 'Content-Type', value: 'application/json', type: 'text' },
        { key: 'Accept', value: 'application/json', type: 'text' },
    ];

    // Add security headers if needed
    const hasBearerAuth = operation.security?.some((s: any) => s.BearerAuth);
    if (hasBearerAuth) {
        headers.push({
            key: 'Authorization',
            value: 'Bearer {{accessToken}}',
            type: 'text',
            description: 'JWT access token',
        });
    }

    // Add idempotency key header
    if (operation.parameters?.some((p: any) => p.$ref?.includes('IdempotencyKey'))) {
        headers.push({
            key: 'Idempotency-Key',
            value: '{{$guid}}',
            type: 'text',
            description: 'Unique key for idempotent requests',
        });
    }

    // Add request ID header
    headers.push({
        key: 'X-Request-ID',
        value: '{{$guid}}',
        type: 'text',
        description: 'Request trace ID',
    });

    return headers;
}

function buildRequestBody(operation: any): PostmanBody | undefined {
    const requestBody = operation.requestBody;
    if (!requestBody) return undefined;

    const jsonContent = requestBody.content?.['application/json'];
    if (jsonContent?.schema) {
        return {
            mode: 'raw',
            raw: buildExampleBody(jsonContent.schema),
            options: { raw: { language: 'json' } },
        };
    }

    const formContent = requestBody.content?.['multipart/form-data'];
    if (formContent?.schema) {
        const formdata: any[] = [];
        const props = formContent.schema.properties || {};
        for (const [key, val] of Object.entries(props)) {
            const schemaVal = val as any;
            if (schemaVal.type === 'string' && schemaVal.format === 'binary') {
                formdata.push({
                    key,
                    type: 'file',
                    src: `/path/to/${key}`,
                });
            } else {
                formdata.push({
                    key,
                    value: generateExampleValue(schemaVal),
                    type: 'text',
                });
            }
        }
        return { mode: 'formdata', formdata };
    }

    return undefined;
}

// ─── Main Generation ───────────────────────────────────────────

function generatePostmanCollection(): PostmanCollection {
    const spec = openApiSpec as any;
    const paths = spec.paths || {};

    // Group endpoints by tag
    const folders: Record<string, PostmanFolder> = {};

    for (const [pathStr, pathItem] of Object.entries(paths)) {
        const operations = pathItem as Record<string, any>;

        for (const [method, operation] of Object.entries(operations)) {
            if (method === 'parameters') continue; // skip path-level parameters
            if (!operation) continue;

            const op = operation as any;
            const tags = op.tags || ['Uncategorized'];
            const tagName = tags[0]; // Use first tag as folder

            if (!folders[tagName]) {
                const tagInfo = spec.tags?.find((t: any) => t.name === tagName);
                folders[tagName] = {
                    name: tagName,
                    description: tagInfo?.description || `${tagName} endpoints`,
                    item: [],
                };
            }

            const requestItem: PostmanRequestItem = {
                name: op.summary || `${method.toUpperCase()} ${pathStr}`,
                request: {
                    method: method.toUpperCase(),
                    header: buildHeaders(op),
                    url: pathToPostmanUrl(pathStr, op),
                    description: op.description || op.summary,
                    body: buildRequestBody(op),
                },
                response: [],
            };

            folders[tagName].item.push(requestItem);
        }
    }

    // Sort folders alphabetically
    const sortedFolders = Object.values(folders).sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    // Build collection
    const collection: PostmanCollection = {
        info: {
            _postman_id: generateUUID(),
            name: spec.info?.title || 'GEM Z API',
            description: `${spec.info?.description || ''}\n\nBase URL: {{baseUrl}}\n\nGenerated from OpenAPI 3.0 spec`,
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: sortedFolders,
        variable: [
            {
                key: 'baseUrl',
                value: 'http://localhost:5000/api/v1',
                type: 'string',
                description: 'API base URL',
            },
            {
                key: 'accessToken',
                value: '',
                type: 'string',
                description: 'JWT access token (set after login)',
            },
        ],
        auth: {
            type: 'bearer',
            bearer: [
                { key: 'token', value: '{{accessToken}}', type: 'string' },
            ],
        },
    };

    return collection;
}

// ─── Script Entry Point ────────────────────────────────────────

function main() {
    console.log('Generating Postman collection from OpenAPI spec...');

    try {
        const collection = generatePostmanCollection();

        // Count endpoints
        let endpointCount = 0;
        for (const folder of collection.item) {
            endpointCount += folder.item.length;
        }

        // Write collection to file
        const outputDir = path.join(__dirname, '..', 'postman');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, 'gemz-api-collection.json');
        fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

        console.log(`\n✅ Postman collection generated successfully!`);
        console.log(`   📁 Output: ${outputPath}`);
        console.log(`   📊 Folders: ${collection.item.length}`);
        console.log(`   🔗 Endpoints: ${endpointCount}`);
        console.log(`\n📋 Collection folders:`);
        for (const folder of collection.item) {
            console.log(`   📂 ${folder.name} (${folder.item.length} endpoints)`);
        }

        // Also generate an environment file
        const environment = {
            id: generateUUID(),
            name: 'GEM Z API - Local',
            values: [
                {
                    key: 'baseUrl',
                    value: 'http://localhost:5000/api/v1',
                    enabled: true,
                },
                {
                    key: 'accessToken',
                    value: '',
                    enabled: true,
                },
            ],
        };

        const envPath = path.join(outputDir, 'gemz-api-environment.json');
        fs.writeFileSync(envPath, JSON.stringify(environment, null, 2));
        console.log(`\n📁 Environment file: ${envPath}`);

    } catch (error) {
        console.error('\n❌ Failed to generate Postman collection:', error);
        process.exit(1);
    }
}

main();
