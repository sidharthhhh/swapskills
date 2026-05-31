# Design Document: Skill Exchange Platform

## Overview

The Skill Exchange Platform is an anonymous skill-sharing system comprising three applications: a Node.js/Express backend with MySQL and Redis, a Flutter mobile app, and a Next.js 14 admin dashboard. Users register anonymously, list skills they can teach and want to learn, get matched with complementary users, communicate via real-time chat, and build reputation through a trust score system. The platform prioritizes privacy (no email/phone, paper recovery keys), security (RS256 JWT, rate limiting, input sanitization), and reliability (trust scores, cooldowns, auto-bans).

## Architecture

The platform follows a three-tier architecture with clear separation between the mobile client (Flutter), admin dashboard (Next.js 14), and backend services (Node.js/Express). Communication flows through REST APIs for CRUD operations and Socket.IO for real-time messaging.

```
┌─────────────────┐     ┌─────────────────┐
│  Flutter App    │     │ Admin Dashboard  │
│  (Mobile)       │     │ (Next.js 14)     │
└────────┬────────┘     └────────┬─────────┘
         │ REST + Socket.IO       │ REST
         └───────────┬────────────┘
                     ▼
         ┌───────────────────────┐
         │   Backend (Express)   │
         │   ┌───────────────┐   │
         │   │  Rate Limiter │   │
         │   │  Auth MW      │   │
         │   │  Validation   │   │
         │   └───────┬───────┘   │
         │           ▼           │
         │   ┌───────────────┐   │
         │   │   Modules     │   │
         │   │ (Domain Logic)│   │
         │   └───────┬───────┘   │
         └───────────┼───────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │ MySQL 8 │ │  Redis  │ │   FCM   │
    └─────────┘ └─────────┘ └─────────┘
```

## Components and Interfaces

### Backend Module Structure

Each domain module follows a consistent layered pattern:

```
src/modules/{module}/
  ├── {module}.routes.js      // Express router definitions
  ├── {module}.controller.js  // Request handling, response formatting
  ├── {module}.service.js     // Business logic, orchestration
  ├── {module}.model.js       // Database queries (parameterized SQL)
  └── {module}.schema.js      // Zod validation schemas
```

### Modules

| Module | Responsibility |
|--------|---------------|
| auth | Registration, login, logout, token refresh, recovery key |
| users | Profile CRUD, skill associations, account deletion |
| skills | Skill catalog, categories, gap analysis |
| matching | Match suggestions, requests, acceptance/rejection |
| chat | Real-time messaging, chat rooms, read receipts |
| community | Communities, posts, comments, upvotes |
| reputation | Trust score calculation, cooldown, auto-ban |
| notifications | Notification records, FCM push delivery |
| admin | Admin CRUD, audit log, analytics endpoints |

### Middleware Pipeline

```
Request → Helmet → CORS → HPP → Rate Limiter → Body Parser → Auth (JWT) → Validate (Zod) → Controller → Error Handler
```

```javascript
// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const { globalLimiter } = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler');
const routes = require('./routes');

const app = express();

app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
  hsts: { maxAge: 31536000, includeSubDomains: true }
}));
app.use(cors({ origin: process.env.CORS_WHITELIST.split(','), credentials: true }));
app.use(hpp());
app.use(globalLimiter);
app.use(express.json({ limit: '10kb' }));
app.use('/api', routes);
app.use(errorHandler);
```

### Authentication Flow

```javascript
// src/utils/tokenService.js
const jwt = require('jsonwebtoken');
const fs = require('fs');

const privateKey = fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH);
const publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH);

function generateAccessToken(userId) {
  return jwt.sign({ sub: userId }, privateKey, {
    algorithm: 'RS256',
    expiresIn: '15m'
  });
}

function generateRefreshToken(userId, deviceId) {
  return jwt.sign({ sub: userId, deviceId }, privateKey, {
    algorithm: 'RS256',
    expiresIn: '7d'
  });
}

function verifyToken(token) {
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
}
```

**Token Rotation Strategy:**
1. Client submits refresh token
2. Backend verifies token validity and checks it hasn't been used
3. Backend marks old refresh token as used
4. Backend issues new access + refresh token pair
5. If a used refresh token is submitted (replay attack), all tokens for that user are invalidated

### Anonymous Username Generation

