import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['lost', 'found'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'misc', trim: true },
    subcategory: { type: String, default: '', trim: true },
    subcategoryCustom: { type: String, default: '', trim: true },
    petBreed: { type: String, default: '', trim: true },
    contactUrgency: { type: String, default: '', trim: true },
    image: { type: String, default: '' },
    location: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    county: { type: String, default: '', trim: true },
    country: { type: String, default: '', trim: true },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    date: { type: Date, default: Date.now },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'claimed', 'resolved'],
      default: 'open',
    },
  },
  { timestamps: true }
);

export const Item = mongoose.model('Item', itemSchema);
