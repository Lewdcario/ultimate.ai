import { Router } from 'express';
import asyncHandler from '../middleware/onPromise';
import validateSchema from '../middleware/validate';
import { fetchIntents } from '../util/intents';
import { Intent } from '../typings/intents';
import { Reply } from '../util/db';

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
		const { botId, message } = req.body;

		const intents = await fetchIntents(botId, message);

		const highestConfidenceIntent = intents.length ? intents.reduce((prev: Intent, curr: Intent) => {
			return prev.confidence > curr.confidence ? prev : curr;
		}) : null;

		if (!highestConfidenceIntent) {
			res.json({ reply: 'Sorry, no reply found.' });
		}
		else {
			const replyDoc = await Reply.findOne({ intent: highestConfidenceIntent.name });

			if (!replyDoc) {
				const newReply = new Reply(highestConfidenceIntent);
				await newReply.save();
			}

			res.json({ reply: replyDoc?.reply || highestConfidenceIntent.name || 'Sorry, no reply found.' });
		}
	})
);

export default router;
