import { Router } from 'express';
import { authRequired, attachUser } from '../middleware/auth.js';
import { listCalls } from '../controllers/callController.js';

const r = Router();
r.use(authRequired, attachUser);
r.get('/', listCalls);

export default r;
