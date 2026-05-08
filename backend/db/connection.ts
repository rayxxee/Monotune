import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/monotune';

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('--- MONGODB CONNECTED ---');
    console.log(`Database: ${MONGODB_URI}`);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

export { mongoose };
