# Auto Short SaaS

AI-powered video metadata generator for YouTube Shorts. Upload videos and get AI-generated descriptions and hashtags.

## Architecture

```
                    ┌─────────────┐
                    │   nginx     │ :80
                    │  (reverse   │
                    │   proxy)    │
                    └─────┬───────┘
                          │
              ┌───────────┴───────────┐
              │                       │
    ┌─────────▼─────────┐   ┌────────▼────────┐
    │   React Frontend  │   │  Express Backend│ :4000
    │   (SPA)           │   │  + SQLite       │
    └───────────────────┘   └────────┬────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   OpenAI API        │
                          └─────────────────────┘
```

- **Backend**: Express.js REST API with SQLite (better-sqlite3) for persistence
- **Frontend**: React SPA with Tailwind CSS
- **Proxy**: nginx serves frontend static files and proxies /api/ and /uploads/ to backend
- **AI**: OpenAI GPT generates descriptions and hashtags

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (optional)

### Local Development

```bash
# 1. Setup (copies .env.example → .env)
.\setup.ps1

# 2. Edit backend/.env and set your OpenAI API key
#    OPENAI_API_KEY=sk-...

# 3. Start both backend and frontend
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Health check: http://localhost:4000/api/health

### Docker Production

```bash
# Set OPENAI_API_KEY in backend/.env
docker compose up -d
```

### Docker Development

```bash
docker compose -f docker-compose.dev.yml up -d
```

## API

### Health Check

```
GET /api/health
→ { "status": "ok", "timestamp": "...", "uptime": 1234 }
```

### Upload Video

```
POST /api/upload
Content-Type: multipart/form-data

Fields:
  video: File (video/mp4, video/webm, video/ogg, video/quicktime, max 50MB)
  title: String (max 200 chars)

→ {
    "videoUrl": "/uploads/1234567890-123456789.mp4",
    "title": "...",
    "description": "...",
    "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
  }
```

### History

```
GET /api/history?limit=20&offset=0

→ {
    "data": [
      { "id": 1, "filename": "...", "title": "...", "description": "...", "tags": [...], "created_at": "..." }
    ],
    "total": 1,
    "limit": 20,
    "offset": 0
  }

GET /api/history/:id
→ { "id": 1, "filename": "...", "title": "...", ... }
```

### Video Files

```
GET /uploads/:filename
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Backend HTTP port |
| `OPENAI_API_KEY` | — | OpenAI API key (required) |
| `OPENAI_MODEL` | `gpt-3.5-turbo` | OpenAI model to use |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `DB_PATH` | `./data/shorts.db` | SQLite database path |
| `NODE_ENV` | `development` | Environment mode |

## Testing

```bash
# Backend tests
npm run test:backend

# Frontend tests
npm run test:frontend

# All tests
npm test
```

## Project Structure

```
.
├── backend/
│   ├── db/              # SQLite database layer
│   ├── middleware/       # Error handling, validation
│   ├── routes/           # Express route handlers
│   ├── services/         # AI service (OpenAI)
│   ├── tests/            # Jest test suite
│   ├── utils/            # Validators, file type detection
│   └── server.js         # Express app entry point
├── frontend/
│   └── frontend/
│       └── src/
│           ├── components/   # Reusable React components
│           └── App.js        # Main application
├── docker-compose.yml        # Production deployment
├── docker-compose.dev.yml    # Development deployment
├── Dockerfile.backend
├── Dockerfile.frontend
├── nginx.conf
└── setup.ps1
```

## Security

- File content validation via magic bytes (prevents MIME spoofing)
- Rate limiting (100 requests / 15 min per IP)
- Helmet security headers
- CORS restricted to configured origin
- Error responses sanitized (no internal details leaked in production)
- Uploaded files served with `X-Content-Type-Options: nosniff`
- Non-root container user in production Docker images

## License

MIT
