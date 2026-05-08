import mongoose, { Schema, Document } from 'mongoose';

export interface IFriendship extends Document {
  user_id_1: mongoose.Types.ObjectId;
  user_id_2: mongoose.Types.ObjectId;
  status: string;
  similarity_score: number;
}

const FriendshipSchema = new Schema({
  user_id_1: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  user_id_2: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status:    { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  similarity_score: { type: Number, default: 0 },
}, { timestamps: true });

FriendshipSchema.index({ user_id_1: 1, user_id_2: 1 }, { unique: true });

export const Friendship = mongoose.model<IFriendship>('Friendship', FriendshipSchema);
