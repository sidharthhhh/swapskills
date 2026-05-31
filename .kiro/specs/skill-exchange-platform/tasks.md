# Implementation Plan: Skill Exchange Platform

## Overview

A three-application skill exchange platform built in order: Backend (Node.js/Express/MySQL/Redis/Socket.IO) → Admin Dashboard (Next.js 14) → Flutter Mobile App. The backend uses raw SQL migrations with db-migrate, modular architecture (routes/controller/service/model/schema per module), RS256 JWT auth, and a trust score reputation system. No ORM — all database access uses parameterized SQL via mysql2.

## Tasks

- [x] 1. Backend project setup and infrastructure
  - [x] 1.1 Initialize Node.js project and install dependencies
    - Create `/backend` directory with `package.json`
    - Install: express, helmet, cors, hpp, express-rate-limit, rate-limit-redis, mysql2, ioredis, socket.io, jsonwebtoken, bcrypt, zod, uuid, winston, dotenv, db-migrate, db-migrate-mysql
    - Create `.env.example` with all required environment variables
    - Create `src/app.js` with middleware pipeline (Helmet → CORS → HPP → Rate Limiter → Body Parser → Routes → Error Handler)
    - Create `src/server.js` entry point with HTTP server and Socket.IO initialization
    - _Requirements: 13.1, 13.2, 13.4, 4.5_

  - [x] 1.2 Set up database connection and Redis client
    - Create `src/config/database.js` with mysql2 connection pool (parameterized queries only)
    - Create `src/config/redis.js` with ioredis client setup
    - Create `src/config/logger.js` with Winston structured logging (error, warn, info, debug levels, file transports)
    - _Requirements: 21.3, 22.1, 23.1, 23.2, 23.5_

  - [x] 1.3 Create database migrations with db-migrate
    - Initialize db-migrate configuration (`database.json`)
    - Create migration: `users` table
    - Create migration: `recovery_keys` table
    - Create migration: `refresh_tokens` table
    - Create migration: `skills` table with seed data
    - Create migration: `user_teach_skills` and `user_learn_skills` tables
    - Create migration: `match_requests` table
    - Create migration: `matches` table
    - Create migration: `skill_endorsements` table
    - Create migration: `sessions` and `session_notes` tables
    - Create migration: `chat_rooms` and `messages` tables
    - Create migration: `communities`, `posts`, `comments`, `post_votes` tables
    - Create migration: `reports` and `blocks` tables
    - Create migration: `reputation_events` table
    - Create migration: `notifications` table
    - Create migration: `admin_users` and `audit_log` tables
    - _Requirements: 21.1, 21.2, 21.4_

  - [x] 1.4 Create shared middleware and utilities
    - Create `src/middlewares/errorHandler.js` — generic error responses, no internal details exposed
    - Create `src/middlewares/validate.js` — Zod schema validation middleware
    - Create `src/middlewares/rateLimiter.js` — global (100/15min) and auth (10/15min) limiters with Redis store
    - Create `src/middlewares/requestLogger.js` — Winston HTTP request logging
    - Create `src/utils/tokenService.js` — RS256 JWT sign/verify (access 15min, refresh 7d)
    - Create `src/utils/generateUsername.js` — anonymous username generator with 50+ adjectives/nouns
    - Create `src/utils/sanitize.js` — input sanitization utility
    - Create `src/utils/AppError.js` — custom error class with statusCode and clientMessage
    - _Requirements: 1.2, 1.6, 3.1, 4.1, 4.2, 13.5, 13.6, 23.1_

- [x] 2. Checkpoint - Backend infrastructure
  - Ensure the backend starts without errors, db-migrate runs all migrations successfully, Redis connects, and the middleware pipeline is wired. Ask the user if questions arise.

- [x] 3. Auth module
  - [x] 3.1 Implement auth module (register, login, logout, refresh, recover)
    - Create `src/modules/auth/auth.routes.js` with POST endpoints for register, login, logout, refresh, recover
    - Create `src/modules/auth/auth.schema.js` with Zod schemas for all auth payloads
    - Create `src/modules/auth/auth.controller.js` — request handling, response formatting
    - Create `src/modules/auth/auth.service.js` — business logic: registration (generate username, hash password, generate recovery key), login (verify credentials, issue tokens), logout (revoke tokens), refresh (rotate tokens, replay detection), recover (verify key, issue tokens)
    - Create `src/modules/auth/auth.model.js` — parameterized SQL queries for users, recovery_keys, refresh_tokens tables
    - Apply auth rate limiter to auth routes
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.1_

  - [x] 3.2 Implement auth middleware for protected routes
    - Create `src/middlewares/authenticate.js` — verify Access_Token, check Redis revocation list, attach user to request
    - Ensure expired/revoked tokens return authentication error
    - Log all auth events (login, logout, refresh, failed attempts) via Winston
    - _Requirements: 3.4, 13.8, 23.3_

