# Requirements Document

## Introduction

An anonymous skill exchange platform enabling users to teach and learn skills from each other. The system comprises a Node.js + Express + MySQL + Socket.IO backend, a Flutter mobile application, and a Next.js 14 admin dashboard. Users are identified by randomly generated anonymous usernames, matched based on complementary skill sets, and communicate through real-time chat. A trust score system governs user reputation, and a paper recovery key mechanism provides account recovery without email or phone.

## Glossary

- **Platform**: The complete skill exchange system including Backend, Mobile_App, and Admin_Dashboard
- **Backend**: The Node.js + Express server providing REST API and WebSocket services
- **Mobile_App**: The Flutter-based mobile application for end users
- **Admin_Dashboard**: The Next.js 14 web application for platform administration
- **User**: A registered participant on the Platform who teaches and learns skills
- **Admin_User**: A staff member with access to the Admin_Dashboard
- **Trust_Score**: A numeric reputation value assigned to each User, starting at 100
- **Anonymous_Username**: A system-generated identifier in the format [Adjective][Noun]_[3-digit number]
- **Recovery_Key**: A 256-bit cryptographic key displayed once to the User for account recovery
- **Match**: A pairing between two Users with complementary teach/learn skills
- **Session**: A scheduled skill exchange meeting between two matched Users
- **Endorsement**: A positive attestation from one User about another User's skill proficiency
- **Community**: A topic-based discussion group within the Platform
- **Cooldown**: A temporary restriction period applied to Users who repeatedly ghost sessions
- **Access_Token**: A short-lived RS256 JWT (15-minute TTL) used for API authentication
- **Refresh_Token**: A longer-lived token (7-day TTL) used to obtain new Access_Tokens
- **Rate_Limiter**: A mechanism that restricts the number of requests per time window
- **Socket_Namespace**: The /chat Socket.IO namespace for real-time messaging
- **Audit_Log**: A record of administrative actions performed on the Platform
- **Super_Admin**: An Admin_User role with full access to all Admin_Dashboard features
- **Moderator**: An Admin_User role with access to user management, moderation, and reports
- **Analyst**: An Admin_User role with read-only access to dashboard, skills, and reputation data

## Requirements

### Requirement 1: User Registration and Anonymous Identity

**User Story:** As a new user, I want to register on the platform and receive an anonymous username, so that I can participate in skill exchanges without revealing my real identity.

#### Acceptance Criteria

1. WHEN a registration request is received with valid credentials, THE Backend SHALL create a new User record, generate an Anonymous_Username in the format [Adjective][Noun]_[3-digit number], and return the Anonymous_Username to the Mobile_App.
2. THE Backend SHALL select the adjective from a pool of at least 50 adjectives and the noun from a pool of at least 50 nouns when generating an Anonymous_Username.
3. THE Backend SHALL verify uniqueness of the generated Anonymous_Username against existing records and retry generation if a collision is detected.
4. WHEN a registration request is received, THE Backend SHALL hash the password using bcrypt with a salt round value of 12 before storing the credential.
5. WHEN a registration request is received, THE Backend SHALL validate all input fields using Zod schemas before processing.
6. IF a registration request contains invalid or missing fields, THEN THE Backend SHALL return a generic error message without revealing which specific field failed validation to external consumers.

### Requirement 2: Paper Recovery Key

**User Story:** As a registered user, I want to receive a one-time recovery key during registration, so that I can recover my account without needing an email or phone number.

#### Acceptance Criteria

1. WHEN a User successfully registers, THE Backend SHALL generate a Recovery_Key using crypto.randomBytes(32) and display the key in XXXX-XXXX-XXXX-XXXX format exactly once to the User.
2. THE Backend SHALL store the Recovery_Key as a bcrypt hash and discard the plaintext after delivery to the User.
3. WHEN a User submits a valid Recovery_Key for account recovery, THE Backend SHALL authenticate the User, invalidate the used Recovery_Key, and issue new authentication tokens.
4. IF a User submits an invalid Recovery_Key, THEN THE Backend SHALL return a generic error message without indicating whether the account exists.

### Requirement 3: Authentication and Token Management

**User Story:** As a user, I want to securely log in and maintain my session, so that my account remains protected while I use the platform.

