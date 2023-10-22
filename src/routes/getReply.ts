import { Router } from 'express';
import asyncHandler from '../middleware/onPromise';
import validateSchema from '../middleware/validate';
import { fetchIntents } from '../util/intents';
import { Intent } from '../typings/intents';
import { Reply } from '../util/db';
import { Responses } from '../util/Constants';

const router = Router();

const getReplySchema = {
	type: 'object',
	properties: {
		botId: { type: 'string' },
		message: { type: 'string' }
	},
	required: ['botId', 'message']
};

router.post(
	'/getReply',
	validateSchema(getReplySchema),
	asyncHandler(async (req, res) => {
		const { botId: botID, message } = req.body;

		const intents = await fetchIntents(botID, message);

		if (!intents?.length) {
			res.json({ reply: Responses.NotFound });
			return;
		}

		// This wasn't asked for, but I assumed it
		if (intents.every((intent: Intent) => intent.confidence < 0.4)) {
			res.json({ reply: Responses.NotFound });
			return;
		}

		const highestConfidenceIntent = intents.length ? intents.reduce((prev: Intent, curr: Intent) => {
			return prev.confidence > curr.confidence ? prev : curr;
		}) : null;

		if (!highestConfidenceIntent) {
			res.json({ reply: Responses.NotFound });
			return;
		}

		const replyDoc = await Reply.findOne({ intent: highestConfidenceIntent.name });

		res.json({ reply: replyDoc?.reply || Responses.NotFound });
	})
);

export default router;
