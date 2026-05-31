import * as matchingModel from './matching.model';
import { logger } from '../../config/logger';
import { AppError } from '../../utils/AppError';

/**
 * Matching service — business logic for suggestions, requests, matches, and endorsements.
 */

// ─── Suggestions ─────────────────────────────────────────────────────────────

/**
 * Get match suggestions for a user using the complementary matching algorithm.
 * Finds users whose teach skills overlap with the requesting user's learn skills
 * AND whose learn skills overlap with the requesting user's teach skills.
 * Excludes: blocked users, users in cooldown, trust_score < 10, non-active users.
 */
export async function getSuggestions(userId: number) {
  const userTeachSkillIds = await matchingModel.getUserTeachSkillIds(userId);
  const userLearnSkillIds = await matchingModel.getUserLearnSkillIds(userId);

  if (userTeachSkillIds.length === 0 || userLearnSkillIds.length === 0) {
    return [];
  }

  const suggestions = await matchingModel.findComplementaryUsers(
    userId,
    userTeachSkillIds,
    userLearnSkillIds
  );

  return suggestions.map((s) => ({
    userId: s.id,
    uid: s.uid,
    username: s.username,
    trustScore: s.trust_score,
    teachSkillId: s.teach_skill_id,
    teachSkillName: s.teach_skill_name,
    learnSkillId: s.learn_skill_id,
    learnSkillName: s.learn_skill_name,
  }));
}

// ─── Match Requests ──────────────────────────────────────────────────────────

/**
 * Send a match request to another user.
 */
export async function sendMatchRequest(
  senderId: number,
  receiverId: number,
  teachSkillId: number,
  learnSkillId: number
) {
  // Cannot send request to yourself
  if (senderId === receiverId) {
    throw new AppError(400, 'Cannot send a match request to yourself');
  }

  // Check if a pending request already exists
  const hasPending = await matchingModel.hasPendingRequest(senderId, receiverId);
  if (hasPending) {
    throw new AppError(409, 'A pending match request already exists for this user');
  }

  const result = await matchingModel.createMatchRequest(
    senderId,
    receiverId,
    teachSkillId,
    learnSkillId
  );

  logger.info('Match request sent', { senderId, receiverId, requestId: result.insertId });

  return { id: result.insertId, status: 'pending' };
}

/**
 * Get pending match requests for the authenticated user (as receiver).
 */
export async function getPendingRequests(userId: number) {
  const requests = await matchingModel.getPendingRequestsForUser(userId);

  return requests.map((r) => ({
    id: r.id,
    senderId: r.sender_id,
    senderUsername: r.sender_username,
    teachSkillId: r.teach_skill_id,
    teachSkillName: r.teach_skill_name,
    learnSkillId: r.learn_skill_id,
    learnSkillName: r.learn_skill_name,
    status: r.status,
    createdAt: r.created_at,
  }));
}

/**
 * Accept or reject a match request.
 * On accept: creates a Match record + chat_room in a transaction.
 */
export async function handleMatchRequestAction(
  userId: number,
  requestId: number,
  action: 'accept' | 'reject'
) {
  const request = await matchingModel.getMatchRequestById(requestId);

  if (!request) {
    throw new AppError(404, 'Match request not found');
  }

  // Only the receiver can accept/reject
  if (request.receiver_id !== userId) {
    throw new AppError(403, 'You can only respond to requests sent to you');
  }

  // Must be in pending state
  if (request.status !== 'pending') {
    throw new AppError(400, `Request has already been ${request.status}`);
  }

  if (action === 'reject') {
    await matchingModel.updateMatchRequestStatus(requestId, 'rejected');
    logger.info('Match request rejected', { requestId, userId });
    return { id: requestId, status: 'rejected' };
  }

  // Accept: update request status, create match + chat_room
  await matchingModel.updateMatchRequestStatus(requestId, 'accepted');

  // Create match: receiver accepts, so:
  // user_a = sender (teaches teach_skill_id to receiver)
  // user_b = receiver (teaches learn_skill_id to sender)
  // skill_a_teaches_b = teach_skill_id (what sender teaches receiver)
  // skill_b_teaches_a = learn_skill_id (what receiver teaches sender)
  const matchId = await matchingModel.createMatchWithChatRoom(
    request.sender_id,
    request.receiver_id,
    request.teach_skill_id,
    request.learn_skill_id
  );

  logger.info('Match created', { matchId, requestId, userId });

  return { id: requestId, status: 'accepted', matchId };
}