#### Acceptance Criteria

1. WHEN a User submits valid login credentials, THE Backend SHALL issue an Access_Token (RS256, 15-minute TTL) and a Refresh_Token (7-day TTL).
2. WHEN a valid Refresh_Token is submitted, THE Backend SHALL issue a new Access_Token and rotate the Refresh_Token by invalidating the previous one.
3. WHEN a User logs out, THE Backend SHALL add the current Access_Token to the Redis revocation list and invalidate the associated Refresh_Token.
4. IF an expired or revoked Access_Token is submitted, THEN THE Backend SHALL reject the request with an authentication error.
5. IF a Refresh_Token that has already been used is submitted, THEN THE Backend SHALL invalidate all Refresh_Tokens for that User as a security measure.
6. THE Backend SHALL store Refresh_Tokens in the database with association to the User and device metadata.

### Requirement 4: Rate Limiting

**User Story:** As a platform operator, I want to limit the rate of API requests, so that the system remains available and protected from abuse.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL restrict global API requests to 100 requests per 15-minute window per IP address.
2. THE Rate_Limiter SHALL restrict authentication endpoints (login, register, recover) to 10 requests per 15-minute window per IP address.
3. WHILE a User is connected to the Socket_Namespace, THE Backend SHALL restrict Socket.IO events to 30 events per 10-second window per User.
4. IF a client exceeds the rate limit, THEN THE Backend SHALL reject subsequent requests with a rate limit exceeded response until the window resets.
5. THE Rate_Limiter SHALL use Redis as the backing store for distributed rate limit state.

### Requirement 5: User Profile and Skill Management

**User Story:** As a user, I want to manage my skills profile by listing skills I can teach and skills I want to learn, so that the platform can find suitable matches for me.

#### Acceptance Criteria

1. WHEN a User adds a skill to their teach list, THE Backend SHALL associate the skill with the User's profile in the user_teach_skills table.
2. WHEN a User adds a skill to their learn list, THE Backend SHALL associate the skill with the User's profile in the user_learn_skills table.
3. THE Backend SHALL provide a categorized list of available skills when requested.
4. WHEN a User requests a skill gap analysis, THE Backend SHALL return skills that the User wants to learn but has no available matches for.
5. WHEN a User updates their profile, THE Backend SHALL validate all input using Zod schemas before persisting changes.

### Requirement 6: Skill Matching

**User Story:** As a user, I want to be matched with other users who can teach what I want to learn and want to learn what I can teach, so that we can exchange skills.

#### Acceptance Criteria

1. WHEN a User requests match suggestions, THE Backend SHALL return Users whose teach skills overlap with the requesting User's learn skills and whose learn skills overlap with the requesting User's teach skills.
2. WHEN a User sends a match request to another User, THE Backend SHALL create a pending match_request record.
3. WHEN the receiving User accepts a match request, THE Backend SHALL create a Match record linking both Users.
4. WHEN the receiving User rejects a match request, THE Backend SHALL mark the match_request as rejected.
5. THE Backend SHALL exclude blocked Users and Users in Cooldown from match suggestions.
6. THE Backend SHALL exclude Users with a Trust_Score below 10 from match suggestions.

### Requirement 7: Trust Score System

**User Story:** As a platform operator, I want to track user reliability through a trust score, so that unreliable users are penalized and reliable users are rewarded.

#### Acceptance Criteria

1. WHEN a User registers, THE Backend SHALL initialize the User's Trust_Score to 100.
2. WHEN a User completes a skill exchange, THE Backend SHALL increase the User's Trust_Score by 10.
3. WHEN a User receives an Endorsement, THE Backend SHALL increase the User's Trust_Score by 3.
4. WHEN a User completes a Session, THE Backend SHALL increase the User's Trust_Score by 5.
5. WHEN a User receives positive feedback, THE Backend SHALL increase the User's Trust_Score by 2.
6. WHEN a User ghosts a scheduled Session, THE Backend SHALL decrease the User's Trust_Score by 15.
7. WHEN a User fails to attend a scheduled Session (no-show), THE Backend SHALL decrease the User's Trust_Score by 10.
8. WHEN a User ignores a match request beyond the response window, THE Backend SHALL decrease the User's Trust_Score by 5.
9. WHEN a User is reported by another User, THE Backend SHALL decrease the reported User's Trust_Score by 5.
10. WHEN a User is suspended by an Admin_User, THE Backend SHALL decrease the User's Trust_Score by 20.
11. WHEN a User accumulates 3 ghost events within a 30-day window, THE Backend SHALL place the User in a 7-day Cooldown period.
12. IF a User's Trust_Score falls below 10, THEN THE Backend SHALL automatically ban the User from the Platform.

