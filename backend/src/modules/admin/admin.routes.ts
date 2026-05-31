import { Router } from 'express';
import { adminAuth } from '../../middlewares/adminAuth';
import * as adminController from './admin.controller';

const router = Router();

// ─── Auth (no adminAuth middleware on login) ──────────────────────────────────
router.post('/auth/login', adminController.login);

// All routes below require admin authentication
router.use(adminAuth);

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard/stats', adminController.getDashboardStats);

// ─── User Management ──────────────────────────────────────────────────────────
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetail);
router.put('/users/:id/status', adminController.updateUserStatus);

// ─── Match Management ─────────────────────────────────────────────────────────
router.get('/matches', adminController.getMatches);
router.get('/matches/:id', adminController.getMatchDetail);

// ─── Report Management ────────────────────────────────────────────────────────
router.get('/reports', adminController.getReports);
router.get('/reports/:id', adminController.getReportDetail);
router.put('/reports/:id', adminController.resolveReport);

// ─── Post Management ──────────────────────────────────────────────────────────
router.get('/posts', adminController.getPosts);
router.delete('/posts/:id', adminController.removePost);

// ─── Skills Management ────────────────────────────────────────────────────────
router.post('/skills', adminController.addSkill);
router.delete('/skills/:id', adminController.deleteSkill);
router.get('/skills/analytics', adminController.getSkillsAnalytics);
router.get('/skills/trending', adminController.getTrendingSkills);

// ─── Reputation Outliers ──────────────────────────────────────────────────────
router.get('/reputation/outliers', adminController.getReputationOutliers);

// ─── Audit Log ────────────────────────────────────────────────────────────────
router.get('/audit-log', adminController.getAuditLog);

export default router;
