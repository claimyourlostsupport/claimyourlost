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
    /** bcrypt hash; null/empty means user has not set a password yet (phone OTP is still valid). */
    passwordHash: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
