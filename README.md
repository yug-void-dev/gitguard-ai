# GitGuard AI

GitGuard AI is an autonomous, full-stack pull request review platform. It acts as a 24/7 senior engineer on every PR—listening to GitHub webhooks, validating them securely, fetching and analyzing code diffs with multiple LLM providers (Gemini, Groq, Claude, Custom), storing review results, and posting actionable feedback directly back to GitHub. The platform features a rich Next.js dashboard for repository management, live review tracking, rule configuration, and analytics.

## Current Completion Status

The entire project (Weeks 1 through 4) is fully implemented across the backend and frontend surfaces.

**Verified locally:**
- Backend TypeScript build: passed with 0 errors.
- Backend ESLint check: passed with 0 warnings.
- Backend Jest suite: 19 test suites passed, 215 tests passed.
- Frontend production build: passed.

## Project Structure

```text
gitguard-ai/
  backend/    Node.js, Express, TypeScript, MongoDB, Redis/BullMQ, Octokit, Prometheus
  frontend/   React, Vite, Next.js UI conventions, Tailwind, dashboard pages
  README.md   Root project overview
```

## Week 1: Webhook Listener and Foundation

**Goal:** Create a secure, scalable foundation for receiving GitHub pull request events.

- **Backend:**
  - Express application factory with a secure GitHub webhook endpoint (`POST /api/webhooks/github`).
  - Strict HMAC-SHA256 signature validation.
  - Pull request event parsing (opened, synchronize, reopened).
  - Rate limiting, request IDs, request logging, replay/security middleware, and IP whitelisting.
  - MongoDB connection and audit logging foundation.
  - GitHub OAuth integration (`/api/auth`).
  - Docker Compose setup for containerized deployment.

## Week 2: Diff Analyzer and AI Intelligence

**Goal:** Fetch pull request diffs, clean/chunk them, and generate structured AI review output using multiple LLMs.

- **Backend:**
  - Asynchronous review jobs queued with BullMQ and Redis.
  - Octokit diff fetching with intelligent preprocessing, chunking, and sanitization.
  - **Multi-LLM Router:** Dynamic routing between Gemini 1.5 Flash, Groq Llama 3, and Custom/Self-Hosted LLM endpoints based on cost and availability.
  - Prompt engineering focused on OWASP security vulnerabilities, logical bugs, and performance.
  - Structured JSON response parsing, prompt injection defense, and retry logic.
  - Vulnerability scanning via `package.json` cross-checks.

## Week 3: Comment Bot and Automation

**Goal:** Close the feedback loop by automatically posting Markdown comments and applying GitHub automation.

- **Backend:**
  - Octokit comment posting for rich Markdown reviews and inline code suggestions.
  - One-click suggestion apply support.
  - Auto-labeling PRs (e.g., `security-issue`, `needs-review`).
  - **Rule Engine:** Per-repository strict mode, custom ignore patterns, and prompt templates.
  - Code quality metrics and complexity heuristics.
  - Comprehensive review history logging in MongoDB.

## Week 4: Dashboard, Analytics & Enterprise Integrations

**Goal:** Deliver a complete, beautiful, and insightful developer platform with enterprise-grade features.

- **Frontend & UX:**
  - Landing page with GitHub OAuth login and repository selection.
  - Main Dashboard showing live PR activity, bug trends, and repository health scores.
  - Review Detail page with side-by-side diff viewers and syntax highlighting.
  - Team and organization support with role-based access.
  - Dark/light mode and responsive design.
- **Enterprise Backend Integrations:**
  - **Notifications & Ticketing:** Automatic Jira and Linear issue creation for Critical severity bugs.
  - Slack and Discord webhook alerts for completed reviews.
  - **Usage Analytics:** Token cost tracking and LLM cost analytics aggregation pipelines.
  - **Observability:** Prometheus metrics endpoint (`/metrics`) and Grafana monitoring for queue latency and success rates.
  - CI/CD badge generation endpoint (`/api/comments/badge/:repositoryId`).
  - WebSocket support for real-time frontend updates.

## API Summary

```text
# Core
GET    /health
GET    /metrics                      (Prometheus)

# Webhooks & Auth
POST   /api/webhooks/github
GET    /api/auth/github
GET    /api/auth/github/callback

# Reviews & Queue
GET    /api/reviews
GET    /api/reviews/:reviewId
GET    /api/queue/metrics
GET    /api/analytics/usage          (Token Cost Tracking)

# Repositories & Rules
GET    /api/repositories
POST   /api/repositories/connect
PATCH  /api/repositories/:id/rules
GET    /api/rules/:repositoryId

# GitHub Actions
GET    /api/comments/badge/:repositoryId
POST   /api/comments/:reviewId/post
POST   /api/comments/:commentId/apply
```

## Local Development

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

**Default ports:**
- Backend API: `http://localhost:3001`
- Frontend UI: `http://localhost:5173`

*(Ensure `.env` files are populated with GitHub App, MongoDB, Redis, and LLM API keys.)*

## Verification Commands
```bash
cd backend
npm run build
npm run lint
npm test
```
```bash
cd frontend
npm run build
```
