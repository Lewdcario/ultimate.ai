import 'dotenv/config';

import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';

import errorHandler from './middleware/onError';

import getReplyRoute from './routes/getReply';
import testErrorRoute from './routes/error';

import { seed } from './util/db';

// This will conflict with the test otherwise
if (process.env.NODE_ENV !== 'test') {
	mongoose.connect(process.env.MONGODB_URI!).then(seed);
}

const app = express();

app.use(bodyParser.json());

app.use(getReplyRoute);
app.use(testErrorRoute);

app.use(errorHandler);

export default app;
