import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: 48,
      default: '',
    },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
