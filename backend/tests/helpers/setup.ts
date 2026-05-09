/**
 * @file tests/helpers/setup.ts
 * @description Jest test setup — sets ALL env vars before any module import triggers validation.
 */

process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3002';
process.env['GITHUB_WEBHOOK_SECRET'] = 'test-webhook-secret-at-least-16-chars';
process.env['MONGODB_URI'] = 'mongodb://localhost:27017/gitguard-test';
process.env['ALLOWED_ORIGINS'] = 'http://localhost:3000';
process.env['LOG_LEVEL'] = 'silent';
process.env['WEBHOOK_RATE_LIMIT_MAX'] = '30';
process.env['WEBHOOK_RATE_LIMIT_WINDOW_MS'] = '60000';
// GitHub OAuth (required by env schema)
process.env['GITHUB_CLIENT_ID'] = 'mock-client-id';
process.env['GITHUB_CLIENT_SECRET'] = 'mock-client-secret';
process.env['GITHUB_CALLBACK_URL'] = 'http://localhost:3001/api/auth/github/callback';
// JWT
process.env['JWT_SECRET'] = 'mock-jwt-secret-that-is-at-least-32-chars!!';
process.env['JWT_EXPIRES_IN'] = '7d';