### Requirement 8: Session Management

**User Story:** As a matched user, I want to schedule and track skill exchange sessions, so that I can organize my learning and teaching activities.

#### Acceptance Criteria

1. WHEN a matched User schedules a Session, THE Backend SHALL create a session record with the proposed time and associated Match.
2. WHEN a User requests their session list, THE Backend SHALL return all Sessions associated with that User.
3. WHEN a Session status changes (scheduled, in-progress, completed, cancelled), THE Backend SHALL update the session record accordingly.
4. WHEN a User adds notes to a completed Session, THE Backend SHALL store the notes in the session_notes table associated with the Session and User.
5. WHEN a Session is marked as completed by both participants, THE Backend SHALL record a reputation event for both Users.

### Requirement 9: Real-Time Chat

**User Story:** As a matched user, I want to communicate with my match in real time, so that we can coordinate our skill exchange.

#### Acceptance Criteria

1. WHEN a Match is created, THE Backend SHALL create a chat_room record associated with the Match.
2. WHILE a User is connected to the Socket_Namespace, THE Backend SHALL authenticate the connection using JWT middleware.
3. WHEN a User joins a chat room, THE Backend SHALL verify that the User is a participant of the associated Match before granting access.
4. WHEN a User sends a message, THE Backend SHALL sanitize the message content, persist the message to the messages table, and emit the message to all participants in the chat room.
5. WHEN a User sends a typing indicator, THE Backend SHALL broadcast the typing event to other participants in the chat room.
6. WHEN a User marks messages as read, THE Backend SHALL emit a read_receipt event to the message sender.
7. IF a Socket.IO connection error occurs, THEN THE Backend SHALL emit an error event to the affected client with a generic error description.

### Requirement 10: Community Features

**User Story:** As a user, I want to participate in topic-based communities, so that I can discuss skills and connect with other learners.

#### Acceptance Criteria

1. THE Backend SHALL provide a list of available communities when requested.
2. WHEN a User creates a post in a community, THE Backend SHALL store the post with the User's Anonymous_Username and community association.
3. WHEN a User adds a comment to a post, THE Backend SHALL store the comment associated with the post and the commenting User.
4. WHEN a User upvotes a post, THE Backend SHALL increment the post's upvote count and record the User's vote.
5. THE Backend SHALL prevent a User from upvoting the same post more than once.

### Requirement 11: Notifications and Push Messaging

**User Story:** As a user, I want to receive notifications about matches, messages, and session updates, so that I stay informed about platform activity.

#### Acceptance Criteria

1. WHEN a notification-triggering event occurs (new match request, message, session update), THE Backend SHALL create a notification record for the target User.
2. WHEN a notification is created, THE Backend SHALL send a push notification via Firebase Cloud Messaging to the target User's registered device.
3. WHEN a User requests their notification list, THE Backend SHALL return notifications ordered by creation time.
4. WHEN a User marks a notification as read, THE Backend SHALL update the notification record's read status.

### Requirement 12: User Blocking and Reporting

**User Story:** As a user, I want to block or report other users, so that I can protect myself from unwanted interactions.

#### Acceptance Criteria

1. WHEN a User blocks another User, THE Backend SHALL create a block record and immediately exclude the blocked User from the blocking User's match suggestions, chat rooms, and community interactions.
2. WHEN a User reports another User, THE Backend SHALL create a report record with the reason and decrease the reported User's Trust_Score by 5.
3. THE Backend SHALL prevent a blocked User from sending messages or match requests to the User who blocked them.
4. IF a User attempts to interact with a User who has blocked them, THEN THE Backend SHALL reject the interaction with a generic error message that does not reveal the block status.