```javascript
// src/utils/generateUsername.js
const crypto = require('crypto');

const ADJECTIVES = [ /* 50+ adjectives */ ];
const NOUNS = [ /* 50+ nouns */ ];

async function generateUsername(userModel) {
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    const adj = ADJECTIVES[crypto.randomInt(ADJECTIVES.length)];
    const noun = NOUNS[crypto.randomInt(NOUNS.length)];
    const num = String(crypto.randomInt(1000)).padStart(3, '0');
    const username = `${adj}${noun}_${num}`;
    
    const exists = await userModel.findByUsername(username);
    if (!exists) return username;
  }
  throw new Error('Username generation failed after max retries');
}
```

### Recovery Key Generation

```javascript
// src/modules/auth/auth.service.js
const crypto = require('crypto');
const bcrypt = require('bcrypt');

function generateRecoveryKey() {
  const bytes = crypto.randomBytes(32);
  const hex = bytes.toString('hex');
  // Format as XXXX-XXXX-XXXX-XXXX (using first 16 hex chars grouped)
  const formatted = hex.match(/.{1,8}/g).slice(0, 4).join('-');
  return { plaintext: formatted, hash: bcrypt.hashSync(formatted, 12) };
}
```

### Trust Score Engine

```javascript
// src/utils/trustScore.js
const EVENTS = {
  EXCHANGE_COMPLETE: { delta: +10 },
  ENDORSEMENT:      { delta: +3 },
  SESSION_COMPLETE: { delta: +5 },
  POSITIVE_FEEDBACK:{ delta: +2 },
  GHOST:            { delta: -15 },
  NO_SHOW:          { delta: -10 },
  IGNORED_REQUEST:  { delta: -5 },
  REPORT:           { delta: -5 },
  SUSPENDED:        { delta: -20 }
};

const COOLDOWN_THRESHOLD = 3;       // ghost events
const COOLDOWN_WINDOW_DAYS = 30;
const COOLDOWN_DURATION_DAYS = 7;
const AUTO_BAN_THRESHOLD = 10;

async function applyReputationEvent(userId, eventType, reputationModel, userModel) {
  const event = EVENTS[eventType];
  if (!event) throw new Error(`Unknown event type: ${eventType}`);

  const newScore = await reputationModel.applyDelta(userId, event.delta);
  await reputationModel.recordEvent(userId, eventType, event.delta);

  if (newScore < AUTO_BAN_THRESHOLD) {
    await userModel.ban(userId);
  }

  if (eventType === 'GHOST') {
    const ghostCount = await reputationModel.countRecentGhosts(userId, COOLDOWN_WINDOW_DAYS);
    if (ghostCount >= COOLDOWN_THRESHOLD) {
      await userModel.applyCooldown(userId, COOLDOWN_DURATION_DAYS);
    }
  }

  return newScore;
}
```

### Matching Algorithm

```javascript
// src/modules/matching/matching.service.js
async function getSuggestions(userId, matchingModel, userModel) {
  // 1. Get requesting user's teach and learn skills
  const userTeach = await userModel.getTeachSkills(userId);
  const userLearn = await userModel.getLearnSkills(userId);

  // 2. Find users with complementary skills (bidirectional overlap)
  //    - Their teach skills overlap with my learn skills
  //    - Their learn skills overlap with my teach skills
  const candidates = await matchingModel.findComplementaryUsers(
    userId, userTeach, userLearn
  );

  // 3. Filter out: blocked users, cooldown users, trust score < 10
  const filtered = await matchingModel.applyExclusions(userId, candidates);

  return filtered;
}
```

**SQL for complementary matching:**
```sql
SELECT DISTINCT u.id, u.anonymous_username
FROM users u
INNER JOIN user_teach_skills uts ON u.id = uts.user_id
INNER JOIN user_learn_skills uls ON u.id = uls.user_id
WHERE uts.skill_id IN (?) -- requesting user's learn skills
  AND uls.skill_id IN (?) -- requesting user's teach skills
  AND u.id != ?
  AND u.id NOT IN (SELECT blocked_user_id FROM blocks WHERE user_id = ?)
  AND u.is_banned = 0
  AND u.cooldown_until IS NULL OR u.cooldown_until < NOW()
  AND u.trust_score >= 10;
```

