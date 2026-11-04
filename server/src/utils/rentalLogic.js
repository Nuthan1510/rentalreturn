import { Rental, OPEN_STATUSES } from '../models/Rental.js';

/**
 * Double-booking guard.
 * Two bookings for the same item conflict when their time ranges overlap:
 *   existing.start < newEnd  AND  existing.due > newStart
 * An item that is picked up and past due is still physically out, so it
 * blocks every new booking until it is returned.
 */
export async function checkAvailability(item, start, end, excludeRentalId) {
  if (item.status === 'maintenance') {
    return { ok: false, reason: `${item.name} is in maintenance and cannot be booked` };
  }

  const exclude = excludeRentalId ? { _id: { $ne: excludeRentalId } } : {};

  const overdue = await Rental.findOne({
    ...exclude,
    item: item._id,
    status: 'active',
    dueDate: { $lt: new Date() },
  });
  if (overdue) {
    return {
      ok: false,
      reason: `${item.name} is overdue from ${overdue.customerName} and has not been returned yet`,
      conflict: summarize(overdue),
    };
  }

  const clash = await Rental.findOne({
    ...exclude,
    item: item._id,
    status: { $in: OPEN_STATUSES },
    startDate: { $lt: end },
    dueDate: { $gt: start },
  }).sort({ startDate: 1 });

  if (clash) {
    return {
      ok: false,
      reason: `${item.name} is already booked by ${clash.customerName} for that time`,
      conflict: summarize(clash),
    };
  }
  return { ok: true };
}

const summarize = (r) => ({
  id: r.id,
  customerName: r.customerName,
  startDate: r.startDate,
  dueDate: r.dueDate,
  status: r.status,
});
