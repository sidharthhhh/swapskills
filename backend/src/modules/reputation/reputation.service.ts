import { logger } from '../../config/logger';
import * as reputationModel from './reputation.model';

/**
 * Trust Score Engine
 *
 * Manages user reputation through event-based score adjustments.
 * Handles cooldown triggers and auto-ban logic.
 */

// ─── Event Type Definitions ──────────────────────────────────────────────────

export type ReputationEventType =
  | 'exchange_complete'
  | 'endorsement_received'
  | 'session_complete'
  | 'positive_feedback'
  | 'ghosting_penalty'
  | 'no_show_penalty'
  | 'ignored_request'
  | 'report_resolved'
  | 'suspended';

/**
 * Delta values for each reputation event type.
 * Positive values increase trust score, negative values decrease it.
 * Score is always capped between 0 and 100.
 */
const EVENT_DELTAS: Record<ReputationEventType, number> = {
  exchange_complete: 10,
  endorsement_received: 3,
  session_complete: 5,
  positive_feedback: 2,
  ghosting_penalty: -15,
  no_show_penalty: -10,
  ignored_request: -5,
  report_resolved: -5,
  suspended: -20,
};

// ─── Constants ───────────────────────────────────────────────────────────────

const COOLDOWN_THRESHOLD = 3;        // Number of ghost events to trigger cooldown
const COOLDOWN_WINDOW_DAYS = 30;     // Window in days to count ghost events
const COOLDOWN_DURATION_DAYS = 7;    // Duration of cooldown in days
const AUTO_BAN_THRESHOLD = 10;       // Score below which user is auto-banned

// ─── Core Service Function ───────────────────────────────────────────────────

export interface ReputationResult {
  userId: number;
  eventType: ReputationEventType;
  delta: number;
  newScore: number;
  action?: 'banned' | 'cooldown';
}

/**
 * Apply a reputation event to a user.
 *
 * 1. Looks up the delta for the event type
 * 2. Updates the user's trust_score (capped between 0 and 100)
 * 3. Records the event in reputation_events table
 * 4. Checks if score < 10 → auto-ban
 * 5. If ghosting_penalty, checks recent ghost count → cooldown if >= 3 in 30 days
 *
 * @param userId - The user's database ID
 * @param eventType - The type of reputation event
 * @param note - Optional note describing the event context
 * @returns The result including new score and any action taken
 */
export async function applyReputationEvent(
  userId: number,
  eventType: ReputationEventType,
  note?: string
): Promise<ReputationResult> {
  const delta = EVENT_DELTAS[eventType];
  if (delta === undefined) {
    throw new Error(`Unknown reputation event type: ${eventType}`);
  }

  // Apply delta to trust score (clamped 0–100)
  const newScore = await reputationModel.applyDelta(userId, delta);

  // Record the event
  await reputationModel.recordEvent(userId, eventType, delta, note);

  logger.info('Reputation event applied', {
    userId,
    eventType,
    delta,
    newScore,
  });

  const result: ReputationResult = {
    userId,
    eventType,
    delta,
    newScore,
  };

  // Check auto-ban: score < 10
  if (newScore < AUTO_BAN_THRESHOLD) {
    await reputationModel.banUser(userId);
    result.action = 'banned';
    logger.warn('User auto-banned due to low trust score', {
      userId,
      newScore,
    });
    return result;
  }

  // Check cooldown trigger: 3 ghosting events in 30 days
  if (eventType === 'ghosting_penalty') {
    const ghostCount = await reputationModel.countRecentGhosts(
      userId,
      COOLDOWN_WINDOW_DAYS
    );
    if (ghostCount >= COOLDOWN_THRESHOLD) {
      await reputationModel.applyCooldown(userId, COOLDOWN_DURATION_DAYS);
      result.action = 'cooldown';
      logger.warn('User placed in cooldown due to repeated ghosting', {
        userId,
        ghostCount,
        windowDays: COOLDOWN_WINDOW_DAYS,
      });
    }
  }

  return result;
}

// ─── Query Functions ─────────────────────────────────────────────────────────

/**
 * Get a user's reputation event history.
 */
export async function getReputationHistory(
  userId: number,
  limit: number = 50,
  offset: number = 0
) {
  return reputationModel.getEventsByUserId(userId, limit, offset);
}

/**
 * Get a user's current trust score and status.
 */
export async function getUserTrustInfo(userId: number) {
  return reputationModel.getUserTrust(userId);
}