### Requirement 13: Security Hardening

**User Story:** As a platform operator, I want the backend to implement security best practices, so that user data and platform integrity are protected.

#### Acceptance Criteria

1. THE Backend SHALL apply Helmet middleware with Content Security Policy and HTTP Strict Transport Security headers on all responses.
2. THE Backend SHALL enforce CORS with a whitelist of allowed origins.
3. THE Backend SHALL use parameterized queries for all database operations to prevent SQL injection.
4. THE Backend SHALL apply HTTP Parameter Pollution protection on all incoming requests.
5. THE Backend SHALL sanitize all user-provided input before storage or display.
6. THE Backend SHALL return generic error messages to clients without exposing internal system details, stack traces, or database structure.
7. THE Backend SHALL log all errors and security-relevant events using Winston with structured log format.
8. THE Backend SHALL prevent Insecure Direct Object Reference (IDOR) by verifying resource ownership before granting access.

### Requirement 14: GDPR Compliance and Data Deletion

**User Story:** As a user, I want to delete my account and all associated data, so that my right to data erasure is respected.

#### Acceptance Criteria

1. WHEN a User requests account deletion, THE Backend SHALL cascade-delete all associated records including profile data, skills, matches, messages, sessions, posts, comments, notifications, and tokens.
2. WHEN a User's data is deleted, THE Backend SHALL remove the data from both the primary database and any Redis caches.
3. THE Backend SHALL complete the deletion process within a single transaction to maintain data consistency.

### Requirement 15: Admin Authentication and Role-Based Access

**User Story:** As an admin user, I want to log in to the admin dashboard with role-based permissions, so that I can manage the platform according to my responsibilities.

#### Acceptance Criteria

1. WHEN an Admin_User submits valid credentials, THE Admin_Dashboard SHALL authenticate the Admin_User via NextAuth v5 and establish a session.
2. WHILE an Admin_User has the Super_Admin role, THE Admin_Dashboard SHALL grant access to all dashboard features including user CRUD, match management, moderation, reports, skills analytics, trending data, reputation outliers, audit log, and settings.
3. WHILE an Admin_User has the Moderator role, THE Admin_Dashboard SHALL grant access to user management, moderation, and reports features only.
4. WHILE an Admin_User has the Analyst role, THE Admin_Dashboard SHALL grant read-only access to the overview dashboard, skills analytics, and reputation data only.
5. IF an Admin_User attempts to access a feature outside their role permissions, THEN THE Admin_Dashboard SHALL deny access and display an authorization error.

### Requirement 16: Admin Dashboard Functionality

**User Story:** As an admin user, I want to view platform analytics, manage users, and moderate content, so that I can maintain platform health.

#### Acceptance Criteria

1. WHEN an Admin_User accesses the overview page, THE Admin_Dashboard SHALL display key platform statistics including total users, active matches, session completion rates, and report counts.
2. WHEN an Admin_User manages users, THE Admin_Dashboard SHALL provide list, view, edit, suspend, and ban operations on User records.
3. WHEN an Admin_User views reports, THE Admin_Dashboard SHALL display pending reports with reporter details, reported User details, and reason.
4. WHEN an Admin_User views skills analytics, THE Admin_Dashboard SHALL display skill popularity, category distribution, and trending skills using Recharts visualizations.
5. WHEN an Admin_User views reputation outliers, THE Admin_Dashboard SHALL display Users with Trust_Scores significantly above or below the platform average.
6. THE Admin_Dashboard SHALL record all administrative actions in the Audit_Log with the Admin_User identity, action type, target entity, and timestamp.

### Requirement 17: Admin Audit Logging

**User Story:** As a platform operator, I want all admin actions to be logged, so that I can review administrative activity for accountability.

#### Acceptance Criteria

1. WHEN an Admin_User performs a state-changing action (create, update, delete, suspend, ban), THE Backend SHALL create an Audit_Log entry with the Admin_User ID, action type, target entity type, target entity ID, and timestamp.
2. WHEN an Admin_User requests the audit log, THE Backend SHALL return Audit_Log entries filtered by date range, action type, or Admin_User.
3. THE Backend SHALL retain Audit_Log entries indefinitely and prevent modification or deletion of existing entries.

