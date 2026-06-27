<div align="center">

<h1>🛡️ GitGuard AI</h1>
<h3>Automated Pull Request Sentinel — Powered by AI</h3>

<p>
  <strong>An AI-driven code review platform that automatically analyzes every Pull Request for bugs, security vulnerabilities, and performance issues — and posts actionable, developer-friendly feedback directly to GitHub.</strong>
</p>

<p>
  <a href="https://gitguard-ai-one.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/🚀 Live Demo-gitguard--ai--one.vercel.app-6366f1?style=for-the-badge" alt="Live Demo" />
  </a>
</p>

<p>
  <img src="https://img.shields.io/badge/Status-Completed%20%26%20Deployed-22c55e?style=flat-square" />
  <img src="https://img.shields.io/badge/Platform-Vercel%20%2B%20Render-000000?style=flat-square&logo=vercel" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20%2F%20TypeScript-3178c6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/AI-Gemini%20%7C%20Groq%20%7C%20Anthropic-ff6600?style=flat-square" />
  <img src="https://img.shields.io/badge/Database-MongoDB-47a248?style=flat-square&logo=mongodb" />
  <img src="https://img.shields.io/badge/Queue-BullMQ%20%2B%20Redis-dc382d?style=flat-square&logo=redis" />
  <img src="https://img.shields.io/badge/Container-Docker-2496ed?style=flat-square&logo=docker" />
</p>

</div>

---

## 📋 Project Overview

**GitGuard AI** is an intelligent, production-grade Pull Request review platform built as an internship project for **Zaalima Development Pvt. Ltd.** The platform acts as a **24/7 senior engineer** watching every repository — the moment a developer opens a Pull Request, GitGuard AI:

1. Receives the event via a secure **GitHub Webhook**
2. Fetches the code **diff** using the GitHub API (Octokit)
3. Sends only the changed code to an **AI LLM** (Gemini / Groq / Anthropic) with a precision-engineered prompt
4. Receives a structured analysis covering **bugs**, **security vulnerabilities** (OWASP), and **performance issues**
5. Posts a rich **Markdown review comment** back to the PR on GitHub — with suggested fixes
6. Logs the full review in the **dashboard** for history, analytics, and management

> **Project Title:** Automated Pull Request Sentinel
> **Product Brand:** GitGuard AI
> **Client:** Zaalima Development Pvt. Ltd.

---

## 🌐 Live Deployment

