import { AdminRole } from './auth';

export const FEATURES = [
  'overview',
  'users',
  'matches',
  'moderation',
  'reports',
  'skills',
  'reputation',
  'audit-log',
  'settings',
] as const;

export type Feature = (typeof FEATURES)[number];

export const ROLE_PERMISSIONS: Record<AdminRole, Feature[]> = {
  super_admin: ['overview', 'users', 'matches', 'moderation', 'reports', 'skills', 'reputation', 'audit-log', 'settings'],
  moderator: ['overview', 'users', 'moderation', 'reports'],
  analyst: ['overview', 'skills', 'reputation'],
};

export function hasAccess(role: AdminRole, feature: Feature): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms.includes(feature);
}

export function getAccessibleFeatures(role: AdminRole): Feature[] {
  return ROLE_PERMISSIONS[role];
}