### Real-Time Chat (Socket.IO)

```javascript
// src/sockets/chatHandler.js
const { verifyToken } = require('../utils/tokenService');
const { socketRateLimiter } = require('./rateLimiter');
const sanitize = require('../utils/sanitize');

module.exports = function(io) {
  const chatNamespace = io.of('/chat');

  chatNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const payload = verifyToken(token);
      socket.userId = payload.sub;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  chatNamespace.on('connection', (socket) => {
    socket.on('join_room', async (roomId) => {
      // Verify user is participant of the match associated with this room
      const isParticipant = await chatModel.verifyParticipant(socket.userId, roomId);
      if (!isParticipant) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }
      socket.join(roomId);
    });

    socket.on('send_message', async (data) => {
      if (!socketRateLimiter.allow(socket.userId)) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }
      const sanitized = sanitize(data.content);
      const message = await chatModel.saveMessage(socket.userId, data.roomId, sanitized);
      chatNamespace.to(data.roomId).emit('new_message', message);
    });

    socket.on('typing', (data) => {
      socket.to(data.roomId).emit('user_typing', { userId: socket.userId });
    });

    socket.on('read_receipt', async (data) => {
      await chatModel.markAsRead(data.messageIds, socket.userId);
      socket.to(data.roomId).emit('messages_read', {
        reader: socket.userId,
        messageIds: data.messageIds
      });
    });
  });
};
```

### Rate Limiting

```javascript
// src/middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { redisClient } = require('../config/redis');

const globalLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }),
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { globalLimiter, authLimiter };
```

```javascript
// src/sockets/rateLimiter.js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

const SOCKET_LIMIT = 30;
const SOCKET_WINDOW_SECONDS = 10;

async function allow(userId) {
  const key = `socket_rate:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, SOCKET_WINDOW_SECONDS);
  return count <= SOCKET_LIMIT;
}

module.exports = { allow };
```

### GDPR Account Deletion

```javascript
// src/modules/users/users.service.js
async function deleteAccount(userId, db, redisClient) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Cascade delete in dependency order
    await connection.execute('DELETE FROM session_notes WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM messages WHERE sender_id = ?', [userId]);
    await connection.execute('DELETE FROM notifications WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM comments WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM posts WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM reports WHERE reporter_id = ? OR reported_user_id = ?', [userId, userId]);
    await connection.execute('DELETE FROM blocks WHERE user_id = ? OR blocked_user_id = ?', [userId, userId]);
    await connection.execute('DELETE FROM reputation_events WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM skill_endorsements WHERE endorser_id = ? OR endorsed_user_id = ?', [userId, userId]);
    await connection.execute('DELETE FROM sessions WHERE match_id IN (SELECT id FROM matches WHERE user1_id = ? OR user2_id = ?)', [userId, userId]);
    await connection.execute('DELETE FROM chat_rooms WHERE match_id IN (SELECT id FROM matches WHERE user1_id = ? OR user2_id = ?)', [userId, userId]);
    await connection.execute('DELETE FROM matches WHERE user1_id = ? OR user2_id = ?', [userId, userId]);
    await connection.execute('DELETE FROM match_requests WHERE sender_id = ? OR receiver_id = ?', [userId, userId]);
    await connection.execute('DELETE FROM user_teach_skills WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM user_learn_skills WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM recovery_keys WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM users WHERE id = ?', [userId]);

    await connection.commit();

    // Clear Redis caches
    await redisClient.del(`user:${userId}:profile`);
    await redisClient.del(`user:${userId}:skills`);
    await redisClient.del(`user:${userId}:tokens`);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
```

## Data Models

### Database Schema (Key Tables)

```sql
-- Users
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  anonymous_username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  trust_score INT DEFAULT 100,
  is_banned TINYINT(1) DEFAULT 0,
  cooldown_until DATETIME NULL,
  bio TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Recovery Keys
CREATE TABLE recovery_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  is_used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Refresh Tokens
CREATE TABLE refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  device_info JSON NULL,
  is_used TINYINT(1) DEFAULT 0,
  is_revoked TINYINT(1) DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Skills
