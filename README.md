# Smart Personal Inventory & Cabinet Management System

## Deployment

### Docker
1. Ensure Docker and Docker Compose are installed.
2. Set `JWT_SECRET` in environment or `.env` file (see below).
3. Run `docker-compose up -d`.
4. Access the app at `http://localhost:3000`.

### Environment Variables

**Required:**
- `JWT_SECRET`: Secret key for JWT signing. **Must be set** — server will refuse to start without it.

**Optional:**
- `AI_API_KEY`: API key for AI features (Gemini, Doubao, Qwen, etc.)
- `MODEL_TYPE`: AI provider — `gemini`, `doubao`, `qwen`, `ernie`, `minimax`, `gemma` (default: `gemini`)
- `AI_MODEL_NAME`: Model name (default: `gemini-1.5-flash`)
- `AI_ENDPOINT`: Custom endpoint for `gemma` or other custom providers
- `PORT`: Server port (default: `3000`)
- `DATABASE_URL`: Path to SQLite database (default: `./data/inventory.db`)

### Kubernetes (K3s)

Health check endpoints:
- `GET /health` — liveness probe (returns `{ "status": "ok" }`)
- `GET /ready` — readiness probe (checks DB connectivity)

### Local Development

```bash
JWT_SECRET=your-secret-key npm run dev
```

## Security Features

- JWT authentication with 7-day expiry
- Rate limiting on auth endpoints (10 attempts / 15 minutes)
- Secure cookies (`httpOnly`, `sameSite: strict`)
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`)