- [x] 4. Users module
  - [x] 4.1 Implement users module (profile CRUD, skills, account deletion)
    - Create `src/modules/users/users.routes.js` — GET/PUT/DELETE /me, skill sub-routes, block/report routes
    - Create `src/modules/users/users.schema.js` — Zod schemas for profile update, skill add
    - Create `src/modules/users/users.controller.js`
    - Create `src/modules/users/users.service.js` — profile operations, skill management, skill gap analysis, GDPR cascade delete (transaction-based), block/report logic
    - Create `src/modules/users/users.model.js` — parameterized SQL for users, user_teach_skills, user_learn_skills, blocks, reports tables
    - Implement IDOR prevention (verify resource ownership on all queries)
    - Invalidate Redis caches on profile/skill updates
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.1, 12.2, 12.3, 12.4, 14.1, 14.2, 14.3, 13.8, 22.4_

- [x] 5. Skills module
  - [x] 5.1 Implement skills module (catalog, categories)
    - Create `src/modules/skills/skills.routes.js` — GET /skills, GET /skills/categories
    - Create `src/modules/skills/skills.controller.js`
    - Create `src/modules/skills/skills.service.js` — list skills with categories, cache with Redis (1hr TTL)
    - Create `src/modules/skills/skills.model.js` — parameterized SQL for skills table
    - _Requirements: 5.3, 22.1_

- [x] 6. Matching module
  - [x] 6.1 Implement matching module (suggestions, requests, acceptance/rejection)
    - Create `src/modules/matching/matching.routes.js` — GET suggestions, POST/GET requests, PUT accept/reject, GET matches
    - Create `src/modules/matching/matching.schema.js` — Zod schemas
    - Create `src/modules/matching/matching.controller.js`
    - Create `src/modules/matching/matching.service.js` — complementary matching algorithm, exclusion filters (blocked, cooldown, trust < 10), match request state machine (pending → accepted/rejected), create Match + chat_room on accept
    - Create `src/modules/matching/matching.model.js` — parameterized SQL with complementary skill join query
    - Invalidate suggestion cache on skill/block changes
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.1_

- [x] 7. Reputation module
  - [x] 7.1 Implement reputation module (trust score engine, cooldown, auto-ban)
    - Create `src/modules/reputation/reputation.routes.js` (internal service, minimal routes)
    - Create `src/modules/reputation/reputation.service.js` — applyReputationEvent with all delta values, cooldown trigger (3 ghosts in 30 days → 7-day cooldown), auto-ban (score < 10)
    - Create `src/modules/reputation/reputation.model.js` — parameterized SQL for reputation_events, user trust_score updates, ghost count queries
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12_

- [x] 8. Checkpoint - Core backend modules
  - Ensure auth, users, skills, matching, and reputation modules are wired into the route tree and the server starts cleanly. Ask the user if questions arise.

- [x] 9. Chat module (REST + Socket.IO)
  - [x] 9.1 Implement chat REST endpoints and Socket.IO handler
    - Create `src/modules/chat/chat.routes.js` — GET /rooms, GET /rooms/:id/messages
    - Create `src/modules/chat/chat.controller.js`
    - Create `src/modules/chat/chat.service.js`
    - Create `src/modules/chat/chat.model.js` — parameterized SQL for chat_rooms, messages
    - Create `src/sockets/chatHandler.js` — Socket.IO /chat namespace with JWT auth middleware, join_room (verify participant), send_message (sanitize + persist + emit), typing indicator, read_receipt
    - Create `src/sockets/rateLimiter.js` — 30 events per 10 seconds per user via Redis
    - Log Socket.IO connect/disconnect events
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 4.3, 13.5, 23.4_

- [x] 10. Session module
  - [x] 10.1 Implement session module (scheduling, status, notes)
    - Create `src/modules/sessions/sessions.routes.js` — POST, GET, PUT status, POST notes
    - Create `src/modules/sessions/sessions.schema.js` — Zod schemas
    - Create `src/modules/sessions/sessions.controller.js`
    - Create `src/modules/sessions/sessions.service.js` — schedule session, update status, add notes, trigger reputation events on completion
    - Create `src/modules/sessions/sessions.model.js` — parameterized SQL with IDOR prevention (verify match participant)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 13.8_

