# GitGuard AI Backend

Backend service for GitGuard AI, built with Node.js, Express, TypeScript, MongoDB, Redis/BullMQ, Octokit, and pluggable LLM providers.

The backend now covers the Week 1, Week 2, and Week 3 project scope: secure webhook ingestion, diff analysis, AI review generation, repository rules, GitHub comments, inline suggestions, labels, audit logging, queue metrics, and dashboard APIs.

## Verification Status

Verified locally:

- `tsc` build passed.
- Jest passed: 19 test suites, 215 tests.

Runtime dependencies required for the full live flow:

- MongoDB
- Redis
- GitHub OAuth app credentials
- GitHub webhook secret
- At least one LLM API key, such as Gemini or Groq
- GitHub user/repository access token for private repositories and comment posting

## Week 1: Webhook Listener and Foundation

Goal: receive GitHub pull request events safely and prepare the platform foundation.

Implemented:

- `POST /api/webhooks/github` route.
- Raw JSON body capture before parsing so HMAC checks use the exact bytes GitHub sent.
- HMAC-SHA256 validation with timing-safe comparison.
- Pull request payload parsing through Zod-backed event parsing.
- Support for `opened`, `synchronize`, and `reopened` pull request actions.
- Graceful ignore behavior for unsupported events/actions so GitHub does not retry unnecessarily.
- Rate limiting, request IDs, request logging, Helmet, CORS, centralized errors, and body size protection.
- Replay/security middleware and IP whitelist middleware are present.
- MongoDB connection layer and append-style audit log model.
- GitHub OAuth routes and user model foundation.
- Docker and Docker Compose files.
- Unit/integration tests for signature validation, event parsing, middleware, audit service, and webhook behavior.

Main files:

```text
src/app.ts
src/routes/webhooks.ts
src/controllers/webhookController.ts
src/github/signatureValidator.ts
src/github/eventParser.ts
src/services/webhookService.ts
src/audit/auditService.ts
src/models/AuditLog.ts
```

## Week 2: Diff Analyzer and AI Intelligence

Goal: fetch, clean, chunk, and analyze pull request diffs with AI.

Implemented:

- PR context building from webhook payload data.
- BullMQ review queue and Redis-backed worker.
- Pending review persistence before async processing.
- Diff fetching through authenticated Octokit when a token is available.
- Fallback diff fetching through the PR diff URL.
- Diff processing, file extraction, metadata cleanup, and chunking.
- Multi-LLM routing with Gemini and Groq support.
- Provider fallback and retry behavior.
- Structured code review prompt with severity, confidence, category, and suggested fix expectations.
- Structured response parsing and merge logic across chunks.
- Prompt injection sanitization.
- Dependency vulnerability scanning for package changes.
- Finding enrichment with tests/refactoring suggestions.
- Queue metrics for frontend monitoring.

Main files:

```text
src/queue/reviewQueue.ts
src/queue/reviewWorker.ts
src/queue/queueMetrics.ts
src/github/octokitClient.ts
src/github/diffProcessor.ts
src/ai/contextBuilder.ts
src/ai/promptSanitizer.ts
src/ai/retryStrategy.ts
src/ai/suggestionEnricher.ts
src/ai/vulnerabilityScanner.ts
src/llm/llmRouter.ts
src/llm/providers/geminiProvider.ts
src/llm/providers/groqProvider.ts
src/llm/prompts/codeReviewPrompt.ts
src/llm/parsers/reviewParser.ts
```

## Week 3: Comment Bot and Automation

Goal: post actionable review feedback to GitHub and automate repository-level behavior.

Implemented:

- Rich Markdown PR review formatting.
- GitHub PR review comment posting through Octokit.
- Existing bot comment cleanup to reduce PR noise.
- Inline suggestion comment generation for actionable findings.
- Apply-suggestion route for committing selected suggestions.
- Automatic PR labels based on finding severity/category.
- Repository rule profiles with strict/security-only/ignore-style/custom-pattern style filtering support.
- Active rule profile selection and cache invalidation.
- Code quality metrics and score persistence.
- CI/CD badge data route for repository quality badges.
- Review result persistence with findings, metrics, summary, and capped diff data.
- WebSocket broadcasts for queued, completed, and failed review events.
- Manual retry/post/suggestion/label routes for authenticated users.

Main files:

