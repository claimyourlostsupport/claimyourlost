import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/claimyourlost';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 20_000,
      // Prefer IPv4 — avoids some Atlas connection issues on cloud hosts (e.g. Render).
      family: 4,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err?.message || err);
    if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
      console.error('Set MONGODB_URI in Render → Environment (same Atlas URI as local, not committed to git).');
    }
    throw err;
  }
}
