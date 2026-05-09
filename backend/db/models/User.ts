import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password_hash: string;
  top_artists: string[];
  liner_notes?: string;
  profile_picture?: string;
  min_similarity_threshold: number;
  is_admin: boolean;
  is_banned: boolean;
  badge?: string;
  anthem_track_id?: string;
  anthem_name?: string;
  favorite_genre?: string;
  spotify_connected: boolean;
  profile_images?: string[];
  is_verified: boolean;
  verification_token?: string;
}

const UserSchema = new Schema({
  username:    { type: String, required: true, unique: true },
  email:       { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  top_artists: { type: [String], default: [] },
  liner_notes: String,
  profile_picture: String,
  min_similarity_threshold: { type: Number, default: 0 },
  is_admin:    { type: Boolean, default: false },
  is_banned:   { type: Boolean, default: false },
  badge:       String,
  anthem_track_id: String,
  anthem_name: String,
  favorite_genre: String,
  spotify_connected: { type: Boolean, default: false },
  profile_images: { type: [String], default: [] },
  is_verified: { type: Boolean, default: false },
  verification_token: String,
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
