# GitGuard AI — Backend Core (Week 1)

> Autonomous Pull Request Review Platform — Enterprise-grade webhook infrastructure

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Testing Locally with ngrok](#testing-locally-with-ngrok)
- [Security Design](#security-design)
- [Docker Deployment](#docker-deployment)
- [Week 2+ Roadmap](#week-2-roadmap)

---

## Overview

GitGuard AI Backend is a production-grade Node.js + Express + TypeScript service that:

1. **Receives** GitHub pull request webhook events
2. **Validates** each request via HMAC-SHA256 signature verification
3. **Parses** and validates the event payload with Zod
4. **Processes** the event through a service layer (AI review queue in Week 2)
5. **Audits** every action to MongoDB for compliance and debugging
6. **Responds** to GitHub with structured JSON

---

## Architecture

```
GitHub → POST /api/webhooks/github
           │
           ▼
    ┌─────────────────┐
    │  rawBodyParser  │  Capture raw bytes before JSON parse (HMAC requires this)
    └────────┬────────┘
             │
    ┌────────▼────────┐
    │   requireBody   │  Reject empty payloads early
    └────────┬────────┘
             │
    ┌────────▼────────┐
    │  rateLimiter    │  30 req/min/IP via express-rate-limit
    └────────┬────────┘
             │
    ┌────────▼──────────────┐
    │  webhookController    │
    │  ├── validateSignature│  HMAC-SHA256 timing-safe comparison
    │  ├── checkEventType   │  Only process pull_request events
    │  ├── parsePayload     │  Zod validation → clean internal type
    │  ├── processEvent     │  Service layer (→ AI queue in Week 2)
    │  └── auditLog         │  MongoDB append-only audit trail
    └───────────────────────┘
             │
    ┌────────▼────────┐
    │ globalErrorHandler│  Centralized error → safe JSON response
    └─────────────────┘
```

### Key Design Decisions

| Decision                   | Rationale                                                         |
| -------------------------- | ----------------------------------------------------------------- |
| Raw body capture           | HMAC must hash exact bytes sent by GitHub, not re-serialized JSON |
| `crypto.timingSafeEqual`   | Prevents timing side-channel attacks on signature comparison      |
| 403 for signature failure  | Return minimal info; same error for missing vs invalid            |
| 200 for unsupported events | Prevents GitHub from retrying events we don't handle              |
| Zod validation             | Runtime type safety — GitHub can change payload format            |
| Append-only audit log      | Complete history for compliance, debugging, analytics             |

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts          # Zod-validated environment variables
│   │   └── database.ts     # MongoDB connection management
│   ├── controllers/
│   │   └── webhookController.ts  # Main webhook request handler
│   ├── routes/
│   │   ├── webhooks.ts     # POST /api/webhooks/github
│   │   └── health.ts       # GET /health
│   ├── middlewares/
│   │   ├── requestId.ts    # UUID correlation ID per request
│   │   ├── rawBody.ts      # Raw buffer capture for HMAC
│   │   ├── rateLimiter.ts  # express-rate-limit configuration
│   │   ├── requestLogger.ts# HTTP request/response logging
│   │   └── errorHandler.ts # Global error handler + 404
│   ├── services/
│   │   └── webhookService.ts  # Business logic (AI queue stub)
│   ├── github/
│   │   ├── signatureValidator.ts  # HMAC-SHA256 validation
│   │   └── eventParser.ts         # Payload parsing + Zod validation
│   ├── audit/
│   │   └── auditService.ts   # Audit log persistence
│   ├── models/
│   │   ├── AuditLog.ts       # Mongoose model (append-only)
│   │   ├── User.ts           # Stub (Week 2: GitHub OAuth)
│   │   └── Repository.ts     # Stub (Week 2: repo config)
│   ├── lib/
│   │   ├── logger.ts         # Pino structured logger
│   │   └── errors.ts         # Centralized error hierarchy
│   ├── types/
│   │   ├── github.ts         # GitHub webhook TypeScript types
│   │   └── express.d.ts      # Express Request augmentation
│   ├── app.ts                # Express app factory
│   └── server.ts             # Entry point + graceful shutdown
├── tests/
│   ├── helpers/
│   │   ├── setup.ts          # Test env variable setup
│   │   └── mockPayloads.ts   # Real GitHub webhook fixtures
│   ├── unit/
│   │   ├── signatureValidator.test.ts
│   │   └── eventParser.test.ts
│   └── integration/
│       └── webhook.test.ts
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── tsconfig.json
├── jest.config.js
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB 7+ (or Docker)
- npm

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
GITHUB_WEBHOOK_SECRET=<generate with: openssl rand -hex 32>
MONGODB_URI=mongodb://localhost:27017/gitguard
```

### 3. Start development server

```bash
npm run dev
```

The server starts at `http://localhost:3001`.

### 4. Verify health

```bash
curl http://localhost:3001/health
# {"status":"ok","timestamp":"...","services":{"database":"connected"}}
```

---

## Environment Variables

| Variable                       | Required | Default                 | Description                                                                           |
| ------------------------------ | -------- | ----------------------- | ------------------------------------------------------------------------------------- |
| `PORT`                         | No       | `3001`                  | HTTP server port                                                                      |
| `NODE_ENV`                     | No       | `development`           | `development` \| `staging` \| `production` \| `test`                                  |
| `GITHUB_WEBHOOK_SECRET`        | **Yes**  | —                       | Secret set in GitHub webhook settings. Min 16 chars. Generate: `openssl rand -hex 32` |
| `MONGODB_URI`                  | **Yes**  | —                       | Full MongoDB connection URI                                                           |
| `WEBHOOK_RATE_LIMIT_MAX`       | No       | `30`                    | Max webhook requests per window per IP                                                |
| `WEBHOOK_RATE_LIMIT_WINDOW_MS` | No       | `60000`                 | Rate limit window in milliseconds                                                     |
| `ALLOWED_ORIGINS`              | No       | `http://localhost:3000` | Comma-separated CORS origins                                                          |
| `LOG_LEVEL`                    | No       | `info`                  | `trace`\|`debug`\|`info`\|`warn`\|`error`\|`fatal`                                    |

---

## API Reference

### `POST /api/webhooks/github`

Receives and processes GitHub pull request webhook events.

**Required Headers:**

| Header                | Value                         |
| --------------------- | ----------------------------- |
| `Content-Type`        | `application/json`            |
| `X-Hub-Signature-256` | `sha256=<HMAC-SHA256 digest>` |
| `X-GitHub-Event`      | `pull_request`                |
| `X-GitHub-Delivery`   | Any UUID (GitHub sets this)   |

**Supported PR Actions:** `opened`, `synchronize`, `reopened`

**Response (200 OK — success):**

```json
{
  "success": true,
  "message": "Pull request #42 (opened) queued for review",
  "eventId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (403 Forbidden — invalid signature):**

```json
{
  "success": false,
  "message": "Invalid or missing webhook signature",
  "error": { "code": "WEBHOOK_SIGNATURE_INVALID" }
}
```

**Response (400 Bad Request — invalid payload):**

```json
{
  "success": false,
  "message": "Payload validation failed: ...",
  "error": { "code": "WEBHOOK_PAYLOAD_INVALID" }
}
```

**Response (429 Too Many Requests):**

```json
{
  "success": false,
  "message": "Too many webhook requests. Please slow down.",
  "error": { "code": "RATE_LIMIT_EXCEEDED" }
}
```

---

### `GET /health`

Liveness + readiness check.

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected"
  }
}
```

---

## Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
npx jest tests/unit/signatureValidator.test.ts
```

### Test Coverage

| Area                 | Tests                                                                           |
| -------------------- | ------------------------------------------------------------------------------- |
| Signature validation | Valid HMAC, wrong secret, tampered body, missing header, timing-safe comparison |
| Event parsing        | Supported actions, unsupported actions (null return), invalid payloads          |
| Integration          | Full webhook flow, rate limiting, 403/400/200 responses, health check, 404      |

---

## Testing Locally with ngrok

GitHub needs a public URL to send webhooks. Use [ngrok](https://ngrok.com/) in development:

### Option A: ngrok

```bash
# Install ngrok, then:
ngrok http 3001

# You'll get a URL like: https://abc123.ngrok.io
```

Then in your GitHub repository:

1. Go to **Settings → Webhooks → Add webhook**
2. **Payload URL:** `https://abc123.ngrok.io/api/webhooks/github`
3. **Content type:** `application/json`
4. **Secret:** Same as `GITHUB_WEBHOOK_SECRET` in your `.env`
5. **Events:** Select "Pull requests"

### Option B: GitHub CLI (gh)

```bash
# Forward webhooks to local server
gh webhook forward --events=pull_request --url=http://localhost:3001/api/webhooks/github
```

### Option C: Manual test with curl

```bash
# Generate a test signature
SECRET="your-webhook-secret"
BODY='{"action":"opened","number":1,"pull_request":{"id":1,"number":1,"state":"open","title":"Test PR","body":null,"html_url":"https://github.com/owner/repo/pull/1","diff_url":"https://github.com/owner/repo/pull/1.diff","draft":false,"additions":10,"deletions":2,"changed_files":3,"commits":1,"head":{"ref":"feature","sha":"abc123"},"base":{"ref":"main","sha":"def456"},"created_at":"2024-01-01T00:00:00Z","updated_at":"2024-01-01T00:00:00Z","user":{"login":"octocat","id":1,"avatar_url":"","html_url":"","type":"User"}},"repository":{"id":1,"name":"repo","full_name":"owner/repo","private":false,"html_url":"https://github.com/owner/repo","default_branch":"main","language":"TypeScript","owner":{"login":"owner","id":2,"avatar_url":"","html_url":"","type":"User"}},"sender":{"login":"octocat","id":1,"avatar_url":"","html_url":"","type":"User"}}'

SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/SHA2-256(stdin)= /sha256=/')

curl -X POST http://localhost:3001/api/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIG" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-GitHub-Delivery: test-$(date +%s)" \
  -d "$BODY"
```

---

## Security Design

### HMAC-SHA256 Signature Validation

```
GitHub computes:  sha256=HMAC-SHA256(GITHUB_WEBHOOK_SECRET, rawRequestBody)
We validate:      crypto.timingSafeEqual(received, expected)
```

**Why `timingSafeEqual`?**  
Regular string comparison (`===`) short-circuits on the first differing character. An attacker can measure response times to guess the signature byte by byte. `timingSafeEqual` always takes the same time regardless of where strings differ.

**Why raw body?**  
Parsing JSON and re-serializing it can change whitespace, key order, or Unicode normalization — producing a different hash. We capture the exact bytes received using Express's `verify` callback.

**Why 403 for both missing and invalid signatures?**  
To prevent enumeration: the attacker shouldn't know whether the header was missing vs. whether the signature was wrong.

### Input Sanitization

- Zod validates all payload fields before processing
- Pino automatically redacts `authorization`, `x-hub-signature-256`, `secret`, `token`, `password` from logs
- Error responses never include raw error messages in production
- Body size limited to 5MB to prevent payload-based DoS

### Audit Log

Every request writes to MongoDB `audit_logs` collection:

- `requestId` — unique ID for correlation
- `outcome` — `success` | `failure` | `ignored`
- `sourceIp` — requester IP
- `failureReason` — sanitized error description (never contains secrets)
- `createdAt` — timestamp

---

## Docker Deployment

### Development (with MongoDB UI)

```bash
# Copy and fill env vars
cp .env.example .env

# Start backend + MongoDB + Mongo Express UI
docker compose --profile dev up

# Backend: http://localhost:3001
# Mongo Express: http://localhost:8081
```

### Production

```bash
docker compose up -d

# View logs
docker compose logs -f backend

# Health check
curl http://localhost:3001/health
```

---
