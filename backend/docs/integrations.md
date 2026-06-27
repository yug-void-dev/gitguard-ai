# GitGuard AI Webhook Integrations

GitGuard AI supports broadcasting review results directly into your team's communication channels.

## Supported Platforms
- **Slack**: Provide an Incoming Webhook URL.
- **Discord**: Provide a standard Channel Webhook URL.

## Configuration
Settings can be configured on a per-user basis via the frontend dashboard `Preferences` page.

Events:
- `reviewCompleted`: Fired when a PR review successfully finishes.
- `reviewFailed`: Fired when an internal error or queue failure prevents the review from completing.