CREATE TABLE skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Teach Skills
CREATE TABLE user_teach_skills (
  user_id VARCHAR(36) NOT NULL,
  skill_id INT NOT NULL,
  proficiency_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, skill_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

-- User Learn Skills
CREATE TABLE user_learn_skills (
  user_id VARCHAR(36) NOT NULL,
  skill_id INT NOT NULL,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, skill_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

-- Match Requests
CREATE TABLE match_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id VARCHAR(36) NOT NULL,
  receiver_id VARCHAR(36) NOT NULL,
  status ENUM('pending', 'accepted', 'rejected', 'expired') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME NULL,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- Matches
CREATE TABLE matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user1_id VARCHAR(36) NOT NULL,
  user2_id VARCHAR(36) NOT NULL,
  match_request_id INT NOT NULL,
  status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user1_id) REFERENCES users(id),
  FOREIGN KEY (user2_id) REFERENCES users(id),
  FOREIGN KEY (match_request_id) REFERENCES match_requests(id)
);

-- Skill Endorsements
CREATE TABLE skill_endorsements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  endorser_id VARCHAR(36) NOT NULL,
  endorsed_user_id VARCHAR(36) NOT NULL,
  skill_id INT NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (endorser_id) REFERENCES users(id),
  FOREIGN KEY (endorsed_user_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

-- Sessions
CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  scheduled_at DATETIME NOT NULL,
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id)
);

-- Session Notes
CREATE TABLE session_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Chat Rooms
CREATE TABLE chat_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id)
);

-- Messages
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_room_id INT NOT NULL,
  sender_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Communities
CREATE TABLE communities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts
CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  community_id INT NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  upvote_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (community_id) REFERENCES communities(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Comments
CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Post Votes (prevent duplicate upvotes)
CREATE TABLE post_votes (
  user_id VARCHAR(36) NOT NULL,
  post_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

-- Reports
CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id VARCHAR(36) NOT NULL,
  reported_user_id VARCHAR(36) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'reviewed', 'resolved') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  FOREIGN KEY (reported_user_id) REFERENCES users(id)
);

-- Blocks
CREATE TABLE blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  blocked_user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_block (user_id, blocked_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (blocked_user_id) REFERENCES users(id)
);

