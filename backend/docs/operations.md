# GitGuard AI - Enterprise Operations Guide

This guide covers the advanced enterprise features available in the GitGuard AI backend, specifically focusing on cost tracking, bug tracking integrations, and infrastructure monitoring.

## 1. Usage Analytics & Token Costs
GitGuard AI automatically tracks the exact number of tokens used during every code review. You can fetch a 30-day aggregated report to monitor your LLM expenditure.

- **Endpoint**: `GET /api/analytics/usage`
- **Output**: Returns a daily breakdown of prompt tokens, completion tokens, and a roughly estimated USD cost (based on a $0.50/1M token baseline).

## 2. Linear & Jira Bug Tracking
To keep your developers in flow, GitGuard AI can automatically create high-priority bug tickets in your issue tracker whenever it detects a `critical` severity issue or a security vulnerability.

Configure this via the `NotificationSettings` model:
- **Jira**: Provide `jiraUrl`, `jiraEmail`, `jiraApiToken`, and `jiraProjectKey`.
- **Linear**: Provide `linearApiKey` and `linearTeamId`.

## 3. Infrastructure Monitoring (Prometheus & Grafana)
The backend is fully instrumented with Prometheus.

- **Metrics Endpoint**: `/metrics`
- **Prometheus Service**: Accessible via Docker Compose on port `9090`.
- **Grafana Dashboards**: Accessible via Docker Compose on port `3005`.

### Key Custom Metrics:
- `gitguard_reviews_total`: Counter tracking the number of reviews processed, labeled by status (`completed` or `failed`) and repository name.
- `gitguard_review_latency_seconds`: Histogram tracking how long the LLM takes to process code blocks.
