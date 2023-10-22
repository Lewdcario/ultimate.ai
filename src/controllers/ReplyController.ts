import { Body, Controller, Post, Route, Middlewares } from 'tsoa';
import validateSchema from '../middleware/validate';
import { fetchIntents } from '../util/intents';
import { Intent } from '../typings/intents';
import { Reply } from '../util/db';
import { Responses } from '../util/Constants';

const getReplySchema = {
	type: 'object',
	properties: {
		botId: { type: 'string' },
		message: { type: 'string' }
	},
	required: ['botId', 'message']
};

interface GetReplyRequestBody {
	botId: string;
	message: string;
}

@Route('getReply')
@Middlewares([validateSchema(getReplySchema)])
export class GetReplyController extends Controller {
	@Post()
	async getReply(@Body() body: GetReplyRequestBody) {
		const intents = await fetchIntents(body.botId, body.message);

		if (!intents?.length) {
			return { reply: Responses.NotFound };
		}

		// This wasn't asked for, but I assumed it
		if (intents.every((intent: Intent) => intent.confidence < 0.4)) {
			return { reply: Responses.NotFound };
		}

		const highestConfidenceIntent = intents.length ? intents.reduce((prev: Intent, curr: Intent) => {
			return prev.confidence > curr.confidence ? prev : curr;
		}) : null;

		if (!highestConfidenceIntent) {
			return { reply: Responses.NotFound };
		}

		const replyDoc = await Reply.findOne({ intent: highestConfidenceIntent.name });

		return { reply: replyDoc?.reply || Responses.NotFound };
	}
}