-- Reputation Events
CREATE TABLE reputation_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  delta INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notifications
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  data JSON NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Admin Users
CREATE TABLE admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'moderator', 'analyst') NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log
CREATE TABLE audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  target_entity_type VARCHAR(50) NOT NULL,
  target_entity_id VARCHAR(50) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id)
);
```

## API Interfaces

### Authentication Endpoints

| Method | Path | Description | Rate Limit |
|--------|------|-------------|------------|
| POST | /api/auth/register | Register new user | Auth (10/15min) |
| POST | /api/auth/login | Login with credentials | Auth (10/15min) |
| POST | /api/auth/refresh | Refresh access token | Global (100/15min) |
| POST | /api/auth/logout | Logout and revoke tokens | Global (100/15min) |
| POST | /api/auth/recover | Recover account with key | Auth (10/15min) |

### User Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/users/me | Get current user profile |
| PUT | /api/users/me | Update profile |
| DELETE | /api/users/me | Delete account (GDPR) |
| GET | /api/users/me/skills/teach | Get teach skills |
| POST | /api/users/me/skills/teach | Add teach skill |
| DELETE | /api/users/me/skills/teach/:skillId | Remove teach skill |
| GET | /api/users/me/skills/learn | Get learn skills |
| POST | /api/users/me/skills/learn | Add learn skill |
| DELETE | /api/users/me/skills/learn/:skillId | Remove learn skill |
| GET | /api/users/me/skill-gap | Get skill gap analysis |

### Skills Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/skills | List all skills (categorized) |
| GET | /api/skills/categories | List skill categories |

### Matching Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/matching/suggestions | Get match suggestions |
| POST | /api/matching/requests | Send match request |
| GET | /api/matching/requests | List pending requests |
| PUT | /api/matching/requests/:id/accept | Accept match request |
| PUT | /api/matching/requests/:id/reject | Reject match request |
| GET | /api/matching/matches | List active matches |

### Session Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/sessions | Schedule a session |
| GET | /api/sessions | List user's sessions |
| PUT | /api/sessions/:id/status | Update session status |
| POST | /api/sessions/:id/notes | Add session notes |

### Chat Endpoints (REST)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/chat/rooms | List user's chat rooms |
| GET | /api/chat/rooms/:id/messages | Get message history |

### Community Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/communities | List communities |
| GET | /api/communities/:id/posts | List posts in community |
| POST | /api/communities/:id/posts | Create post |
| POST | /api/posts/:id/comments | Add comment |
| POST | /api/posts/:id/upvote | Upvote post |

### Notification Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/notifications | List notifications |
| PUT | /api/notifications/:id/read | Mark as read |
| POST | /api/notifications/device-token | Register FCM token |

### Blocking & Reporting Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/users/:id/block | Block a user |
| DELETE | /api/users/:id/block | Unblock a user |
| POST | /api/users/:id/report | Report a user |

### Admin Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/overview | Dashboard statistics |
| GET | /api/admin/users | List users (paginated) |
| GET | /api/admin/users/:id | View user details |
| PUT | /api/admin/users/:id | Edit user |
| PUT | /api/admin/users/:id/suspend | Suspend user |
| PUT | /api/admin/users/:id/ban | Ban user |
| GET | /api/admin/reports | List reports |
| PUT | /api/admin/reports/:id | Update report status |
| GET | /api/admin/skills/analytics | Skills analytics |
| GET | /api/admin/reputation/outliers | Reputation outliers |
| GET | /api/admin/audit-log | Audit log (filterable) |

### Socket.IO Events (/chat namespace)

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| join_room | Client → Server | `{ roomId }` | Join a chat room |
| leave_room | Client → Server | `{ roomId }` | Leave a chat room |
| send_message | Client → Server | `{ roomId, content }` | Send message |
| typing | Client → Server | `{ roomId }` | Typing indicator |
| read_receipt | Client → Server | `{ roomId, messageIds }` | Mark messages read |
| new_message | Server → Client | `{ id, senderId, content, createdAt }` | New message |
| user_typing | Server → Client | `{ userId }` | User is typing |
| messages_read | Server → Client | `{ reader, messageIds }` | Messages were read |
| error | Server → Client | `{ message }` | Generic error |

## Admin Dashboard Architecture

### Next.js 14 App Router Structure

```
app/
  (auth)/
    login/page.tsx          -- NextAuth credential login
  (dashboard)/
    layout.tsx              -- Sidebar + header with role-based nav
    page.tsx                -- Overview with Recharts stats
    users/page.tsx          -- User management table
    matches/page.tsx        -- Match management
    moderation/page.tsx     -- Content moderation
    reports/page.tsx        -- Report queue
    skills/page.tsx         -- Skills analytics
    reputation/page.tsx     -- Reputation outliers
    audit-log/page.tsx      -- Audit log viewer
    settings/page.tsx       -- Platform settings
```

### Role-Based Access Control (Admin)

```typescript
// lib/auth.ts
const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: ['*'],
  moderator: ['users', 'moderation', 'reports'],
  analyst: ['overview', 'skills', 'reputation']
};

function hasAccess(role: AdminRole, feature: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms.includes('*') || perms.includes(feature);
}
```

## Flutter App Architecture

### State Management (Riverpod 2)

```dart
// lib/features/auth/providers/auth_provider.dart
class AuthNotifier extends AsyncNotifier<AuthState> {
  @override
  Future<AuthState> build() async {
    final token = await ref.read(secureStorageProvider).getRefreshToken();
    if (token != null) {
      return _silentAuth(token);
    }
    return const AuthState.unauthenticated();
  }

  Future<void> login(String username, String password) async { ... }
  Future<void> logout() async { ... }
  Future<void> refreshToken() async { ... }
}
```

### API Service with Token Refresh Interceptor

```dart
// lib/services/api_service.dart
class ApiService {
  late final Dio _dio;

