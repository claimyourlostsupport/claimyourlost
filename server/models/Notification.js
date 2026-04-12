import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['match'],
      default: 'match',
    },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    relatedItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
    },
    matchedItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
