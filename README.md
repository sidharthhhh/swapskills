# SwapSkills — Skill Exchange Platform

A peer-to-peer skill exchange platform where users can teach what they know and learn what they want. The platform matches users based on complementary skills, facilitates real-time chat, manages sessions, and tracks reputation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | Flutter / Dart |
| Backend API | Node.js, Express 5, TypeScript |
| Admin Dashboard | Next.js 14, React 18, TailwindCSS |
| Database | MySQL 8.0 |
| Cache / Pub-Sub | Redis 7 |
| Real-time | Socket.IO |
| Auth | JWT (RS256) with access/refresh tokens |
| Containerization | Docker, Docker Compose |

## Prerequisites

- Node.js 20+
- MySQL 8.0+
- Redis 7+
- Docker & Docker Compose (for production deployment)
- Flutter SDK (for mobile app development)

## Project Structure

```
swapskills/
├── backend/            # Express API server
├── admin-dashboard/    # Next.js admin panel
├── flutter-app/        # Flutter mobile application
├── docker-compose.yml  # Development (Redis only)
├── docker-compose.prod.yml  # Production (all services)
└── README.md
```

## Local Development Setup

### 1. Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your local MySQL credentials and set NODE_ENV=development

# Generate RSA keys for JWT
mkdir -p keys
node -e "const crypto=require('crypto');const{privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});require('fs').writeFileSync('./keys/private.pem',privateKey);require('fs').writeFileSync('./keys/public.pem',publicKey);"

# Start Redis (from project root)
docker compose up -d

# Run database migrations
npm run migrate:up

# Seed initial data (optional)
npm run seed

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000`.

### 2. Admin Dashboard

```bash
cd admin-dashboard

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local
# Edit .env.local — set BACKEND_API_URL=http://localhost:3000

# Start development server
npm run dev
```

The admin dashboard will be available at `http://localhost:3001`.

### 3. Flutter App

```bash
cd flutter-app
flutter pub get
flutter run
```

## Production Deployment with Docker Compose

### 1. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with production values:
#   - Strong DB_PASS and ADMIN_JWT_SECRET
#   - Correct CORS_ORIGINS
#   - Generate fresh RSA keys

# Admin Dashboard
cp admin-dashboard/.env.local.example admin-dashboard/.env.local
# Edit with production values:
#   - Strong NEXTAUTH_SECRET / AUTH_SECRET
#   - Set NEXTAUTH_URL to your admin domain
#   - Set BACKEND_API_URL=http://backend:3000 (Docker internal network)
```

### 2. Set Docker Compose Variables

Create a `.env` file at the project root for Docker Compose:

```env
REDIS_PASSWORD=your_strong_redis_password
DB_ROOT_PASSWORD=your_strong_root_password
DB_PASS=your_strong_db_password
```

### 3. Build and Start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Run Migrations

```bash
docker compose -f docker-compose.prod.yml exec backend npm run migrate:up
```

### 5. Verify

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","db":"connected","redis":"connected","timestamp":"..."}
```

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL user | — |
| `DB_PASS` | MySQL password | — |
| `DB_NAME` | Database name | `swapskills` |
| `DB_CONNECTION_LIMIT` | Connection pool size | `20` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `REDIS_PASSWORD` | Redis password | — |
| `JWT_PRIVATE_KEY` | Path to RSA private key | `./keys/private.pem` |
| `JWT_PUBLIC_KEY` | Path to RSA public key | `./keys/public.pem` |
| `JWT_ACCESS_TTL` | Access token TTL (seconds) | `900` |
| `JWT_REFRESH_TTL` | Refresh token TTL (seconds) | `604800` |
| `ADMIN_JWT_SECRET` | Admin panel JWT secret | — |
| `CORS_ORIGINS` | Comma-separated allowed origins | — |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `AUTH_RATE_LIMIT_MAX` | Max auth requests per window | `10` |
| `LOG_LEVEL` | Winston log level | `info` |

### Admin Dashboard (`admin-dashboard/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_SECRET` | NextAuth encryption secret (min 32 chars) |
| `AUTH_SECRET` | Auth.js secret (same as NEXTAUTH_SECRET) |
| `NEXTAUTH_URL` | Public URL of the admin dashboard |
| `BACKEND_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_APP_NAME` | Display name for the app |

## API Overview

Base URL: `/api`

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check (DB + Redis status) |
| `POST /api/auth/register` | User registration |
| `POST /api/auth/login` | User login |
| `POST /api/auth/refresh` | Refresh access token |
| `GET /api/v1/users/me` | Current user profile |
| `GET /api/v1/skills` | List skills |
| `GET /api/v1/matches` | Get skill matches |
| `POST /api/v1/sessions` | Create exchange session |
| `GET /api/v1/chat/conversations` | List conversations |
| `GET /api/v1/reputation/:userId` | User reputation |
| `GET /api/v1/notifications` | User notifications |
| `GET /api/v1/admin/*` | Admin endpoints (requires admin JWT) |

## Security Notes

- **JWT RS256**: Asymmetric signing — private key signs, public key verifies. Never expose the private key.
- **Rate Limiting**: Global (100 req/15min) and auth-specific (10 req/15min) limits backed by Redis.
- **Helmet**: Strict CSP, HSTS with preload, X-Frame-Options DENY.
- **CORS**: Whitelisted origins only in production.
- **HPP**: HTTP Parameter Pollution protection enabled.
- **Input Validation**: All inputs validated with Zod schemas.
- **SQL Injection**: Parameterized queries only (mysql2 prepared statements).
- **Body Size Limit**: 10KB max request body.
- **Password Hashing**: bcrypt with default cost factor.
- **Token Revocation**: Refresh tokens tracked in Redis for revocation support.
- **Environment Secrets**: Never commit `.env`, `.pem` keys, or `keys/` directory.

## License

ISC
