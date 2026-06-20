# Self-Hosted LLM Integration

GitGuard AI supports routing code review payloads to self-hosted, private LLMs via an OpenAI-compatible API format. This is ideal for enterprise environments with strict code privacy requirements.

## Supported Providers
Any LLM provider exposing an OpenAI-compatible chat completions endpoint is supported, including:
- **Ollama** (`http://localhost:11434/api/chat`)
- **vLLM**
- **LocalAI**

## Configuration
This can be configured per-repository via the `RepositoryRule` profile. 

When creating or updating a Rule Profile via `PATCH /api/rules/:repositoryId/:profileId`, pass the following fields in the `spec`:

```json
{
  "aiProvider": "custom",
  "customLlmEndpoint": "http://localhost:11434/api/chat",
  "customLlmModel": "llama3:8b"
}
```

- `aiProvider`: Must be set to `"custom"`.
- `customLlmEndpoint`: The absolute URL to your custom model's chat endpoint.
- `customLlmModel`: The specific model tag to load.

## Fallback Behavior
When `aiProvider` is set to `custom`, the standard size-based fallback routing to Groq or Gemini is **bypassed**. This ensures your proprietary code is never unintentionally sent to a public API when your local server is down. If the custom LLM fails, the review will safely fail and generate a webhook alert.
