import { Router } from 'express';
import { Item } from '../models/Item.js';
import { Rental, OPEN_STATUSES } from '../models/Rental.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, conflict } from '../utils/AppError.js';
import { validate, validateId } from '../middleware/validate.js';
import { itemBody, itemUpdate, availabilityQuery } from '../validators.js';
import { checkAvailability } from '../utils/rentalLogic.js';

const router = Router();

// Live availability: maintenance | overdue | rented | available (+ next booking)
async function withAvailability(items) {
  const open = await Rental.find({ item: { $in: items.map((i) => i._id) }, status: { $in: OPEN_STATUSES } }).sort({ startDate: 1 });
  const byItem = new Map();
  for (const r of open) {
    const k = r.item.toString();
    if (!byItem.has(k)) byItem.set(k, []);
    byItem.get(k).push(r);
  }
  return items.map((item) => {
    const rentals = byItem.get(item._id.toString()) || [];
    const active = rentals.find((r) => r.status === 'active');
    const next = rentals.find((r) => r.status === 'booked');
    let availability = 'available';
    if (item.status === 'maintenance') availability = 'maintenance';
    else if (active?.isOverdue) availability = 'overdue';
    else if (active) availability = 'rented';
    return {
      ...item.toJSON(),
      availability,
      currentRental: active
        ? { id: active.id, customerName: active.customerName, dueDate: active.dueDate, isOverdue: active.isOverdue }
        : null,
      nextBooking: next ? { id: next.id, customerName: next.customerName, startDate: next.startDate, dueDate: next.dueDate } : null,
    };
  });
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await Item.find().sort({ category: 1, name: 1 });
    res.json(await withAvailability(items));
  })
);

router.get(
  '/:id',
  validateId(),
  asyncHandler(async (req, res) => {
    const item = await Item.findById(req.params.id);
    if (!item) throw notFound('Item');
    const [full] = await withAvailability([item]);
    res.json(full);
  })
);

router.get(
  '/:id/availability',
  validateId(),
  validate(availabilityQuery, 'query'),
  asyncHandler(async (req, res) => {
    const item = await Item.findById(req.params.id);
    if (!item) throw notFound('Item');
    const { start, end, exclude } = req.validQuery;
    const result = await checkAvailability(item, start, end, exclude);
    res.json({ available: result.ok, reason: result.reason, conflict: result.conflict });
  })
);

router.post(
  '/',
  validate(itemBody),
  asyncHandler(async (req, res) => {
    const item = await Item.create(req.body);
    const [full] = await withAvailability([item]);
    res.status(201).json(full);
  })
);

router.put(
  '/:id',
  validateId(),
  validate(itemUpdate),
  asyncHandler(async (req, res) => {
    const item = await Item.findById(req.params.id);
    if (!item) throw notFound('Item');

    if (req.body.status === 'maintenance') {
      const out = await Rental.exists({ item: item._id, status: 'active' });
      if (out) throw conflict('This item is currently rented out. Take the return first, then send it to maintenance.');
    }
    item.set(req.body);
    await item.save();
    const [full] = await withAvailability([item]);
    res.json(full);
  })
);

router.delete(
  '/:id',
  validateId(),
  asyncHandler(async (req, res) => {
    const item = await Item.findById(req.params.id);
    if (!item) throw notFound('Item');
    const open = await Rental.countDocuments({ item: item._id, status: { $in: OPEN_STATUSES } });
    if (open) throw conflict(`Cannot delete: ${open} open booking(s) exist for this item. Cancel or return them first.`);
    await item.deleteOne();
    res.status(204).end();
  })
);

export default router;