```text
src/services/commentService.ts
src/services/suggestionService.ts
src/services/labelService.ts
src/services/ruleEngine.ts
src/services/codeQualityService.ts
src/services/cicdBadgeService.ts
src/controllers/commentController.ts
src/controllers/ruleController.ts
src/controllers/reviewController.ts
src/controllers/repositoryController.ts
src/models/GitHubComment.ts
src/models/RepositoryRule.ts
src/models/Review.ts
src/websocket.ts
```

## Request Flow

```text
GitHub PR webhook
  -> raw body parser
  -> rate/security middleware
  -> HMAC signature validation
  -> pull_request event parser
  -> audit log
  -> pending Review document
  -> BullMQ review-pr job
  -> worker fetches diff
  -> diff processor chunks diff
  -> LLM router analyzes chunks
  -> findings are enriched and scanned
  -> repository rules filter findings
  -> metrics are computed
  -> Review document is completed
  -> WebSocket event is broadcast
  -> GitHub review comment, inline suggestions, and labels are posted when token is available
```

## API Reference

Health:

```text
GET /health
```

Webhook:

```text
POST /api/webhooks/github
```

Required GitHub webhook headers:

```text
Content-Type: application/json
X-Hub-Signature-256: sha256=<digest>
X-GitHub-Event: pull_request
X-GitHub-Delivery: <delivery-id>
```

Auth:

```text
GET  /api/auth/github
GET  /api/auth/github/callback
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/verify-otp
POST /api/auth/reset-password
```

Reviews:

```text
GET /api/reviews
GET /api/reviews/stats
GET /api/reviews/:reviewId
```

Repositories and GitHub:

```text
GET    /api/github/repos
GET    /api/repositories
POST   /api/repositories/connect
PATCH  /api/repositories/:id
PATCH  /api/repositories/:id/rules
DELETE /api/repositories/:id
```

Rules:

```text
GET    /api/rules/:repositoryId
POST   /api/rules/:repositoryId
PATCH  /api/rules/:repositoryId/:profileId
DELETE /api/rules/:repositoryId/:profileId
PATCH  /api/rules/:repositoryId/:profileId/activate
```

Comments, suggestions, labels, and badge:

```text
GET  /api/comments/badge/:repositoryId
GET  /api/comments
GET  /api/comments/review/:reviewId
GET  /api/comments/:repositoryId
POST /api/comments/:commentId/apply
POST /api/comments/:reviewId/post
POST /api/comments/:reviewId/suggest
POST /api/comments/:reviewId/labels
```

Queue:

```text
GET /api/queue/metrics
```

## Environment Variables

Required:

```env
PORT=3001
NODE_ENV=development
GITHUB_WEBHOOK_SECRET=replace-with-at-least-16-chars
GITHUB_CLIENT_ID=github-oauth-client-id
GITHUB_CLIENT_SECRET=github-oauth-client-secret
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback
MONGODB_URI=mongodb://localhost:27017/gitguard
JWT_SECRET=replace-with-at-least-32-chars
ALLOWED_ORIGINS=http://localhost:5173
```

Redis and queue:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

LLM providers:

```env
GEMINI_API_KEY=
GROQ_API_KEY=
LLM_PRIMARY=gemini
LLM_MAX_TOKENS=8192
DIFF_MAX_CHUNK_BYTES=102400
```

Optional mail configuration:

```env
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=GitGuard AI <noreply@gitguard-ai.local>
```

## Local Development

```bash
cd backend
npm install
npm run dev
```

Build:

```bash
npm run build
```

Test:

```bash
npm test
```

Coverage:

```bash
npm run test:coverage
```

## Docker

```bash
cd backend
docker compose up --build
```

Use Docker Compose when you want the backend and supporting services to start together. Use a real public webhook URL, such as ngrok, when testing GitHub webhooks from an actual repository.

## Testing a GitHub Webhook Locally

1. Start MongoDB and Redis.
2. Start the backend.
3. Expose the backend using ngrok or another tunnel.
4. Configure a GitHub repository webhook:
   - Payload URL: `<public-url>/api/webhooks/github`
   - Content type: `application/json`
   - Secret: same value as `GITHUB_WEBHOOK_SECRET`
   - Events: pull requests
5. Open or synchronize a pull request.

Expected behavior:

- Backend validates the signature.
- Audit log is written.
- Pending review is created.
- Review job is queued.
- Worker analyzes the diff.
- Review is completed and broadcast.
- GitHub comment/labels are posted if a valid token is available.