  ApiService(Ref ref) {
    _dio = Dio(BaseOptions(baseUrl: AppConstants.apiBaseUrl));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await ref.read(secureStorageProvider).getAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          // Attempt token refresh
          final refreshed = await ref.read(authProvider.notifier).refreshToken();
          if (refreshed) {
            // Retry original request
            handler.resolve(await _dio.fetch(error.requestOptions));
            return;
          }
        }
        handler.next(error);
      },
    ));
  }
}
```

### Navigation (go_router)

```dart
// lib/core/router.dart
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
      GoRoute(path: '/matches', builder: (_, __) => const MatchesScreen()),
      GoRoute(path: '/chat/:roomId', builder: (_, state) =>
        ChatScreen(roomId: state.pathParameters['roomId']!)),
      GoRoute(path: '/sessions', builder: (_, __) => const SessionsScreen()),
      GoRoute(path: '/community', builder: (_, __) => const CommunityScreen()),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
    ],
    redirect: (context, state) {
      final isAuth = ref.read(authProvider).isAuthenticated;
      if (!isAuth && !state.matchedLocation.startsWith('/login')) {
        return '/login';
      }
      return null;
    },
  );
});
```

## Error Handling

### Backend Error Handler

```javascript
// src/middlewares/errorHandler.js
const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Never expose internal details
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500
    ? 'An unexpected error occurred'
    : err.clientMessage || 'Request failed';

  res.status(statusCode).json({ error: { message } });
}
```

### Validation Middleware

```javascript
// src/middlewares/validate.js
const { ZodError } = require('zod');

function validate(schema) {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        // Generic message - don't reveal which field failed
        return res.status(400).json({
          error: { message: 'Invalid request data' }
        });
      }
      next(err);
    }
  };
}
```

## Logging

```javascript
// src/config/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/warn.log', level: 'warn' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

## Caching Strategy

| Data | Cache Key Pattern | TTL | Invalidation |
|------|-------------------|-----|--------------|
| User profile | `user:{id}:profile` | 5 min | On profile update |
| User skills | `user:{id}:skills` | 5 min | On skill add/remove |
| Skill catalog | `skills:all` | 1 hour | On admin skill change |
| Match suggestions | `user:{id}:suggestions` | 2 min | On skill/block change |
| Community list | `communities:all` | 30 min | On community create |
| JWT revocation | `revoked:{jti}` | 15 min | Auto-expire with token |
| Rate limits | `rate:{type}:{key}` | Window duration | Auto-expire |

## Notification Flow

```
Event Trigger → Notification Service → Create DB Record → Send FCM Push
                                                        ↓
                                              Mobile App receives
                                                        ↓
                                              Display notification
                                                        ↓
                                              Tap → Deep link via go_router
```

## Security Architecture

### Input Sanitization Pipeline

```
Raw Input → Zod Schema Validation → Content Sanitization → Parameterized Query → Database
```

### IDOR Prevention Pattern

```javascript
// Every resource access verifies ownership
async function getSession(sessionId, userId) {
  const [rows] = await db.execute(
    `SELECT s.* FROM sessions s
     INNER JOIN matches m ON s.match_id = m.id
     WHERE s.id = ? AND (m.user1_id = ? OR m.user2_id = ?)`,
    [sessionId, userId, userId]
  );
  if (rows.length === 0) throw new ForbiddenError();
  return rows[0];
}
```

### Block Enforcement

Blocks are enforced at the query level across all interaction points:
- Match suggestions: `WHERE u.id NOT IN (SELECT blocked_user_id FROM blocks WHERE user_id = ?)`
- Chat access: Verify neither participant has blocked the other
- Community: Filter posts/comments from blocked users
- Match requests: Reject if block exists in either direction

## Testing Strategy

### Unit Tests
- **Scope**: Individual module services and utility functions
- **Framework**: Jest (backend), Flutter test (mobile), Jest + React Testing Library (admin)
- **Focus**: Trust score calculations, username generation, token operations, matching algorithm, input validation, sanitization

### Property-Based Tests
- **Scope**: Universal properties defined in Correctness Properties section
- **Framework**: fast-check (backend JavaScript)
- **Minimum iterations**: 100 per property
- **Focus**: Trust score deltas, username format invariants, token rotation, match complementarity, RBAC enforcement, cascade deletion completeness

### Integration Tests
- **Scope**: API endpoints, database operations, Socket.IO events, FCM delivery
- **Framework**: Supertest (backend), integration test suites
- **Focus**: Full request/response cycles, middleware pipeline, rate limiting behavior, auth flows

### Smoke Tests
- **Scope**: Infrastructure configuration, middleware setup, database schema
- **Focus**: Helmet headers present, CORS configured, 20+ tables exist, Redis connected, Winston logging active

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Anonymous Username Format Invariant

