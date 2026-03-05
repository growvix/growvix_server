import { Router } from 'express';
import { cpTeamController } from '../controllers/cpTeam.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Protect all routes
router.use(protect);

/**
 * @swagger
 * /api/cp-teams:
 *   get:
 *     summary: Get all CP teams
 *     tags: [CP Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *         description: Filter by organization
 *     responses:
 *       200:
 *         description: CP Teams retrieved
 */
router.get('/', cpTeamController.getAllCpTeams);

/**
 * @swagger
 * /api/cp-teams/users:
 *   get:
 *     summary: Get all CP users with team assignments
 *     tags: [CP Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CP Users with teams retrieved
 */
router.get('/users', cpTeamController.getAllCpUsersWithTeams);

/**
 * @swagger
 * /api/cp-teams/{id}:
 *   get:
 *     summary: Get CP team by ID with member details
 *     tags: [CP Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CP Team retrieved
 *       404:
 *         description: CP Team not found
 */
router.get('/:id', cpTeamController.getCpTeamById);

/**
 * @swagger
 * /api/cp-teams:
 *   post:
 *     summary: Create a new CP team
 *     tags: [CP Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: CP Team created successfully
 */
router.post('/', authorize('admin'), cpTeamController.createCpTeam);

/**
 * @swagger
 * /api/cp-teams/{id}:
 *   put:
 *     summary: Update a CP team
 *     tags: [CP Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: CP Team updated
 */
router.put('/:id', authorize('admin'), cpTeamController.updateCpTeam);

/**
 * @swagger
 * /api/cp-teams/{id}:
 *   delete:
 *     summary: Delete a CP team (soft delete)
 *     tags: [CP Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CP Team deleted
 */
router.delete('/:id', authorize('admin'), cpTeamController.deleteCpTeam);

/**
 * @swagger
 * /api/cp-teams/{id}/members:
 *   post:
 *     summary: Add members to a CP team
 *     tags: [CP Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userIds]
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Members added
 */
router.post('/:id/members', authorize('admin'), cpTeamController.addMembers);

/**
 * @swagger
 * /api/cp-teams/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a CP team
 *     tags: [CP Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 */
router.delete('/:id/members/:userId', authorize('admin'), cpTeamController.removeMember);

export default router;
