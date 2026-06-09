import { Router } from 'express';
import { webhook } from './controller';

const router = Router();
router.post('/', webhook);

export default router;
