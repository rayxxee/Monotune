import mongoose, { Schema, Document } from 'mongoose';

export interface IStory extends Document {
  user_id: mongoose.Types.ObjectId;
  track_name?: string;
  artist_name?: string;
  spotify_track_id?: string;
  background_color: string;
  image_url?: string;
  expires_at: Date;
}

const StorySchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  track_name: String,
  artist_name: String,
  spotify_track_id: String,
  background_color: { type: String, default: '#000000' },
  image_url: String,
  expires_at: { type: Date, required: true },
}, { timestamps: true });

export const Story = mongoose.model<IStory>('Story', StorySchema);
