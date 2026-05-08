import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  sender_id: mongoose.Types.ObjectId;
  receiver_id: mongoose.Types.ObjectId;
  content: string;
  spotify_track_id?: string;
  is_read: boolean;
  message_type: string;
  reaction_track_id?: string;
  track_name?: string;
  track_artist?: string;
  track_image?: string;
}

const MessageSchema = new Schema({
  sender_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  spotify_track_id: String,
  is_read: { type: Boolean, default: false },
  message_type: { type: String, default: 'text' },
  reaction_track_id: String,
  track_name: String,
  track_artist: String,
  track_image: String,
}, { timestamps: true });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
