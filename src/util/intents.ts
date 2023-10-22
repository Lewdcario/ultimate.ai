import fetch from 'node-fetch';
import { ApiResponseSchema, Intent } from '../typings/intents';

const BASE = 'https://chat.ultimate.ai/api/backend-challenge';

const request = async (path: string, method: string, body?: object) => {
	return fetch(`${BASE}${path}`, {
		method,
		headers: {
			'Content-Type': 'application/json',
			authorization: process.env.API_KEY!
		},
		body: body && JSON.stringify(body)
	});
};

export const fetchIntents = async (botId: string, message: string): Promise<Intent[] | undefined> => {
	const response = await request('/intents', 'POST', { botId, message });
	const data = await response.json();

	const parsedData = ApiResponseSchema.parse(data);

	return parsedData.intents;
};
