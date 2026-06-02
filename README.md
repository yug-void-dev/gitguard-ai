# GitGuard AI

GitGuard AI is an autonomous pull request review platform. It listens to GitHub pull request webhooks, validates them securely, fetches and analyzes code diffs with LLM providers, stores review results, posts feedback back to GitHub, and exposes a React dashboard for repositories, reviews, history, and settings.

## Current Completion Status

Weeks 1, 2, and 3 from the project plan are implemented across the backend and connected frontend surfaces.

Verified locally:

- Backend TypeScript build: passed.
- Backend Jest suite: 19 test suites passed, 215 tests passed.
- Frontend production build: passed.

Notes:

- Live GitHub webhook delivery, LLM calls, GitHub comment posting, Redis queue execution, and MongoDB persistence require real environment variables and running services.
- The frontend build was repaired by removing duplicate settings state in `frontend/src/pages/SettingsPage.tsx` and replacing an unavailable `Slack` icon import in `frontend/src/components/settings/NotificationPreferences.tsx`.

## Project Structure

```text
gitguard-ai/
  backend/    Node.js, Express, TypeScript, MongoDB, Redis/BullMQ, Octokit, LLM pipeline
  frontend/   React, Vite, TypeScript, dashboard pages and API integration
  README.md   Root project overview
```

## Week 1: Webhook Listener and Foundation

Goal: create the secure foundation for receiving GitHub pull request events.

Backend implementation:

- Express application factory in `backend/src/app.ts`.
- GitHub webhook endpoint at `POST /api/webhooks/github`.
- Raw request body capture for exact HMAC verification.
- HMAC-SHA256 signature validation in `backend/src/github/signatureValidator.ts`.
- Pull request event parsing and validation in `backend/src/github/eventParser.ts`.
- Supported PR actions include `opened`, `synchronize`, and `reopened`.
- Rate limiting, request IDs, request logging, error handling, replay/security middleware, IP whitelist support, Helmet, and CORS.
- MongoDB connection and audit log foundation through `AuditLog`.
- GitHub OAuth backend routes under `/api/auth`.
- Dockerfile and Docker Compose setup for containerized local deployment.
- Jest unit and integration tests for webhook validation, middleware, event parsing, and audit behavior.

Frontend connection:

- GitHub login flow starts from the frontend using `/api/auth/github`.
- Auth context and protected routes guard dashboard pages.
- Frontend API client sends credentials to the backend REST API.

Outcome:

- A valid GitHub pull request webhook can be received, authenticated, parsed, audited, and queued for review.

## Week 2: Diff Analyzer and AI Intelligence

Goal: fetch pull request diffs, clean/chunk them, and generate structured AI review output.

Backend implementation:

- PR webhook processing builds rich PR context in `backend/src/ai/contextBuilder.ts`.
- Review jobs are queued with BullMQ in `backend/src/queue/reviewQueue.ts`.
- Worker pipeline in `backend/src/queue/reviewWorker.ts`.
- Diff fetching through Octokit or fallback HTTP diff URL fetching.
- Diff processing and chunking in `backend/src/github/diffProcessor.ts`.
- Multi-provider LLM routing in `backend/src/llm/llmRouter.ts`.
- Gemini and Groq provider support with fallback behavior.
- Prompt engineering in `backend/src/llm/prompts/codeReviewPrompt.ts`.
- Structured response parsing in `backend/src/llm/parsers/reviewParser.ts`.
- Prompt injection cleanup in `backend/src/ai/promptSanitizer.ts`.
- Retry behavior in `backend/src/ai/retryStrategy.ts`.
- Dependency vulnerability scanning in `backend/src/ai/vulnerabilityScanner.ts`.
- Suggestions and enrichment in `backend/src/ai/suggestionEnricher.ts`.
- Queue metrics are exposed under `/api/queue/metrics`.

Frontend connection:

- Dashboard and queue-related UI reads backend review/queue state.
- Review list and detail views consume `/api/reviews`.
- Side-by-side diff and finding components are present for displaying review output.

Outcome:

- A queued PR review can fetch/process a diff, send chunks to the selected LLM provider, parse structured findings, enrich them, and persist review results.

## Week 3: Comment Bot and Automation

Goal: close the feedback loop by turning AI findings into GitHub comments, suggestions, labels, rules, and audit records.

Backend implementation:

- Rich Markdown review formatting in `backend/src/utils/diffFormatter.ts`.
- GitHub PR review posting in `backend/src/services/commentService.ts`.
- Inline suggestion posting in `backend/src/services/suggestionService.ts`.
- PR label automation in `backend/src/services/labelService.ts`.
- Manual comment/suggestion/label routes under `/api/comments`.
- Rule profiles and per-repository filtering in `backend/src/services/ruleEngine.ts`.
- Rule profile CRUD routes under `/api/rules`.
- Connected repository management and webhook installation under `/api/repositories`.
- Code quality metrics in `backend/src/services/codeQualityService.ts`.
- CI/CD badge data route under `/api/comments/badge/:repositoryId`.
- Review status updates and WebSocket broadcasts for queued/completed/failed review events.
- Full audit logging support for webhook and review lifecycle events.

Frontend connection:

- Repositories page supports listing, connecting, disconnecting, activating, and configuring repositories.
- Reviews page and review detail page display findings, metadata, severity, comments, suggestions, and diffs.
- History page supports review history, filters, and CSV export.
- Settings page includes notification, security, API key, team, and basic preference controls.
- Frontend services call backend endpoints for reviews, repositories, comments, suggestions, queue metrics, history, notifications, and auth.

Outcome:

- Review results can be posted back to GitHub as Markdown reviews, inline suggestions can be applied, labels can be added, repository rules can filter findings, and the frontend can display the feedback loop.

## Backend API Summary

```text
GET    /health
POST   /api/webhooks/github
GET    /api/auth/github
GET    /api/auth/github/callback
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout
GET    /api/reviews
GET    /api/reviews/stats
GET    /api/reviews/:reviewId
GET    /api/repositories
POST   /api/repositories/connect
PATCH  /api/repositories/:id
PATCH  /api/repositories/:id/rules
DELETE /api/repositories/:id
GET    /api/github/repos
GET    /api/queue/metrics
GET    /api/rules/:repositoryId
POST   /api/rules/:repositoryId
PATCH  /api/rules/:repositoryId/:profileId
DELETE /api/rules/:repositoryId/:profileId
PATCH  /api/rules/:repositoryId/:profileId/activate
GET    /api/comments/badge/:repositoryId
GET    /api/comments
GET    /api/comments/review/:reviewId
POST   /api/comments/:reviewId/post
POST   /api/comments/:reviewId/suggest
POST   /api/comments/:reviewId/labels
POST   /api/comments/:commentId/apply
```

## Local Development

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Default ports:

- Backend: `http://localhost:3001`
- Frontend: Vite dev server default, usually `http://localhost:5173`

Set `VITE_API_BASE_URL` and `VITE_WS_URL` in the frontend environment to match the backend if needed.

## Verification Commands

```bash
cd backend
npm run build
npm test
```

```bash
cd frontend
npm run build
```

The latest local verification passed using the bundled Node runtime because the global `npm` command on this machine is missing its npm CLI file.
