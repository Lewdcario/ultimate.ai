import 'dotenv/config';

import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';

import errorHandler from './middleware/onError';

import getReplyRoute from './routes/getReply';
import testErrorRoute from './routes/error';

mongoose.connect(process.env.MONGODB_URI!);

const app = express();

app.use(bodyParser.json());

app.use(getReplyRoute);
app.use(testErrorRoute);

app.use(errorHandler);

export default app;
