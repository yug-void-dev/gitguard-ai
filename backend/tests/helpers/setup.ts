/**
 * @file tests/helpers/setup.ts
 * @description Jest test setup — sets test environment variables before
 * any module imports trigger env validation.
 */

// Must be set BEFORE importing any src modules that read env vars
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3002';
process.env['GITHUB_WEBHOOK_SECRET'] = 'test-webhook-secret-at-least-16-chars';
process.env['MONGODB_URI'] = 'mongodb://localhost:27017/gitguard-test';
process.env['ALLOWED_ORIGINS'] = 'http://localhost:3000';
process.env['LOG_LEVEL'] = 'silent'; // Suppress logs during tests
process.env['WEBHOOK_RATE_LIMIT_MAX'] = '30';
process.env['WEBHOOK_RATE_LIMIT_WINDOW_MS'] = '60000';