- [x] 11. Community module
  - [x] 11.1 Implement community module (posts, comments, upvotes)
    - Create `src/modules/community/community.routes.js` — GET communities, GET/POST posts, POST comments, POST upvote
    - Create `src/modules/community/community.schema.js` — Zod schemas
    - Create `src/modules/community/community.controller.js`
    - Create `src/modules/community/community.service.js` — list communities, CRUD posts/comments, idempotent upvote (prevent duplicates), filter blocked users from results
    - Create `src/modules/community/community.model.js` — parameterized SQL for communities, posts, comments, post_votes
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 12.1_

- [x] 12. Notifications module
  - [x] 12.1 Implement notifications module (records — no FCM push)
    - Create `src/modules/notifications/notifications.routes.js` — GET list, PUT read, POST device-token
    - Create `src/modules/notifications/notifications.schema.js`
    - Create `src/modules/notifications/notifications.controller.js`
    - Create `src/modules/notifications/notifications.service.js` — create notification record, send FCM push, list (ordered by creation time desc), mark read
    - Create `src/modules/notifications/notifications.model.js` — parameterized SQL for notifications table
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 13. Admin module (backend endpoints)
  - [x] 13.1 Implement admin module (CRUD, analytics, audit log)
    - Create `src/modules/admin/admin.routes.js` — all admin endpoints (overview, users CRUD, suspend/ban, reports, skills analytics, reputation outliers, audit log)
    - Create `src/modules/admin/admin.schema.js` — Zod schemas
    - Create `src/modules/admin/admin.controller.js`
    - Create `src/modules/admin/admin.service.js` — dashboard stats, user management, report handling, analytics queries, audit log recording (immutable)
    - Create `src/modules/admin/admin.model.js` — parameterized SQL for admin_users, audit_log, aggregation queries
    - Create `src/middlewares/adminAuth.js` — admin JWT auth + role-based access check
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 17.1, 17.2, 17.3_

- [x] 14. Wire all backend routes and finalize
  - [x] 14.1 Create central route index and finalize backend
    - Create `src/routes/index.js` — mount all module routers under /api
    - Verify all middleware is applied in correct order
    - Ensure error handler catches all unhandled errors
    - Add health check endpoint (GET /api/health)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.6, 13.7_

- [x] 15. Checkpoint - Complete backend
  - Ensure all backend modules are wired, server starts, migrations run, all endpoints are reachable. Ask the user if questions arise.

- [x] 16. Admin Dashboard setup
  - [x] 16.1 Initialize Next.js 14 project with dependencies
    - Create `/admin-dashboard` directory with Next.js 14 (App Router)
    - Install: next, react, next-auth@5, recharts, tailwindcss, @tanstack/react-query, axios, zod
    - Configure Tailwind CSS
    - Create `lib/api.ts` — axios instance pointing to backend API
    - Create `lib/auth.ts` — NextAuth v5 configuration with credentials provider
    - _Requirements: 15.1_

  - [x] 16.2 Implement admin authentication and layout
    - Create `app/(auth)/login/page.tsx` — admin login form
    - Create `app/(dashboard)/layout.tsx` — sidebar navigation with role-based menu items
    - Create `lib/rbac.ts` — role permission map (super_admin: all, moderator: users/moderation/reports, analyst: overview/skills/reputation)
    - Create middleware for route protection based on admin role
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 17. Admin Dashboard pages
  - [x] 17.1 Implement overview and user management pages
    - Create `app/(dashboard)/page.tsx` — overview with stats cards (total users, active matches, session rates, report counts) using Recharts
    - Create `app/(dashboard)/users/page.tsx` — paginated user table with search, view, edit, suspend, ban actions
    - Create user detail modal/page with full user info and action buttons
    - _Requirements: 16.1, 16.2_

  - [x] 17.2 Implement moderation, reports, and analytics pages
    - Create `app/(dashboard)/reports/page.tsx` — report queue with status management
    - Create `app/(dashboard)/moderation/page.tsx` — content moderation interface
    - Create `app/(dashboard)/skills/page.tsx` — skill popularity, category distribution, trending skills with Recharts
    - Create `app/(dashboard)/reputation/page.tsx` — reputation outliers display
    - Create `app/(dashboard)/audit-log/page.tsx` — filterable audit log viewer (date range, action type, admin user)
    - _Requirements: 16.3, 16.4, 16.5, 16.6, 17.2_

- [x] 18. Checkpoint - Admin Dashboard complete
  - Ensure admin dashboard builds, login works, all pages render with data from backend API. Ask the user if questions arise.

