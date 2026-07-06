# Auto Shorts SaaS

AI-powered YouTube Shorts metadata generator. Upload videos and get AI-generated descriptions and hashtags.

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
    │   (SPA)           │   │  + PostgreSQL   │
    └───────────────────┘   └────────┬────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   OpenAI API        │
                          └─────────────────────┘

                          ┌──────────────────────┐
                          │   Stripe Payments    │
                          └──────────────────────┘
```

- **Backend**: Express.js REST API with PostgreSQL (via knex)
- **Frontend**: React SPA with Tailwind CSS + React Router
- **Auth**: Email/password with JWT (bcrypt)
- **Payments**: Stripe subscriptions (Free / Pro / Enterprise)
- **Database**: PostgreSQL 16 with knex migrations
- **Proxy**: nginx serves frontend and proxies /api/ + /uploads/ to backend
- **AI**: OpenAI GPT generates descriptions and hashtags

## Subscription Tiers

| Tier | Price | Monthly Generations | Features |
|------|-------|-------------------|----------|
| Free | $0 | 5 | AI descriptions & hashtags |
| Pro | $9.99 | 100 | Priority processing, email support |
| Enterprise | $49.99 | Unlimited | API access, dedicated support |

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16
- OpenAI API key
- Stripe account (for payments)

### Local Development

```bash
# 1. Setup environment
cp backend/.env.example backend/.env
# Edit backend/.env with your keys

# 2. Create PostgreSQL databases
createdb auto_shorts_saas
createdb auto_shorts_saas_test

# 3. Install dependencies
npm run install:all

# 4. Run database migrations and seed
npm run migrate --prefix backend
npm run seed --prefix backend

# 5. Start both backend and frontend
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Health check: http://localhost:4000/api/health

### Docker Production

```bash
# Set required env vars in backend/.env
# Then:
docker compose up -d
```

### Docker Development

```bash
docker compose -f docker-compose.dev.yml up -d
```

## API

### Authentication

```
POST /api/auth/register
  Body: { email, password, name }
  → { token, user: { id, email, name, tier } }

POST /api/auth/login
  Body: { email, password }
  → { token, user: { id, email, name, tier } }

GET /api/auth/me
  Headers: Authorization: Bearer <token>
  → { user: { id, email, name, tier, subscription_status, ... } }
```

### Health Check

```
GET /api/health
→ { status, timestamp, uptime, totalUploads, diskUsage }
```

### Upload Video (requires auth)

```
POST /api/upload
  Headers: Authorization: Bearer <token>
  Content-Type: multipart/form-data
  Fields:
    video: File (max 50MB, MP4/WebM/OGG/MOV)
    title: String (max 200 chars)
→ { videoUrl, title, description, tags }
```

### History (requires auth)

```
GET /api/history?limit=20&offset=0
  Headers: Authorization: Bearer <token>
→ { data: [...], total, limit, offset }
```

### Subscriptions

```
GET /api/subscriptions/plans
  → { plans: [{ id, name, priceCents, features, ... }] }

GET /api/subscriptions/current (requires auth)
  Headers: Authorization: Bearer <token>
  → { tier, status, usage: { used, limit, remaining }, plan }

POST /api/stripe/create-checkout-session (requires auth)
  Headers: Authorization: Bearer <token>
  Body: { tier: "pro" | "enterprise" }
  → { url, sessionId }

POST /api/stripe/create-portal-session (requires auth)
  Headers: Authorization: Bearer <token>
  → { url }

POST /api/stripe/webhook
  (Stripe webhook events: subscription updates, payments)
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Backend HTTP port |
| `NODE_ENV` | `development` | Environment mode |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/auto_shorts_saas` | PostgreSQL connection |
| `OPENAI_API_KEY` | — | OpenAI API key (required) |
| `OPENAI_MODEL` | `gpt-3.5-turbo` | OpenAI model |
| `JWT_SECRET` | — | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiry |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `STRIPE_SECRET_KEY` | — | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook signing secret |
| `STRIPE_PRICE_PRO` | — | Stripe price ID for Pro plan |
| `STRIPE_PRICE_ENTERPRISE` | — | Stripe price ID for Enterprise plan |

## Testing

```bash
# Backend tests (requires PostgreSQL test database)
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
│   ├── db/              # Database: knex config, migrations, seeds
│   ├── middleware/       # Auth, usage limits, error handling
│   ├── routes/           # API routes (auth, upload, history, subscriptions, stripe)
│   ├── services/         # AI service (OpenAI)
│   ├── tests/            # Jest test suites
│   ├── utils/            # Validators, config, tokens, logger
│   └── server.js         # Express app entry point
├── frontend/
│   └── frontend/
│       └── src/
│           ├── components/   # Navbar, ProtectedRoute, ErrorBoundary
│           ├── context/      # AuthContext (JWT management)
│           ├── pages/        # Login, Register, Dashboard, Pricing
│           └── App.js        # Main app with routing
├── docker-compose.yml        # Production deployment
├── docker-compose.dev.yml    # Development deployment
├── Dockerfile.backend
├── Dockerfile.frontend
├── nginx.conf
└── setup.ps1
```

## Security

- JWT-based authentication
- Password hashing with bcrypt (12 rounds)
- File content validation via magic bytes
- Rate limiting (100 requests / 15 min per IP)
- Helmet security headers (CSP, nosniff, etc.)
- CORS restricted to configured origin
- Stripe webhook signature verification
- PostgreSQL parameterized queries (SQL injection safe)
- Non-root container user in production Docker
