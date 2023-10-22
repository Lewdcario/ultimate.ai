import mongoose from 'mongoose';
import { getObjectId } from 'mongo-seeding';
import data from '../data/replies.json';

const replySchema = new mongoose.Schema({
	intent: String,
	reply: String
});

export const Reply = mongoose.model('Reply', replySchema);

export const seed = async () => {
	await Reply.deleteMany({});
	const replies = data.map(reply => ({ intent: reply.name, reply: reply.reply.text, _id: getObjectId(reply.name) }));
	await Reply.insertMany(replies);
};
