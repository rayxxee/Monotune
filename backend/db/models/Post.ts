import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  user_id: mongoose.Types.ObjectId;
  title: string;
  content: string;
  image_url?: string;
  spotify_track_id?: string;
  is_toxic: boolean;
  toxicity_score: number;
  upvotes: number;
  downvotes: number;
  likes_count: number;
  upvoted_by: mongoose.Types.ObjectId[];
  downvoted_by: mongoose.Types.ObjectId[];
}

const PostSchema = new Schema({
  user_id:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title:         { type: String, default: 'Untitled' },
  content:       { type: String, required: true },
  image_url:     String,
  spotify_track_id: String,
  is_toxic:      { type: Boolean, default: false },
  toxicity_score: { type: Number, default: 0 },
  upvotes:       { type: Number, default: 0 },
  downvotes:     { type: Number, default: 0 },
  likes_count:   { type: Number, default: 0 },
  upvoted_by:    [{ type: Schema.Types.ObjectId, ref: 'User' }],
  downvoted_by:  [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export const Post = mongoose.model<IPost>('Post', PostSchema);
