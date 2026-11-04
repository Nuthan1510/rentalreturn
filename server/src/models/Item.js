import mongoose from 'mongoose';

export const CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged'];
export const CATEGORIES = ['Power Tools', 'Garden', 'Cleaning', 'Audio & Video', 'Camping', 'Ladders', 'Event Gear', 'Other'];

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    category: { type: String, required: true, enum: CATEGORIES },
    dailyRate: { type: Number, required: true, min: 0 },
    deposit: { type: Number, required: true, min: 0, default: 0 },
    condition: { type: String, enum: CONDITIONS, default: 'good' },
    // "maintenance" removes the item from bookable stock
    status: { type: String, enum: ['active', 'maintenance'], default: 'active' },
    notes: { type: String, trim: true, maxlength: 300, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
      },
    },
  }
);

export const Item = mongoose.model('Item', itemSchema);
