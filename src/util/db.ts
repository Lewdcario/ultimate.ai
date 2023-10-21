import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
	intent: String,
	reply: String
});

export const Reply = mongoose.model('Reply', replySchema);