- [x] 19. Flutter app setup
  - [x] 19.1 Initialize Flutter project with dependencies
    - Create `/flutter-app` directory with Flutter project
    - Add dependencies: flutter_riverpod, go_router, dio, flutter_secure_storage, socket_io_client, firebase_messaging, flutter_card_swiper
    - Create `lib/core/constants.dart` — API base URL, app constants
    - Create `lib/core/router.dart` — go_router configuration with auth redirect
    - Create `lib/core/theme.dart` — app theme
    - Create `lib/services/api_service.dart` — Dio instance with token refresh interceptor
    - Create `lib/services/secure_storage_service.dart` — flutter_secure_storage wrapper
    - _Requirements: 18.1, 18.2, 18.3_

  - [x] 19.2 Implement auth feature
    - Create `lib/features/auth/providers/auth_provider.dart` — Riverpod AsyncNotifier for auth state (login, logout, silent auth, refresh)
    - Create `lib/features/auth/screens/login_screen.dart` — username + password login
    - Create `lib/features/auth/screens/register_screen.dart` — registration with recovery key display
    - Store tokens in flutter_secure_storage on success
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [x] 20. Flutter app core features
  - [x] 20.1 Implement profile and skills management
    - Create `lib/features/profile/providers/profile_provider.dart`
    - Create `lib/features/profile/screens/profile_screen.dart` — view/edit profile, manage teach/learn skills
    - Create `lib/features/skills/providers/skills_provider.dart` — fetch skill catalog
    - Create `lib/features/skills/widgets/skill_picker.dart` — categorized skill selection widget
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 20.2 Implement matching feature with card-stack UI
    - Create `lib/features/matching/providers/matching_provider.dart` — fetch suggestions, send/manage requests
    - Create `lib/features/matching/screens/matches_screen.dart` — swipeable card-stack interface showing anonymous username and skills
    - Create `lib/features/matching/screens/active_matches_screen.dart` — list of active matches
    - Swipe right → send match request, swipe left → dismiss
    - Navigate to chat on match acceptance
    - _Requirements: 19.1, 19.2, 19.3, 19.4_

  - [x] 20.3 Implement real-time chat
    - Create `lib/features/chat/providers/chat_provider.dart` — Socket.IO connection, message state
    - Create `lib/features/chat/screens/chat_list_screen.dart` — list of chat rooms
    - Create `lib/features/chat/screens/chat_screen.dart` — real-time messaging with typing indicators and read receipts
    - Create `lib/services/socket_service.dart` — Socket.IO client with JWT auth, auto-reconnect
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 20.4 Implement sessions and community features
    - Create `lib/features/sessions/providers/sessions_provider.dart`
    - Create `lib/features/sessions/screens/sessions_screen.dart` — schedule, view, update sessions
    - Create `lib/features/community/providers/community_provider.dart`
    - Create `lib/features/community/screens/community_screen.dart` — browse communities, posts, comments, upvote
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 10.1, 10.2, 10.3, 10.4_

  - [x] 20.5 Implement notifications and push messaging
    - Create `lib/features/notifications/providers/notifications_provider.dart`
    - Create `lib/features/notifications/screens/notifications_screen.dart` — notification list with mark-as-read
    - Create `lib/services/push_notification_service.dart` — Firebase Messaging setup, device token registration, deep link handling on tap
    - _Requirements: 20.1, 20.2, 20.3, 11.1, 11.3, 11.4_

- [x] 21. Final checkpoint - All applications complete
  - Ensure backend, admin dashboard, and Flutter app are all buildable and wired together. All routes, pages, and screens are implemented. Ask the user if questions arise.

## Notes

- No automated tests are included — the user will test manually
- Build order: Backend core → Admin Dashboard → Flutter App
- Three separate directories: `/backend`, `/admin-dashboard`, `/flutter-app`
- Backend uses raw SQL migrations via db-migrate (no ORM)
- Each backend module follows: routes → controller → service → model → schema
- All database queries use parameterized SQL to prevent injection
- RS256 JWT with private/public key pair required (generate before running)
- Redis must be running for rate limiting, caching, and token revocation
- MySQL 8+ required for database
- Firebase project required for push notifications

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "1.4"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2"] },
    { "id": 5, "tasks": ["4.1", "5.1"] },
    { "id": 6, "tasks": ["6.1", "7.1"] },
    { "id": 7, "tasks": ["9.1", "10.1", "11.1"] },
    { "id": 8, "tasks": ["12.1", "13.1"] },
    { "id": 9, "tasks": ["14.1"] },
    { "id": 10, "tasks": ["16.1"] },
    { "id": 11, "tasks": ["16.2"] },
    { "id": 12, "tasks": ["17.1", "17.2"] },
    { "id": 13, "tasks": ["19.1"] },
    { "id": 14, "tasks": ["19.2"] },
    { "id": 15, "tasks": ["20.1", "20.2"] },
    { "id": 16, "tasks": ["20.3", "20.4", "20.5"] }
  ]
}
```
