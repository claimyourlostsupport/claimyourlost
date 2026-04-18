import mongoose from 'mongoose';

const socialPostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    country: { type: String, default: '', trim: true },
    mediaUrl: { type: String, required: true, trim: true },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    imagePublicId: { type: String, default: '', trim: true },
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        value: {
          type: String,
          enum: ['like', 'dislike'],
          required: true,
        },
      },
    ],
    likesCount: { type: Number, default: 0 },
    dislikesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

socialPostSchema.index({ createdAt: -1 });

export const SocialPost = mongoose.model('SocialPost', socialPostSchema);