*For any* successful user registration, the returned Anonymous_Username SHALL match the pattern `[A-Z][a-z]+[A-Z][a-z]+_\d{3}` (capitalized adjective + capitalized noun + underscore + exactly 3 digits).

**Validates: Requirements 1.1, 1.2**

### Property 2: Username Uniqueness

*For any* set of generated Anonymous_Usernames across all registered users, no two users SHALL have the same Anonymous_Username.

**Validates: Requirements 1.3**

### Property 3: Password Hashing Correctness

*For any* registration with a plaintext password, the stored credential SHALL be a valid bcrypt hash with cost factor 12, and `bcrypt.compare(plaintext, stored_hash)` SHALL return true.

**Validates: Requirements 1.4**

### Property 4: Input Validation Rejects Invalid Data

*For any* API request with a payload that violates the Zod schema (missing required fields, wrong types, out-of-range values), the Backend SHALL reject the request before any database write occurs and return a generic error message that does not identify the specific failing field.

**Validates: Requirements 1.5, 1.6, 5.5**

### Property 5: Recovery Key Round-Trip

*For any* successfully registered user, the plaintext Recovery_Key displayed at registration SHALL match the stored bcrypt hash when compared via `bcrypt.compare`, and submitting that key SHALL authenticate the user and issue valid tokens.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 6: Generic Error Responses Hide Internal Details

*For any* error response from the Backend (validation failures, auth failures, resource not found, internal errors), the response body SHALL NOT contain stack traces, database column names, internal file paths, or information revealing whether a specific entity exists.

**Validates: Requirements 1.6, 2.4, 9.7, 12.4, 13.6**

### Property 7: Token Specification Compliance

*For any* successful authentication (login or refresh), the issued Access_Token SHALL use RS256 algorithm with a 15-minute TTL, and the issued Refresh_Token SHALL have a 7-day TTL.

**Validates: Requirements 3.1**

### Property 8: Refresh Token Rotation Invalidates Previous Token

*For any* valid refresh token submission, the Backend SHALL issue new tokens AND the previously submitted refresh token SHALL be marked as used and rejected on subsequent submission attempts.

**Validates: Requirements 3.2**

### Property 9: Refresh Token Replay Detection

*For any* refresh token that has already been used (replay attack), submitting it SHALL cause ALL refresh tokens for that user to be invalidated.

**Validates: Requirements 3.5**

### Property 10: Revoked Token Rejection

*For any* Access_Token that has been added to the Redis revocation list or has expired, the Backend SHALL reject all API requests bearing that token with an authentication error.

**Validates: Requirements 3.3, 3.4**

### Property 11: Rate Limit Enforcement

*For any* client that has exhausted its rate limit quota (100 global / 10 auth / 30 socket events per window), all subsequent requests within the same window SHALL be rejected with a rate limit exceeded response.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 12: Skill Association Persistence

*For any* user and valid skill, adding the skill to the teach list SHALL create an entry in user_teach_skills, and adding to the learn list SHALL create an entry in user_learn_skills, such that querying the user's skills returns the added skill.

**Validates: Requirements 5.1, 5.2**

### Property 13: Match Suggestion Complementarity

*For any* user U requesting match suggestions, every returned suggestion S SHALL satisfy: (S.teach_skills ∩ U.learn_skills ≠ ∅) AND (S.learn_skills ∩ U.teach_skills ≠ ∅).

**Validates: Requirements 6.1**

### Property 14: Match Suggestion Exclusions

*For any* match suggestion query, the results SHALL NOT contain users who are: blocked by the requester, currently in cooldown, or have a Trust_Score below 10.

**Validates: Requirements 6.5, 6.6**

### Property 15: Match Request State Machine

*For any* match request, it SHALL transition through valid states only: pending → accepted (creates Match record) OR pending → rejected (marks as rejected). No other transitions SHALL be permitted.

**Validates: Requirements 6.2, 6.3, 6.4**

### Property 16: Trust Score Delta Correctness

*For any* reputation event of a known type, applying it to a user's Trust_Score SHALL change the score by exactly the defined delta: exchange_complete (+10), endorsement (+3), session_complete (+5), positive_feedback (+2), ghost (-15), no_show (-10), ignored_request (-5), report (-5), suspended (-20).

**Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10**

### Property 17: Trust Score Initial Value

*For any* newly registered user, the Trust_Score SHALL be initialized to exactly 100.

