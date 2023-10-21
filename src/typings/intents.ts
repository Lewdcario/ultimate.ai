import { z } from 'zod';

export const IntentSchema = z.object({
	name: z.string(),
	confidence: z.number()
});

export const ApiResponseSchema = z.object({
	intents: z.array(IntentSchema)
});

export type Intent = z.infer<typeof IntentSchema>;