### Requirement 18: Mobile App Authentication Flow

**User Story:** As a mobile user, I want a seamless authentication experience with secure token storage, so that I can stay logged in securely.

#### Acceptance Criteria

1. WHEN the Mobile_App launches, THE Mobile_App SHALL check for a stored Refresh_Token in flutter_secure_storage and attempt silent authentication.
2. WHEN the Mobile_App receives a 401 response, THE Mobile_App SHALL attempt to refresh the Access_Token using the stored Refresh_Token before prompting re-authentication.
3. WHEN the Mobile_App successfully authenticates, THE Mobile_App SHALL store the Access_Token and Refresh_Token in flutter_secure_storage.
4. WHEN the Mobile_App user logs out, THE Mobile_App SHALL clear all stored tokens from flutter_secure_storage and notify the Backend.

### Requirement 19: Mobile App Matching Interface

**User Story:** As a mobile user, I want to browse potential matches in a card-stack interface, so that I can quickly evaluate and request skill exchanges.

#### Acceptance Criteria

1. WHEN the Mobile_App displays match suggestions, THE Mobile_App SHALL present Users in a swipeable card-stack format showing the Anonymous_Username and relevant skills.
2. WHEN the Mobile_App user swipes right on a suggestion, THE Mobile_App SHALL send a match request to the Backend.
3. WHEN the Mobile_App user swipes left on a suggestion, THE Mobile_App SHALL dismiss the suggestion without sending a request.
4. WHEN a match request is accepted, THE Mobile_App SHALL navigate the User to the chat interface for the new Match.

### Requirement 20: Mobile App Push Notifications

**User Story:** As a mobile user, I want to receive push notifications, so that I am alerted to new matches, messages, and session updates even when the app is in the background.

#### Acceptance Criteria

1. WHEN the Mobile_App is installed and the User grants notification permission, THE Mobile_App SHALL register the device token with Firebase Cloud Messaging and send the token to the Backend.
2. WHEN the Backend sends a push notification, THE Mobile_App SHALL display the notification to the User with the appropriate content and action.
3. WHEN the User taps a push notification, THE Mobile_App SHALL navigate to the relevant screen (chat, match, or session) using go_router deep linking.

### Requirement 21: Database Schema and Migrations

**User Story:** As a developer, I want the database schema managed through raw SQL migrations, so that schema changes are versioned and reproducible.

#### Acceptance Criteria

1. THE Backend SHALL manage all database schema changes through db-migrate with raw SQL migration files.
2. THE Backend SHALL define at least 20 tables covering users, recovery_keys, refresh_tokens, skills, user_teach_skills, user_learn_skills, match_requests, matches, skill_endorsements, sessions, session_notes, chat_rooms, messages, communities, posts, comments, reports, blocks, reputation_events, notifications, admin_users, and audit_log.
3. THE Backend SHALL use MySQL 8+ as the database engine with connection pooling via the mysql2 library.
4. THE Backend SHALL use parameterized queries exclusively for all database interactions.

### Requirement 22: Caching and Session Store

**User Story:** As a platform operator, I want Redis used for caching and session management, so that the platform performs efficiently under load.

#### Acceptance Criteria

1. THE Backend SHALL use Redis via the ioredis library for caching frequently accessed data.
2. THE Backend SHALL use Redis to store the JWT revocation list for invalidated Access_Tokens.
3. THE Backend SHALL use Redis as the backing store for rate limit counters.
4. WHEN cached data is invalidated by a write operation, THE Backend SHALL remove the corresponding cache entry from Redis.

### Requirement 23: Logging and Observability

**User Story:** As a platform operator, I want structured logging across the backend, so that I can monitor system health and debug issues.

#### Acceptance Criteria

1. THE Backend SHALL log all HTTP requests with method, path, status code, and response time using Winston.
2. THE Backend SHALL log all errors with stack traces, request context, and timestamp in structured JSON format.
3. THE Backend SHALL log all authentication events (login, logout, token refresh, failed attempts) with User context.
4. THE Backend SHALL log all Socket.IO connection and disconnection events with User context.
5. THE Backend SHALL separate log output by level (error, warn, info, debug) for filtering.
