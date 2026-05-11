/**
 * @file src/config/env.ts
 * @description Environment variable loader and validator.
 *
 * Validates all required env vars at startup so the app fails fast
 * with a clear error rather than silently misbehaving at runtime.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .default('3001')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val < 65536, {
      message: 'PORT must be a valid port number (1–65535)',
    }),

  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),

  GITHUB_WEBHOOK_SECRET: z
    .string()
    .min(16, 'GITHUB_WEBHOOK_SECRET must be at least 16 characters'),

  MONGODB_URI: z.string().url('MONGODB_URI must be a valid MongoDB URI'),

  WEBHOOK_RATE_LIMIT_MAX: z
    .string()
    .default('30')
    .transform((v) => parseInt(v, 10)),

  WEBHOOK_RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('60000')
    .transform((v) => parseInt(v, 10)),

  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GITHUB_CLIENT_SECRET is required'),
  GITHUB_CALLBACK_URL: z.string().url('GITHUB_CALLBACK_URL must be a valid URL'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // ── Redis (BullMQ queue) ──────────────────────────────────────────────
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z
    .string()
    .default('6379')
    .transform((v) => parseInt(v, 10))
    .refine((v) => !isNaN(v) && v > 0 && v < 65536, {
      message: 'REDIS_PORT must be a valid port number',
    }),
  /** Optional — leave empty for no-auth Redis (dev/local) */
  REDIS_PASSWORD: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    // process.stderr.write avoids no-console lint rule
    process.stderr.write('❌  Invalid environment configuration:\n\n');
    result.error.issues.forEach((issue) => {
      process.stderr.write(`  • ${issue.path.join('.')}: ${issue.message}\n`);
    });
    process.stderr.write('\nFix the issues above in your .env file and restart.\n\n');
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
