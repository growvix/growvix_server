import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import leadRoutes from './lead.routes.js';
import projectRoutes from './project.routes.js';
import uploadRoutes from './upload.routes.js';
import teamRoutes from './team.routes.js';
import cpUserRoutes from './cpUser.routes.js';
import cpTeamRoutes from './cpTeam.routes.js';
import ivrRoutes from './ivr.routes.js';
import mailRoutes from './mail.routes.js';
import googleWebhookRoutes from './googleWebhook.routes.js';
import campaignRoutes from './campaign.routes.js';
import sourceRoutes from './source.routes.js';
import googleAdIntegrationRoutes from './googleAdIntegration.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import leadCaptureFormRoutes from './leadCaptureForm.routes.js';
import attendanceRoutes from './attendance.routes.js';
import availabilityRoutes from './availability.routes.js';


const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/leads', leadRoutes);
router.use('/projects', projectRoutes);
router.use('/upload', uploadRoutes);
router.use('/teams', teamRoutes);
router.use('/cp-users', cpUserRoutes);
router.use('/cp-teams', cpTeamRoutes);
router.use('/ivr-call', ivrRoutes);
router.use('/mail', mailRoutes);
router.use('/webhooks', googleWebhookRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/sources', sourceRoutes);
router.use('/google-ads-integration', googleAdIntegrationRoutes);
router.use('/lead-capture-configs', leadCaptureFormRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/availability', availabilityRoutes);

export default router;
