import mongoose, { Schema, Document } from 'mongoose';

export interface IBlock extends Document {
  blocker_id: mongoose.Types.ObjectId;
  blocked_id: mongoose.Types.ObjectId;
}

const BlockSchema = new Schema({
  blocker_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  blocked_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

BlockSchema.index({ blocker_id: 1, blocked_id: 1 }, { unique: true });

export const Block = mongoose.model<IBlock>('Block', BlockSchema);
