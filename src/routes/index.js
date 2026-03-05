import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import leadRoutes from './lead.routes.js';
import projectRoutes from './project.routes.js';
import uploadRoutes from './upload.routes.js';
import teamRoutes from './team.routes.js';
import cpUserRoutes from './cpUser.routes.js';
import cpTeamRoutes from './cpTeam.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/leads', leadRoutes);
router.use('/projects', projectRoutes);
router.use('/upload', uploadRoutes);
router.use('/teams', teamRoutes);
router.use('/cp-users', cpUserRoutes);
router.use('/cp-teams', cpTeamRoutes);

export default router;
