import mongoose, { Schema, Document } from 'mongoose';

export interface IEncore extends Document {
  sender_id: mongoose.Types.ObjectId;
  receiver_id: mongoose.Types.ObjectId;
}

const EncoreSchema = new Schema({
  sender_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export const Encore = mongoose.model<IEncore>('Encore', EncoreSchema);
