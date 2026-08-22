import { Router } from 'express';
import { contrattiController } from '../controllers/contrattiController';

const router = Router();

router.get('/', contrattiController.getAll);
router.get('/:id', contrattiController.getById);
router.post('/', contrattiController.create);
router.put('/:id', contrattiController.update);
router.delete('/:id', contrattiController.delete);

export default router;