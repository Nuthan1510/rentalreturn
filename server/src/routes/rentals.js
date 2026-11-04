import { Router } from 'express';
import { Item } from '../models/Item.js';
import { Rental, LATE_FEE_MULTIPLIER } from '../models/Rental.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, conflict, AppError } from '../utils/AppError.js';
import { validate, validateId } from '../middleware/validate.js';
import { rentalBody, returnBody, rentalListQuery } from '../validators.js';
import { checkAvailability } from '../utils/rentalLogic.js';

const router = Router();
const POPULATE = { path: 'item', select: 'name sku category condition' };
const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get(
  '/',
  validate(rentalListQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { status, overdue, item, q } = req.validQuery;
    const filter = {};
    if (status) filter.status = { $in: status.split(',').map((s) => s.trim()) };
    if (item) filter.item = item;
    if (q) filter.customerName = new RegExp(escapeRx(q), 'i');
    if (overdue === 'true') Object.assign(filter, { status: 'active', dueDate: { $lt: new Date() } });

    const rentals = await Rental.find(filter).populate(POPULATE).sort({ dueDate: 1 });
    res.json(rentals);
  })
);

router.get(
  '/:id',
  validateId(),
  asyncHandler(async (req, res) => {
    const rental = await Rental.findById(req.params.id).populate(POPULATE);
    if (!rental) throw notFound('Rental');
    res.json(rental);
  })
);

// Create a booking — rejects overlapping bookings for the same item
router.post(
  '/',
  validate(rentalBody),
  asyncHandler(async (req, res) => {
    const item = await Item.findById(req.body.item);
    if (!item) throw notFound('Item');

    const check = await checkAvailability(item, req.body.startDate, req.body.dueDate);
    if (!check.ok) throw conflict(check.reason, check.conflict);

    const rental = await Rental.create({
      ...req.body,
      dailyRate: item.dailyRate,
      deposit: item.deposit,
      conditionOut: item.condition,
    });

    // Re-check after insert to close the check-then-insert race window.
    const clash = await Rental.findOne({
      _id: { $ne: rental._id },
      item: item._id,
      status: { $in: ['booked', 'active'] },
      startDate: { $lt: rental.dueDate },
      dueDate: { $gt: rental.startDate },
      createdAt: { $lte: rental.createdAt },
    });
    if (clash) {
      await rental.deleteOne();
      throw conflict(`${item.name} was just booked by someone else for that time`);
    }

    await rental.populate(POPULATE);
    res.status(201).json(rental);
  })
);

// Hand the item to the customer
router.patch(
  '/:id/checkout',
  validateId(),
  asyncHandler(async (req, res) => {
    const rental = await Rental.findById(req.params.id);
    if (!rental) throw notFound('Rental');
    if (rental.status !== 'booked') throw new AppError(400, `Only booked rentals can be checked out (this one is ${rental.status})`);

    const item = await Item.findById(rental.item);
    if (item?.status === 'maintenance') throw conflict(`${item.name} is in maintenance`);
    const out = await Rental.findOne({ _id: { $ne: rental._id }, item: rental.item, status: 'active' });
    if (out) throw conflict(`${item?.name || 'Item'} is still out with ${out.customerName}. It must be returned first.`);

    rental.status = 'active';
    rental.checkedOutAt = new Date();
    rental.conditionOut = item?.condition || rental.conditionOut;
    await rental.save();
    await rental.populate(POPULATE);
    res.json(rental);
  })
);

// Take the item back: calculates late fee, applies damage fee, refunds the rest of the deposit
router.patch(
  '/:id/return',
  validateId(),
  validate(returnBody),
  asyncHandler(async (req, res) => {
    const rental = await Rental.findById(req.params.id);
    if (!rental) throw notFound('Rental');
    if (rental.status !== 'active') throw new AppError(400, `Only active rentals can be returned (this one is ${rental.status})`);

    const { conditionIn, damageFee, notes } = req.body;
    const lateFee = rental.accruedLateFee; // 0 when on time
    const held = rental.depositPaid ? rental.deposit : 0;

    rental.status = 'returned';
    rental.returnedAt = new Date();
    rental.conditionIn = conditionIn;
    rental.lateFee = lateFee;
    rental.damageFee = damageFee;
    rental.depositRefund = Math.max(0, held - lateFee - damageFee);
    if (notes) rental.notes = notes;
    await rental.save();

    // Reflect the returned condition on the item; damaged items leave stock until repaired
    await Item.findByIdAndUpdate(rental.item, {
      condition: conditionIn,
      ...(conditionIn === 'damaged' ? { status: 'maintenance' } : {}),
    });

    await rental.populate(POPULATE);
    res.json(rental);
  })
);

router.patch(
  '/:id/cancel',
  validateId(),
  asyncHandler(async (req, res) => {
    const rental = await Rental.findById(req.params.id);
    if (!rental) throw notFound('Rental');
    if (rental.status !== 'booked') throw new AppError(400, 'Only bookings that have not been picked up can be cancelled');
    rental.status = 'cancelled';
    await rental.save();
    await rental.populate(POPULATE);
    res.json(rental);
  })
);

export { LATE_FEE_MULTIPLIER };
export default router;
