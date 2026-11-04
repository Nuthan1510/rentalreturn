import mongoose from 'mongoose';
import { CONDITIONS } from './Item.js';

const DAY = 24 * 60 * 60 * 1000;
export const LATE_FEE_MULTIPLIER = Number(process.env.LATE_FEE_MULTIPLIER) || 1.5;
export const OPEN_STATUSES = ['booked', 'active'];

const rentalSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    customerName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    customerPhone: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    checkedOutAt: Date,
    returnedAt: Date,
    // booked -> active (picked up) -> returned | booked -> cancelled
    status: { type: String, enum: ['booked', 'active', 'returned', 'cancelled'], default: 'booked', index: true },

    // Snapshots so later price changes never rewrite history
    dailyRate: { type: Number, required: true, min: 0 },
    deposit: { type: Number, required: true, min: 0, default: 0 },
    depositPaid: { type: Boolean, default: false },

    conditionOut: { type: String, enum: CONDITIONS, required: true },
    conditionIn: { type: String, enum: CONDITIONS },
    lateFee: { type: Number, default: 0, min: 0 },
    damageFee: { type: Number, default: 0, min: 0 },
    depositRefund: { type: Number, default: 0, min: 0 },
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
        if (ret.item && ret.item._id) ret.item = { ...ret.item };
      },
    },
  }
);

rentalSchema.index({ item: 1, startDate: 1, dueDate: 1 });

rentalSchema.virtual('days').get(function () {
  return Math.max(1, Math.ceil((this.dueDate - this.startDate) / DAY));
});
rentalSchema.virtual('baseCost').get(function () {
  return this.days * this.dailyRate;
});
// Overdue = picked up, not returned, and past the due time
rentalSchema.virtual('isOverdue').get(function () {
  return this.status === 'active' && this.dueDate.getTime() < Date.now();
});
rentalSchema.virtual('daysOverdue').get(function () {
  return this.isOverdue ? Math.max(1, Math.ceil((Date.now() - this.dueDate.getTime()) / DAY)) : 0;
});
rentalSchema.virtual('accruedLateFee').get(function () {
  return Math.round(this.daysOverdue * this.dailyRate * LATE_FEE_MULTIPLIER);
});

export const Rental = mongoose.model('Rental', rentalSchema);