**Validates: Requirements 7.1**

### Property 18: Cooldown Trigger Threshold

*For any* user who accumulates exactly 3 ghost events within a 30-day sliding window, the Backend SHALL place that user in a 7-day cooldown period. Users with fewer than 3 ghost events in 30 days SHALL NOT be placed in cooldown.

**Validates: Requirements 7.11**

### Property 19: Auto-Ban Threshold

*For any* user whose Trust_Score falls below 10 (after applying a reputation event), the Backend SHALL automatically ban that user from the platform.

**Validates: Requirements 7.12**

### Property 20: Session Ownership Isolation

*For any* user requesting their session list, the response SHALL contain only sessions where the user is a participant of the associated match, and SHALL NOT contain sessions belonging to other users.

**Validates: Requirements 8.2**

### Property 21: Chat Room Access Authorization

*For any* user attempting to join a chat room, access SHALL be granted only if the user is a participant of the match associated with that chat room. Non-participants SHALL be denied access.

**Validates: Requirements 9.3**

### Property 22: Message Sanitization

*For any* message sent through the chat system, the persisted and emitted content SHALL have all HTML tags, script injections, and potentially dangerous content removed or escaped, while preserving the semantic text content.

**Validates: Requirements 9.4, 13.5**

### Property 23: Upvote Idempotence

*For any* user-post pair, attempting to upvote the same post multiple times SHALL result in exactly one vote being recorded and the upvote_count incrementing by exactly 1 from the pre-vote state.

**Validates: Requirements 10.4, 10.5**

### Property 24: Block Enforcement Completeness

*For any* block relationship (user A blocks user B), user B SHALL be excluded from: A's match suggestions, A's chat rooms, and SHALL be unable to send match requests or messages to A. The error response SHALL NOT reveal that a block exists.

**Validates: Requirements 12.1, 12.3, 12.4**

### Property 25: GDPR Cascade Delete Completeness

*For any* account deletion request, after completion ALL records associated with that user SHALL be removed from both MySQL (across all related tables) and Redis caches, and the deletion SHALL be atomic (all-or-nothing within a transaction).

**Validates: Requirements 14.1, 14.2, 14.3**

### Property 26: Role-Based Access Control Enforcement

*For any* admin user with a given role, access to dashboard features SHALL be granted only for features within their role's permission set (super_admin: all, moderator: users/moderation/reports, analyst: overview/skills/reputation read-only). Attempts to access features outside the permission set SHALL be denied.

**Validates: Requirements 15.2, 15.3, 15.4, 15.5**

### Property 27: Audit Log Immutability and Completeness

*For any* state-changing admin action (create, update, delete, suspend, ban), an audit log entry SHALL be created containing the admin user ID, action type, target entity type, target entity ID, and timestamp. Existing audit log entries SHALL NOT be modifiable or deletable.

**Validates: Requirements 17.1, 17.2, 17.3**

### Property 28: Notification Ordering

*For any* user's notification list, notifications SHALL be returned in descending order of creation time (newest first).

**Validates: Requirements 11.3**

### Property 29: IDOR Prevention

*For any* API request targeting a specific resource (session, message, match, profile), the Backend SHALL verify that the authenticated user owns or is a participant of that resource before granting access. Requests for resources owned by other users SHALL be rejected.

**Validates: Requirements 13.8**

### Property 30: Cache Invalidation on Write

*For any* write operation that modifies data which has a corresponding Redis cache entry, the cache entry SHALL be removed immediately after the write completes, ensuring subsequent reads fetch fresh data.

**Validates: Requirements 22.4**

### Property 31: Skill Gap Analysis Correctness

*For any* user requesting a skill gap analysis, the returned skills SHALL be exactly those skills in the user's learn list for which no other active, non-blocked, non-cooldown user with Trust_Score >= 10 has that skill in their teach list.

**Validates: Requirements 5.4**

### Property 32: Match Creates Chat Room

*For any* accepted match request that creates a Match record, a corresponding chat_room record SHALL be created and associated with that match.

**Validates: Requirements 9.1**

### Property 33: Completed Session Reputation Events

*For any* session marked as completed by both participants, the Backend SHALL create a reputation event for both users, increasing each user's Trust_Score by the session_complete delta (+5).

**Validates: Requirements 8.5**