| Service | URL |
|---|---|
| **Frontend (Vercel)** | [https://gitguard-ai-one.vercel.app/](https://gitguard-ai-one.vercel.app/) |
| **Backend API (Render)** | [https://gitguard-ai-l5w1.onrender.com](https://gitguard-ai-l5w1.onrender.com) |
| **API Health Check** | [https://gitguard-ai-l5w1.onrender.com/health](https://gitguard-ai-l5w1.onrender.com/health) |

---

## ✅ Project Completion Status

All four weeks of the implementation plan have been **fully delivered and deployed**.

| Week | Module | Status |
|------|--------|--------|
| Week 1 | Webhook Listener & Secure Foundation | ✅ Complete |
| Week 2 | Diff Analyzer & Multi-LLM AI Intelligence | ✅ Complete |
| Week 3 | Comment Bot & GitHub Automation | ✅ Complete |
| Week 4 | Dashboard, Analytics & Full Product Polish | ✅ Complete |

### Build & Test Verification

```
Backend TypeScript build  → ✅ 0 errors
Backend ESLint check      → ✅ 0 warnings
Backend Jest test suite   → ✅ 215 tests passed across 19 suites
Frontend production build → ✅ 0 errors
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GitGuard AI Platform                        │
│                                                                     │
│  ┌────────────────┐    Webhook Event    ┌────────────────────────┐  │
│  │                │ ─────────────────▶  │  Express Backend       │  │
│  │  GitHub.com    │                     │  (Node.js / TypeScript)│  │
│  │                │ ◀───────────────── │                        │  │
│  └────────────────┘   Review Comment    └──────────┬─────────────┘  │
│                                                    │                │
│               ┌────────────────────────────────────┤                │
│               │                                    │                │
│     ┌─────────▼──────┐              ┌──────────────▼─────────────┐ │
│     │   BullMQ Queue  │              │   Multi-LLM Router         │ │
│     │   (Redis)       │◀────────────▶│   Gemini / Groq / Claude   │ │
│     └─────────────────┘              └────────────────────────────┘ │
│               │                                                      │
│     ┌─────────▼──────┐  WebSocket   ┌────────────────────────────┐  │
│     │   MongoDB       │─────────────▶│   React Frontend (Vite)    │  │
│     │   (Reviews,     │              │   Vercel Deployment         │  │
│     │    Users, Rules)│              └────────────────────────────┘  │
│     └────────────────┘                                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
gitguard-ai/
├── backend/                    # Node.js / Express / TypeScript API
│   ├── src/
│   │   ├── ai/                 # LLM prompt templates & response parsers
│   │   ├── audit/              # Audit log service
│   │   ├── config/             # Environment config (Zod-validated)
│   │   ├── controllers/        # Route controllers (auth, review, webhook...)
│   │   ├── github/             # Octokit integration (diff fetch, comments)
│   │   ├── lib/                # Arctic OAuth, metrics, logger, errors
│   │   ├── llm/                # Multi-LLM router (Gemini, Groq, Anthropic)
│   │   ├── middlewares/        # HMAC validation, auth, rate-limit, CORS
│   │   ├── models/             # Mongoose schemas (User, Review, Repository)
│   │   ├── queue/              # BullMQ job definitions and processors
│   │   ├── routes/             # Express routers
│   │   ├── services/           # Business logic (review, mail, badge...)
│   │   ├── types/              # Shared TypeScript interfaces
│   │   ├── utils/              # Helpers (diff chunker, sanitizer...)
│   │   ├── app.ts              # Express application factory
│   │   ├── server.ts           # HTTP / WebSocket server bootstrap
│   │   └── websocket.ts        # Socket.io real-time event emitter
│   ├── tests/                  # Unit + integration test suites (Jest)
│   ├── Dockerfile              # Production Docker image
│   └── docker-compose.yml      # Local dev stack (app + mongo + redis)
│
├── frontend/                   # React / Vite / TypeScript SPA
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── auth/           # ProtectedRoute guard
│   │   │   ├── layout/         # Sidebar, Navbar, AppBackground
│   │   │   ├── dashboard/      # Stat cards, activity feed, charts
│   │   │   ├── reviews/        # Review card, diff viewer
│   │   │   ├── repositories/   # Repo list, connect modal
│   │   │   └── settings/       # AI provider, rule config panels
│   │   ├── constants/          # Routes, config, storage keys
│   │   ├── context/            # AuthContext, ToastContext, ThemeContext
│   │   ├── hooks/              # useAuth, useTheme, useToast
│   │   ├── layouts/            # RootLayout, AuthLayout, DashboardLayout
│   │   ├── pages/              # LoginPage, DashboardPage, ReviewsPage...
│   │   ├── router/             # React Router v7 configuration
│   │   ├── services/           # Axios API service layer
│   │   └── types/              # TypeScript types (User, Review, Repo...)
│   ├── vercel.json             # SPA rewrite rules for Vercel
│   └── vite.config.ts          # Vite build configuration
│
├── vercel.json                 # Root SPA rewrite rules
└── README.md                   # This file
```

---

## ⚙️ Core Features

### 🔐 Authentication & Security
- GitHub OAuth 2.0 login flow via Arctic library (PKCE + state validation)
- Email/password registration with bcrypt hashing
- JWT-based session management with localStorage persistence
- Forgot password / OTP-based reset via SMTP email
- HMAC-SHA256 webhook signature validation
- Rate limiting, replay attack prevention, request ID tracing
- IP whitelisting middleware (configurable)
- CORS, Helmet, and CSP security headers

### 🔗 GitHub Webhook Integration
- Secure `POST /api/webhooks/github` endpoint
- Parses `pull_request` events: `opened`, `synchronize`, `reopened`
- Asynchronous event processing via **BullMQ + Redis** job queue
- Configurable rate limits per repository
- Full audit log of every webhook event received

### 🧠 AI-Powered Diff Analysis
- **Multi-LLM Router**: dynamically routes to Gemini 1.5 Flash (primary), Groq Llama 3, or Anthropic Claude based on availability and cost
- Fetches only the raw **code diff** via Octokit (not the full codebase) for maximum LLM context efficiency
- Intelligent diff chunking for large PRs (configurable chunk size)
- OWASP-aligned security vulnerability detection
- Bug detection (logical errors, off-by-one, null safety)
- Performance and complexity analysis
- Severity scoring: `critical` / `high` / `medium` / `low` / `info`
- Confidence percentage per finding
- Automatic fix suggestion embedded in the review
- Prompt injection defense and retry logic with exponential backoff
- Self-hosted / custom LLM endpoint support

### 💬 GitHub Comment Bot
- Posts structured **Markdown review comments** to GitHub PRs via Octokit
- One-click **suggestion apply** (commits the fix directly to the branch)
- Auto-labelling: `security-issue`, `needs-review`, `bug-detected`, `approved`
- Rule Engine: per-repository config (Strict Mode, Security-Only, Ignore Style, custom patterns)
- CI/CD badge endpoint for embedding review status in repo READMEs

### 📊 Dashboard & Analytics
- Real-time PR activity feed via **WebSocket / Socket.io**
- Repository management with connect/disconnect and per-repo rule config
- Review detail page with full diff viewer and inline suggestion UI
- History page with search, filter (by severity, date, repository), and PDF export
- Usage analytics: token consumption, LLM cost tracking, bug trend charts
- Prometheus metrics endpoint (`GET /metrics`) for Grafana monitoring
- Team and organization support (Admin / Reviewer / Viewer roles)

---

## 🛠️ Technology Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js + TypeScript | Runtime and type safety |
| Express.js | HTTP server and routing |
| MongoDB + Mongoose | Primary database |
| BullMQ + Redis | Async job queue for PR processing |
| Octokit (GitHub SDK) | Webhook parsing, diff fetching, comment posting |
| Arctic | GitHub OAuth 2.0 (PKCE flow) |
| Gemini 1.5 Flash | Primary LLM provider |
| Groq (Llama 3) | Secondary LLM provider |
| Anthropic Claude | Tertiary LLM provider |
| JWT + bcrypt | Authentication |
| Zod | Environment variable validation |
| Pino | Structured logging |
| Prometheus client | Observability metrics |
| Nodemailer | OTP password reset emails |
| Docker + Compose | Containerization |
| Jest | Unit and integration testing |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI framework |
| Vite 8 | Build tool and dev server |
| React Router v7 | Client-side routing |
| Axios | HTTP client with interceptors |
| Framer Motion | Animations and transitions |
| Socket.io Client | Real-time WebSocket updates |
| Lucide React | Icon library |
| Tailwind CSS v4 | Utility-first styling |
| jsPDF | PDF export for review history |

### Infrastructure
| Service | Role |
|---|---|
| **Vercel** | Frontend hosting (SPA with rewrite rules) |
| **Render** | Backend API hosting (Docker container) |
| **MongoDB Atlas** | Cloud database |
| **Redis (Upstash / self-hosted)** | Job queue and caching |
| **GitHub Actions** | CI/CD pipeline |

---

## 📅 4-Week Implementation Plan

### Week 1 — Webhook Listener & Foundation
**Goal:** Build a secure, scalable foundation for receiving GitHub pull request events.

- Express server with `POST /api/webhooks/github` endpoint
- Strict HMAC-SHA256 signature validation against replay attacks
- `pull_request` event parsing (`opened`, `synchronize`, `reopened`)
- Rate limiting, IP whitelisting, request ID middleware
- MongoDB connection and audit log foundation
- GitHub OAuth backend flow (Arctic PKCE)
- Docker + Docker Compose setup for dev/prod environments
- Jest unit tests for webhook signature validation
- GitHub Actions CI/CD pipeline setup

**Deliverable:** Successful webhook log on test PR open. Dockerized app running locally.

---

### Week 2 — Diff Analyzer & AI Intelligence
**Goal:** Fetch code diffs and generate structured AI reviews using multiple LLM providers.

- Octokit integration to fetch raw PR diffs from GitHub API
- Diff preprocessing, cleaning, and intelligent chunking for large PRs
- **Multi-LLM Router**: Gemini 1.5 Flash → Groq Llama 3 → Custom fallback
- Advanced prompt engineering targeting:
  - OWASP security vulnerabilities
  - Logical bugs and edge cases
  - Performance bottlenecks
  - Code quality and complexity
- Structured JSON response parsing with severity + confidence scoring
- Automatic fix suggestion generation
- `package.json` dependency vulnerability cross-checks
- BullMQ + Redis queue for non-blocking concurrent PR processing
- Retry logic with exponential backoff + prompt injection defense

**Deliverable:** Structured AI analysis generated from real PR diff visible in logs.

---

### Week 3 — Comment Bot & Automation
**Goal:** Close the feedback loop by posting GitHub comments and enabling automation.

- Octokit comment posting with rich GitHub-flavoured Markdown
- One-click suggestion apply (commits fixes directly to the PR branch)
- Auto-labelling: `security-issue`, `needs-review`, `bug-detected`
- **Rule Engine**: per-repository configuration stored in MongoDB
  - Strict Mode, Security-Only, Ignore Style Issues
  - Custom ignore patterns and prompt template overrides
- Code quality metrics and complexity heuristics
- CI/CD badge generation endpoint (`/api/comments/badge/:repositoryId`)
- End-to-end test with deliberately buggy PRs
- Comprehensive audit logging for all review actions

**Deliverable:** Bot posts comprehensive Markdown review on a test PR with bug fix suggestion.

---

### Week 4 — Dashboard, Analytics & Full Product Polish
**Goal:** Deliver a complete, beautiful, and production-ready developer platform.

- GitHub OAuth login page with animated UI
- Repository management page (connect/disconnect, rule config per repo)
- Main Dashboard: overview stats, live PR feed via WebSocket, bug trend charts
- Review Detail page: full diff viewer with syntax highlighting, suggestion apply UI
- History page: search, filter by severity/date/repo, CSV/PDF export
- Settings page: AI provider config, notification preferences, team roles
- Usage analytics: token cost tracking, LLM routing stats
- Prometheus metrics for Grafana observability
- Real-time updates via Socket.io
- Dark mode, responsive layout, micro-animations
- Final deployment to Vercel (frontend) + Render (backend)
- Full documentation and README

**Deliverable:** Fully functional, deployed platform. End-to-end GitHub OAuth → PR review → Dashboard flow working.

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or Upstash)
- GitHub OAuth App (Client ID + Secret)
- At least one LLM API key (Gemini / Groq / Anthropic)

### 1. Clone the Repository
```bash
git clone https://github.com/yug-void-dev/gitguard-ai.git
cd gitguard-ai
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in .env with your credentials (see Environment Variables below)
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:3001/api
npm run dev
```

### 4. Docker (Full Stack)
```bash
# From root directory
docker-compose up --build
```

**Default ports:**
- Backend API: `http://localhost:3001`
- Frontend UI: `http://localhost:5173`

---

## 🔑 Environment Variables

### Backend (`.env`)
```env
# Server
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/gitguard-ai

# Redis / BullMQ
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# GitHub OAuth (from your GitHub OAuth App)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback
GITHUB_WEBHOOK_SECRET=your_webhook_secret_min_16_chars

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRES_IN=7d

# LLM API Keys
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
LLM_PRIMARY=gemini

# CORS
ALLOWED_ORIGINS=http://localhost:5173

# SMTP (for password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### Frontend (`.env`)
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
```

---

## 🧪 Running Tests

```bash
# Backend — full test suite
cd backend
npm run build     # TypeScript compilation check
npm run lint      # ESLint check
npm test          # Jest — 215 tests across 19 suites

# Frontend — production build check
cd frontend
npm run build
```

---

## 📡 API Reference

```
# Core
GET    /                              → Health check
GET    /health                        → Detailed health status
GET    /metrics                       → Prometheus metrics

# Authentication
GET    /api/auth/github               → Initiate GitHub OAuth
GET    /api/auth/github/callback      → OAuth callback
POST   /api/auth/register             → Email/password registration
POST   /api/auth/login                → Email/password login
GET    /api/auth/me                   → Get current user (protected)
POST   /api/auth/logout               → Logout
POST   /api/auth/forgot-password      → Request OTP
POST   /api/auth/verify-otp           → Verify OTP
POST   /api/auth/reset-password       → Reset password

# Webhooks
POST   /api/webhooks/github           → GitHub PR webhook receiver

# Reviews
GET    /api/reviews                   → List all reviews (protected)
GET    /api/reviews/:reviewId         → Review detail (protected)

# Repositories
GET    /api/repositories              → List connected repos
POST   /api/repositories/connect      → Connect a GitHub repo
DELETE /api/repositories/:id          → Disconnect a repo
GET    /api/github/repos              → List available GitHub repos

# Rules (per-repository config)
GET    /api/rules/:repositoryId       → Get repo rule config
PATCH  /api/repositories/:id/rules    → Update repo rules

# Comments & Suggestions
POST   /api/comments/:reviewId/post   → Post review comment to GitHub
POST   /api/comments/:commentId/apply → Apply one-click code suggestion
GET    /api/comments/badge/:repoId    → CI/CD badge endpoint

# Queue & Analytics
GET    /api/queue/metrics             → BullMQ queue stats
GET    /api/analytics/usage           → Token cost and usage analytics

# Notifications
GET    /api/notifications             → User notifications

# Teams
GET    /api/teams                     → Team members and roles
```

---

## 🔒 Security Architecture

| Layer | Mechanism |
|---|---|
| Webhook authenticity | HMAC-SHA256 signature + timestamp replay prevention |
| OAuth flow | Arctic PKCE (state + code_verifier cookies) |
| API auth | JWT Bearer tokens in Authorization header |
| Password storage | bcrypt with configurable salt rounds |
| Input validation | Zod schemas on all incoming request bodies |
| HTTP security headers | Helmet.js (CSP, HSTS, XSS protection) |
| Rate limiting | Per-IP and per-repo configurable windows |
| CORS | Strict origin whitelist from environment config |
| Prompt safety | Prompt injection detection before LLM dispatch |

---

## 📈 Observability

- **Prometheus metrics** at `GET /metrics` — queue latency, review success/failure rates, LLM response times
- **Pino structured logging** — JSON logs with request IDs for distributed tracing
- **Audit log** — every webhook event, review action, and auth event is logged to MongoDB
- **BullMQ dashboard** (via queue metrics endpoint) — active, waiting, completed, and failed job counts
- **LLM cost tracking** — per-review token consumption and aggregate usage analytics

---

## 👥 Team

| Role | Responsibilities |
|---|---|
| **Backend Core** | Webhook endpoint, HMAC validation, event parsing, rate limiting |
| **Security & DevOps** | Signature security, IP whitelisting, Docker setup, environment config, audit logging |
| **Auth & Database** | GitHub OAuth flow, MongoDB schema design, JWT management |
| **AI & LLM Integration** | Multi-LLM router, prompt engineering, diff analysis, severity scoring |
| **Frontend & Dashboard** | React UI, OAuth login, repository management, dashboard pages |
| **Testing & Reliability** | Jest suites, integration tests, error handling, deployment |

---

## 🏢 About

**Developed for:** Zaalima Development Pvt. Ltd.
**Project Type:** 4-Week Internship Capstone Project
**Category:** AI Tooling / Developer Productivity / GitHub Automation

> *"Intelligence is artificial. Competence is mandatory."* — Zaalima Development

---

<div align="center">
  <p>Built with ❤️ by the GitGuard AI team during the Zaalima Development internship program.</p>
  <p>
    <a href="https://gitguard-ai-one.vercel.app/">🚀 Live Demo</a> •
    <a href="https://github.com/yug-void-dev/gitguard-ai">📦 Repository</a>
  </p>
</div>
