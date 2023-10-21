import { Router } from 'express';

const router = Router();

if (process.env.NODE_ENV === 'test') {
	router.get('/force-error', (req, res, next) => {
		next(new Error('This is a forced error'));
	});
}

export default router;