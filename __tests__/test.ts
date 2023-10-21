import mongoose from 'mongoose';
import request from 'supertest';
import assert from 'assert';

import app from '../src/Server';
import asyncHandler from '../src/middleware/onPromise';
import errorHandler from '../src/middleware/onError';
import { Reply } from '../src/util/db';

import { fetchIntents } from '../src/util/intents';

jest.setTimeout(15000);

jest.mock('../src/util/intents', () => ({
	fetchIntents: jest.fn(),
}));

beforeEach(async () => {
	jest.clearAllMocks();
});

beforeAll(async () => {
	await mongoose.connect(process.env.MONGODB_URI!);
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('asyncHandler', () => {
	it('should return a function', () => {
		const fn = asyncHandler(() => {});
		expect(typeof fn).toBe('function');
	});
});

describe('errorHandler', () => {
	it('should return a function', () => {
		const fn = errorHandler;
		expect(typeof fn).toBe('function');
	});

	it('should return a 404 status code on not found', async () => {
		await request(app).get('/invalid-link').expect(404);
	});

	it('should capture console.error', async () => {
		const consoleSpy = jest.spyOn(console, 'error');

		await request(app)
			.get('/force-error')
			.expect(() => {
				expect(consoleSpy).toHaveBeenCalled();
				consoleSpy.mockRestore();
			});
	});

	it('should send a 500 status code with a JSON response', async () => {
		await request(app)
			.get('/force-error')
			.expect(500)
			.expect('Content-Type', 'application/json; charset=utf-8')
			.expect((res) => {
				expect(res.body).toHaveProperty('errors');
				expect(res.body.errors[0].message).toBe('Something went wrong');
			});
	});
});

describe('POST /getReply', () => {
	it('should return 400 if no body is provided', async () => {
		await request(app)
			.post('/getReply')
			.expect(400)
			.expect('Content-Type', 'application/json; charset=utf-8')
			.expect((res) => {
				assert(res.body.hasOwnProperty('errors'));
				assert(res.body.errors.length === 1);
				assert(res.body.errors[0].message.includes('botId'));
			});
	});

	it('Does not find a reply if the input sentence is incomprehensible', async () => {
		await request(app)
			.post('/getReply')
			.send({ botId: process.env.BOT_ID!, message: 'aasdfdgh' })
			.expect((res) => {
				assert(res.body.hasOwnProperty('reply'));
				assert(res.statusCode === 200); // TODO: Unsure if a non 4xx response is a better idea here
				assert(res.body.reply === 'Sorry, no reply found.');
			});
	});

	it('returns "Greeting" when sending the message "hi"', async () => {
		(fetchIntents as jest.Mock).mockImplementation(() => 
			Promise.resolve([
				{ name: 'Greeting', confidence: 0.9 },
			])
		);

		await request(app)
			.post('/getReply')
			.send({ botId: process.env.BOT_ID!, message: 'hi' })
			.expect((res) => {
				assert(res.body.hasOwnProperty('reply'));
				assert(res.statusCode === 200);
				assert(res.body.reply === 'Greeting');
			});
	});

	it('returns "Sorry, no reply found." when both replyDoc and highestConfidenceIntent are null|undefined', async () => {
		(fetchIntents as jest.Mock).mockImplementation(() => Promise.resolve([]));
		jest.spyOn(Reply, 'findOne').mockResolvedValue(null);

		await request(app)
			.post('/getReply')
			.send({ botId: process.env.BOT_ID!, message: 'some_message' })
			.expect((res) => {
				assert(res.body.reply === 'Sorry, no reply found.');
			});

		(fetchIntents as jest.Mock).mockImplementation(() => Promise.resolve(undefined));
		await request(app)
			.post('/getReply')
			.send({ botId: process.env.BOT_ID!, message: 'some_message' })
			.expect((res) => {
				assert(res.body.hasOwnProperty('reply'));
				assert(res.statusCode === 200);
				assert(res.body.reply === 'Sorry, no reply found.');
			});
	});

	it('returns "Sorry, no reply found." when no intents are returned', async () => {
		(fetchIntents as jest.Mock).mockImplementation(() => Promise.resolve([]));
		const response = await request(app)
			.post('/getReply')
			.send({ botId: process.env.BOT_ID!, message: 'some_message' });
		expect(response.body.reply).toBe('Sorry, no reply found.');
	});


	it('selects the intent with the highest confidence', async () => {
		(fetchIntents as jest.Mock).mockImplementation(() => 
			Promise.resolve([
				{ name: 'intent1', confidence: 0.7 },
				{ name: 'intent2', confidence: 0.9 },
			])
		);

		const response = await request(app)
			.post('/getReply')
			.send({ botId: process.env.BOT_ID!, message: 'some_message' });

		expect(fetchIntents).toHaveBeenCalled();

		expect(response.body.reply).toBe('intent2');
	});

	it('uses replyDoc.reply if available', async () => {
		(fetchIntents as jest.Mock).mockImplementation(() => 
			Promise.resolve([
				{ name: 'some_intent', confidence: 0.9 }
			])
		);

		const mockReplyDoc = { intent: 'some_intent', reply: 'some_reply' };
		jest.spyOn(Reply, 'findOne').mockResolvedValue(mockReplyDoc);

		const response = await request(app)
			.post('/getReply')
			.send({ botId: process.env.BOT_ID!, message: 'some_message' });

		expect(response.body.reply).toBe('some_reply');
	});

	it('uses highestConfidenceIntent.name if replyDoc.reply is not available', async () => {
		(fetchIntents as jest.Mock).mockReset();
		(fetchIntents as jest.Mock).mockImplementation(() => 
			Promise.resolve([
				{ name: 'Greeting', confidence: 0.9 }
			])
		);

		jest.spyOn(Reply, 'findOne').mockResolvedValue(null);

		const response = await request(app)
			.post('/getReply')
			.send({ botId: process.env.BOT_ID!, message: 'hello' });

		expect(response.body.reply).toBe('Greeting');
	});

	it('returns "Sorry, no reply found." if no other options', async () => {
		jest.spyOn(Reply, 'findOne').mockResolvedValue(null);

		(fetchIntents as jest.Mock).mockImplementation(() => 
			Promise.resolve([])
		);

		const response = await request(app)
			.post('/getReply')
			.send({ botId: process.env.BOT_ID!, message: 'ldj#*(IDSJKjsidji@' });

		expect(response.body.reply).toBe('Sorry, no reply found.');
	});
});
