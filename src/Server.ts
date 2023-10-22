import 'dotenv/config';

import express, { Response as ExResponse, Request as ExRequest } from 'express';
import swaggerUi from 'swagger-ui-express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';

import errorHandler from './middleware/onError';

// Generated automatically
import { RegisterRoutes } from './routes/routes';

import { seed } from './util/db';

const app = express();

// This will conflict with the test otherwise
if (process.env.NODE_ENV !== 'test') {
	mongoose.connect(process.env.MONGODB_URI!).then(seed);
}
else {
	app.get('/force-error', (_req, _res, next) => {
		return next(new Error('This is a forced error'));
	});
}

app.use(bodyParser.json());

app.use('/docs', swaggerUi.serve, async (_req: ExRequest, res: ExResponse) => {
	// Generated automatically
	return res.send(
		swaggerUi.generateHTML(await import('./routes/swagger.json'))
	);
});

RegisterRoutes(app);

app.use(errorHandler);

export default app;
