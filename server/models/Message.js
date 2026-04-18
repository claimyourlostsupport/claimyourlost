import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      default: null,
    },
    socialPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialPost',
      default: null,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

messageSchema.index({ itemId: 1, createdAt: 1 });
messageSchema.index({ socialPostId: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);
