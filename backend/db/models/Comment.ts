import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  post_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  content: string;
  is_toxic: boolean;
  toxicity_score: number;
}

const CommentSchema = new Schema({
  post_id: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  is_toxic: { type: Boolean, default: false },
  toxicity_score: { type: Number, default: 0 },
}, { timestamps: true });

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
