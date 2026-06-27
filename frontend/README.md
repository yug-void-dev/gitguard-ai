# GitGuard AI Frontend

React + Vite + TypeScript frontend for the GitGuard AI pull request review dashboard.

The frontend is connected to the backend Week 1-3 functionality through authenticated REST services and WebSocket-ready configuration. It provides the user-facing views for GitHub login, repositories, review history, review details, dashboard metrics, comments, suggestions, settings, notifications, and team/security preferences.

## Verification Status

Verified locally:

- Production build passed with `vite build`.

Fixes made during verification:

- Removed duplicate preference state/handler declarations in `src/pages/SettingsPage.tsx`.
- Replaced an unavailable `Slack` icon import with `MessageSquare` in `src/components/settings/NotificationPreferences.tsx`.

## Week 1 Frontend Functionality: Auth and Foundation

Backend Week 1 focuses on secure webhook infrastructure. The frontend supports that foundation through authentication and protected navigation.

Implemented:

- GitHub login button and OAuth redirect flow through `/api/auth/github`.
- Auth context and current-user loading through backend auth endpoints.
- Protected dashboard routes.
- Shared API client with credentials enabled.
- App shell, dashboard layout, sidebar, navbar, common components, theme context, toast context, and route constants.

Main files:

```text
src/services/api.ts
src/services/auth.service.ts
src/context/AuthContext.tsx
src/hooks/useAuth.ts
src/components/auth/GitHubLoginButton.tsx
src/components/auth/ProtectedRoute.tsx
src/router/index.tsx
src/layouts/DashboardLayout.tsx
```

## Week 2 Frontend Functionality: Review Visibility

Backend Week 2 creates queued AI review results. The frontend exposes those results in dashboard and review pages.

Implemented:

- Dashboard page for review activity, metrics, charts, repository health, and live review feed.
- Review list page connected to `/api/reviews`.
- Review stats connected to `/api/reviews/stats`.
- Review detail page connected to `/api/reviews/:reviewId`.
- Diff viewer and side-by-side diff components for displaying analyzed changes.
- Severity tags, finding cards, review summaries, metadata, and suggestion panels.
- Queue metrics service connected to `/api/queue/metrics`.
- WebSocket hook/service foundation for live review updates.

Main files:

```text
src/pages/DashboardPage.tsx
src/pages/ReviewsPage.tsx
src/pages/ReviewDetailPage.tsx
src/services/review.service.ts
src/services/queue.service.ts
src/services/socketService.ts
src/hooks/useReviews.ts
src/hooks/useDashboardMetrics.ts
src/hooks/useWebSocket.ts
src/components/dashboard/
src/components/reviews/
```

## Week 3 Frontend Functionality: Feedback Loop and Automation

Backend Week 3 posts GitHub comments, suggestions, labels, repository rules, and audit-backed review history. The frontend provides the screens and service calls for those workflows.

Implemented:

- Repository list and connection UI.
- Repository activation/deactivation and disconnect actions.
- Repository rule configuration UI.
- Rule builder, rules list, and repository selector components.
- Comment lookup for a review through `/api/comments/review/:reviewId`.
- Apply-suggestion API call through `/api/comments/:commentId/apply`.
- Review detail components for comments, suggestions, severity, and findings.
- History page with search/filter support through `/api/reviews`.
- CSV export for review history.
- Settings page with notification, API key, security, team, and preference sections.
- Notification settings UI for email, Slack-style webhook, and Discord webhook configuration.

Main files:

```text
src/pages/RepositoriesPage.tsx
src/pages/HistoryPage.tsx
src/pages/SettingsPage.tsx
src/services/repository.service.ts
src/services/history.service.ts
src/services/notification.service.ts
src/services/review.service.ts
src/components/repositories/
src/components/history/
src/components/settings/
src/components/reviews/CommentThread.tsx
src/components/reviews/SuggestionPanel.tsx
```

## Routes

```text
/                 Login
/dashboard        Overview dashboard
/repositories     Connected repositories and rule configuration
/reviews          Review list
/history          Review history
/history/:id      Review detail
/settings         Workspace settings
*                 Not found
```

## Backend Integration

The shared Axios client is defined in `src/services/api.ts`.

Default configuration:

```ts
VITE_API_BASE_URL || "http://localhost:5000/api"
VITE_WS_URL || "http://localhost:5000"
```

For the backend default port in this repo, use:

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
```

Core service connections:

```text
auth.service.ts          -> /api/auth
repository.service.ts    -> /api/github/repos and /api/repositories
review.service.ts        -> /api/reviews and /api/comments
history.service.ts       -> /api/reviews with filters
queue.service.ts         -> /api/queue/metrics
notification.service.ts  -> /api/notifications
```

## Local Development

```bash
cd frontend
npm install
npm run dev
```

Build:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Notes for Full End-to-End Testing

To test the full product flow from the frontend:

1. Start MongoDB and Redis.
2. Start the backend with valid GitHub, JWT, webhook, and LLM environment variables.
3. Set frontend `VITE_API_BASE_URL` and `VITE_WS_URL` to the backend URL.
4. Log in with GitHub.
5. Connect a repository.
6. Configure the GitHub webhook or let the backend install it when credentials allow.
7. Open or synchronize a pull request.
8. Watch the dashboard/reviews/history pages for queued and completed review updates.
