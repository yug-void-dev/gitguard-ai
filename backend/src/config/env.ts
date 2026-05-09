/**
 * @file src/config/env.ts
 * @description Environment variable loader and validator.
 *
 * Validates all required env vars at startup so the app fails fast
 * with a clear error rather than silently misbehaving at runtime.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file before validation
dotenv.config();

/** Zod schema for all environment variables */
const envSchema = z.object({
  // Server
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

  // GitHub Webhook — REQUIRED
  GITHUB_WEBHOOK_SECRET: z
    .string()
    .min(16, 'GITHUB_WEBHOOK_SECRET must be at least 16 characters'),

  // MongoDB — REQUIRED
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid MongoDB URI'),

  // Rate limiting
  WEBHOOK_RATE_LIMIT_MAX: z
    .string()
    .default('30')
    .transform((v) => parseInt(v, 10)),
  WEBHOOK_RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('60000')
    .transform((v) => parseInt(v, 10)),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  // GitHub OAuth
  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GITHUB_CLIENT_SECRET is required'),
  GITHUB_CALLBACK_URL: z.string().url('GITHUB_CALLBACK_URL must be a valid URL'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Security
  ENABLE_IP_WHITELIST: z
    .string()
    .default('false')
    .transform((v) => v.toLowerCase() === 'true'),
});

/** Parsed and validated environment variables */
export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and exits the process on failure.
 * Call this once at startup before anything else.
 */
function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌  Invalid environment configuration:\n');
    result.error.issues.forEach((issue) => {
      console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
    });
    console.error('\nFix the issues above in your .env file and restart.\n');
    process.exit(1);
  }

  return result.data;
}

/** Validated environment — safe to use anywhere after startup */
export const env = validateEnv();

/** Convenience helpers */
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