// ─── Active Matches ──────────────────────────────────────────────────────────

/**
 * Get all active matches for the authenticated user.
 */
export async function getActiveMatches(userId: number) {
  const matches = await matchingModel.getActiveMatchesForUser(userId);

  return matches.map((m) => ({
    id: m.id,
    userAId: m.user_a_id,
    userBId: m.user_b_id,
    userAUsername: m.user_a_username,
    userBUsername: m.user_b_username,
    skillATeachesB: m.skill_a_teaches_b,
    skillBTeachesA: m.skill_b_teaches_a,
    skillAName: m.skill_a_name,
    skillBName: m.skill_b_name,
    status: m.status,
    sessionsA: m.sessions_a,
    sessionsB: m.sessions_b,
    createdAt: m.created_at,
  }));
}

/**
 * Get match detail by ID. Verifies the user is a participant.
 */
export async function getMatchDetail(userId: number, matchId: number) {
  const match = await matchingModel.getMatchById(matchId);

  if (!match) {
    throw new AppError(404, 'Match not found');
  }

  // IDOR prevention: only participants can view match details
  if (match.user_a_id !== userId && match.user_b_id !== userId) {
    throw new AppError(403, 'Access denied');
  }

  return {
    id: match.id,
    userAId: match.user_a_id,
    userBId: match.user_b_id,
    userAUsername: match.user_a_username,
    userBUsername: match.user_b_username,
    skillATeachesB: match.skill_a_teaches_b,
    skillBTeachesA: match.skill_b_teaches_a,
    skillAName: match.skill_a_name,
    skillBName: match.skill_b_name,
    status: match.status,
    sessionsA: match.sessions_a,
    sessionsB: match.sessions_b,
    createdAt: match.created_at,
  };
}

// ─── Complete Match ──────────────────────────────────────────────────────────

/**
 * Mark a match as completed. Only participants can complete.
 */
export async function completeMatch(userId: number, matchId: number) {
  const match = await matchingModel.getMatchById(matchId);

  if (!match) {
    throw new AppError(404, 'Match not found');
  }

  // IDOR prevention
  if (match.user_a_id !== userId && match.user_b_id !== userId) {
    throw new AppError(403, 'Access denied');
  }

  if (match.status !== 'active') {
    throw new AppError(400, `Match is already ${match.status}`);
  }

  await matchingModel.updateMatchStatus(matchId, 'completed');
  logger.info('Match completed', { matchId, userId });

  return { id: matchId, status: 'completed' };
}

// ─── Endorse Partner ─────────────────────────────────────────────────────────

/**
 * Endorse a partner after match completion.
 * Only allowed after the match is completed.
 * Each user can only endorse once per match.
 */
export async function endorsePartner(
  userId: number,
  matchId: number,
  skillId: number,
  rating: number
) {
  const match = await matchingModel.getMatchById(matchId);

  if (!match) {
    throw new AppError(404, 'Match not found');
  }

  // IDOR prevention
  if (match.user_a_id !== userId && match.user_b_id !== userId) {
    throw new AppError(403, 'Access denied');
  }

  // Must be completed to endorse
  if (match.status !== 'completed') {
    throw new AppError(400, 'Can only endorse after match is completed');
  }

  // Determine the partner (endorsed user)
  const endorsedId = match.user_a_id === userId ? match.user_b_id : match.user_a_id;

  // Check if already endorsed
  const alreadyEndorsed = await matchingModel.hasEndorsed(userId, endorsedId, matchId);
  if (alreadyEndorsed) {
    throw new AppError(409, 'You have already endorsed this partner for this match');
  }

  await matchingModel.createEndorsement(userId, endorsedId, skillId, matchId, rating);
  logger.info('Partner endorsed', { endorserId: userId, endorsedId, matchId, skillId, rating });

  return { matchId, endorsedId, skillId, rating };
}
