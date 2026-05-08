import mongoose, { Schema, Document } from 'mongoose';

export interface IImage extends Document {
  data: Buffer;
  contentType: string;
}

const ImageSchema: Schema = new Schema({
  data: { type: Buffer, required: true },
  contentType: { type: String, required: true }
}, {
  timestamps: true
});

export const Image = mongoose.models.Image || mongoose.model<IImage>('Image', ImageSchema);
