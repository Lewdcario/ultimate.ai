/* eslint-disable @typescript-eslint/no-explicit-any */

import mongoose from 'mongoose';
import request from 'supertest';
import assert from 'assert';
import { expect } from 'chai';
import sinon from 'sinon';

import app from '../src/Server';
import asyncHandler from '../src/middleware/onPromise';
import errorHandler from '../src/middleware/onError';
import { Reply } from '../src/util/db';
import { Responses } from '../src/util/Constants';

import responseData from '../src/data/replies.json';
import testReplies from '../src/data/test.json';

import { fetchIntents } from '../src/util/intents';
import * as intentsModule from '../src/util/intents';

describe('Testing Suite', function() {
	this.timeout(15000);

	before(async () => {
		await mongoose.connect(process.env.MONGODB_URI!);
		mongoose.connection.on('connected', () => console.log('Mongoose is connected'));
		mongoose.connection.on('error', (err) => console.log('Mongoose connection error: ', err));
	});

	after(async () => {
		await mongoose.connection.close();
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('asyncHandler', () => {
		it('should return a function', (done) => {
			const fn = asyncHandler(() => {});
			expect(typeof fn).to.equal('function');
			done();
		});
	});

	describe('errorHandler', () => {
		it('should return a function', () => {
			const fn = errorHandler;
			expect(typeof fn).to.equal('function');
		});

		it('should return a 404 status code on not found', async () => {
			await request(app).get('/invalid-link').expect(404);
		});

		it('should capture console.error', async () => {
			const consoleSpy = sinon.spy(console, 'error');

			await request(app)
				.get('/force-error')
				.expect(() => {
					expect(consoleSpy.called).to.be.true;
					consoleSpy.restore();
				});
		});

		it('should send a 500 status code with a JSON response', async () => {
			await request(app)
				.get('/force-error')
				.expect(500)
				.expect('Content-Type', 'application/json; charset=utf-8')
				.expect((res) => {
					expect(res.body).to.have.property('errors');
					expect(res.body.errors[0].message).to.equal('Something went wrong');
				});
		});
	});

	describe('POST /getReply', () => {
		afterEach(() => {
			sinon.restore();
		});

		// Sanity check
		it('Successfully stubs fetchIntents with Sinon', async () => {
			sinon.stub(intentsModule, 'fetchIntents').returns(Promise.resolve('Subbed by Sinon') as any);
			const response = await fetchIntents(process.env.BOT_ID!, 'some_message');
			assert.equal(response, 'Subbed by Sinon');
		});

		it('Should return 400 if no body is provided', async () => {
			const res = await request(app).post('/getReply');
			expect(res.status).to.equal(400);
			expect(res.body).to.have.property('errors').that.has.lengthOf(1);
			expect(res.body.errors[0].message).to.include('botId');
		});

		it('Does not find a reply if the input sentence is incomprehensible', async () => {
			const res = await request(app)
				.post('/getReply')
				.send({ botId: process.env.BOT_ID!, message: 'AAAAAAAAAAA---!@AAAAAAAAAKSDKSJFIJI' });
			expect(res.status).to.equal(200);
			expect(res.body).to.have.property('reply').that.equals(Responses.NotFound);
		});

		it(`Returns "${Responses.NotFound}" when the message confidence is < 0.4`, async () => {
			sinon.stub(intentsModule, 'fetchIntents').callsFake(() => Promise.resolve([
				{ intent: 'some_intent', name: 'some_intent', confidence: 0.3 },
				{ intent: 'some_intent', name: 'some_intent', confidence: 0.2 }
			]));
			sinon.stub(Reply, 'findOne').resolves(null);

			const res = await request(app)
				.post('/getReply')
				.send({ botId: process.env.BOT_ID!, message: 'some_message' });

			expect(res.body).to.have.property('reply').that.equals(Responses.NotFound);
		});

		it(`Returns "${Responses.NotFound}" when no intents are returned`, async () => {
			sinon.stub(intentsModule, 'fetchIntents').callsFake(() => Promise.resolve([]));

			const res = await request(app)
				.post('/getReply')
				.send({ botId: process.env.BOT_ID!, message: 'some_message' });

			expect(res.body.reply).to.equal(Responses.NotFound);
		});

		it('selects the intent with the highest confidence', async () => {
			sinon.stub(intentsModule, 'fetchIntents').returns(Promise.resolve([
				{ intent: 'Farewell', name: 'Farewell', confidence: 0.7 },
				{ intent: 'Greeting', name: 'Greeting', confidence: 0.9 },
			]));

			sinon.stub(Reply, 'findOne').resolves({ intent: 'Greeting', reply: 'Greeting' } as any);

			const res = await request(app)
				.post('/getReply')
				.send({ botId: process.env.BOT_ID!, message: 'hello' });

			expect(res.body.reply).to.equal('Greeting');
		});

		it('uses replyDoc.reply if available', async () => {
			sinon.stub(intentsModule, 'fetchIntents').returns(Promise.resolve([
				{ name: 'some_intent', confidence: 0.9 }
			]));
			const mockReplyDoc = { intent: 'some_intent', reply: 'some_reply' };
			sinon.stub(Reply, 'findOne').resolves(mockReplyDoc as any);

			const res = await request(app)
				.post('/getReply')
				.send({ botId: process.env.BOT_ID!, message: 'some_message' });

			expect(res.body.reply).to.equal('some_reply');
		});

		it(`returns "${Responses.NotFound}" if no other options`, async () => {
			sinon.stub(Reply, 'findOne').resolves(null as any);
			sinon.stub(intentsModule, 'fetchIntents').returns(Promise.resolve([]));

			const res = await request(app)
				.post('/getReply')
				.send({ botId: process.env.BOT_ID!, message: 'ldj#*(IDSJKjsidji@' });

			expect(res.body.reply).to.equal(Responses.NotFound);
		});

		it('process.env.MONGODB_URI is filled and the database connects', async () => {
			expect(process.env.MONGODB_URI).to.not.be.undefined;
			const connection = await mongoose.connect(process.env.MONGODB_URI!);
			expect(connection).to.not.be.undefined;
			expect(mongoose.connection.readyState).to.equal(1);
		});

		// E2E test
		it('returns the correct reply for each intent', async () => {
			for (let i = 0; i < testReplies.length; i++) {
				const res = await request(app)
					.post('/getReply')
					.send({ botId: process.env.BOT_ID!, message: testReplies[i].message });

				expect(res.body.reply).to.equal(responseData[i].reply.text);
			}
		});
	});
});
