import mongoose from 'mongoose';

const itemReportSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
      index: true,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['open', 'reviewed', 'dismissed'],
      default: 'open',
    },
  },
  { timestamps: true }
);

itemReportSchema.index({ itemId: 1, reporterId: 1, createdAt: -1 });

export const ItemReport = mongoose.model('ItemReport', itemReportSchema);
