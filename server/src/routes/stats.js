import { Router } from 'express';
import { Item } from '../models/Item.js';
import { Rental } from '../models/Rental.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { LATE_FEE_MULTIPLIER } from '../models/Rental.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [items, open, returned] = await Promise.all([
      Item.find(),
      Rental.find({ status: { $in: ['booked', 'active'] } }),
      Rental.find({ status: 'returned' }),
    ]);

    const active = open.filter((r) => r.status === 'active');
    const overdue = active.filter((r) => r.isOverdue);
    const upcoming = open.filter((r) => r.status === 'booked');
    const dueToday = active.filter((r) => !r.isOverdue && r.dueDate <= endOfToday);
    const maintenance = items.filter((i) => i.status === 'maintenance').length;
    const outIds = new Set(active.map((r) => r.item.toString()));
    const bookable = items.length - maintenance;

    const revenue = returned.reduce((sum, r) => sum + r.baseCost + r.lateFee + r.damageFee, 0);
    const depositsHeld = active.filter((r) => r.depositPaid).reduce((s, r) => s + r.deposit, 0);
    const lateFeesAccruing = overdue.reduce((s, r) => s + r.accruedLateFee, 0);

    const byCategory = {};
    for (const i of items) {
      byCategory[i.category] ||= { total: 0, out: 0 };
      byCategory[i.category].total += 1;
      if (outIds.has(i._id.toString())) byCategory[i.category].out += 1;
    }

    res.json({
      totalItems: items.length,
      maintenance,
      outNow: outIds.size,
      availableNow: Math.max(0, bookable - outIds.size),
      overdue: overdue.length,
      dueToday: dueToday.length,
      upcoming: upcoming.length,
      utilization: bookable ? Math.round((outIds.size / bookable) * 100) : 0,
      revenue,
      depositsHeld,
      lateFeesAccruing,
      lateFeeMultiplier: LATE_FEE_MULTIPLIER,
      byCategory,
    });
  })
);

export default router;
