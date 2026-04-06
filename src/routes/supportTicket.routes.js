import { Router } from 'express';
import { supportTicketController } from '../controllers/supportTicket.controller.js';

const router = Router();

// Support Ticket CRUD
router.post('/', supportTicketController.createTicket);
router.get('/', supportTicketController.getTickets);
router.get('/:id', supportTicketController.getTicketById);

export default router;
