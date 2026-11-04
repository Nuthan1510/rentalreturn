import { z } from 'zod';
import { CATEGORIES, CONDITIONS } from './models/Item.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const MAX_DAYS = 90;

export const itemBody = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters').max(80),
  sku: z
    .string({ required_error: 'SKU is required' })
    .trim()
    .min(2, 'SKU must be at least 2 characters')
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, 'SKU may only contain letters, numbers and dashes'),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Pick a valid category' }) }),
  dailyRate: z.coerce.number({ invalid_type_error: 'Daily rate must be a number' }).min(0, 'Rate cannot be negative').max(100000),
  deposit: z.coerce.number({ invalid_type_error: 'Deposit must be a number' }).min(0, 'Deposit cannot be negative').max(1000000).default(0),
  condition: z.enum(CONDITIONS).default('good'),
  status: z.enum(['active', 'maintenance']).default('active'),
  notes: z.string().trim().max(300).default(''),
});
export const itemUpdate = itemBody.partial();

export const rentalBody = z
  .object({
    item: objectId,
    customerName: z.string({ required_error: 'Customer name is required' }).trim().min(2, 'Enter the customer name').max(80),
    customerPhone: z
      .string({ required_error: 'Phone is required' })
      .trim()
      .regex(/^\+?[\d\s-]{7,16}$/, 'Enter a valid phone number'),
    startDate: z.coerce.date({ invalid_type_error: 'Pick a valid start', required_error: 'Start is required' }),
    dueDate: z.coerce.date({ invalid_type_error: 'Pick a valid due date', required_error: 'Due date is required' }),
    depositPaid: z.boolean().default(false),
    notes: z.string().trim().max(300).default(''),
  })
  .superRefine((d, ctx) => {
    if (d.dueDate <= d.startDate) {
      ctx.addIssue({ code: 'custom', path: ['dueDate'], message: 'Due date must be after the start' });
    } else if (d.dueDate - d.startDate > MAX_DAYS * 86400000) {
      ctx.addIssue({ code: 'custom', path: ['dueDate'], message: `Rentals are limited to ${MAX_DAYS} days` });
    }
    if (d.startDate.getTime() < Date.now() - 60 * 60 * 1000) {
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Start cannot be in the past' });
    }
  });

export const returnBody = z.object({
  conditionIn: z.enum(CONDITIONS, { errorMap: () => ({ message: 'Select the condition on return' }) }),
  damageFee: z.coerce.number().min(0, 'Damage fee cannot be negative').max(1000000).default(0),
  notes: z.string().trim().max(300).optional(),
});

export const availabilityQuery = z
  .object({
    start: z.coerce.date({ invalid_type_error: 'Invalid start' }),
    end: z.coerce.date({ invalid_type_error: 'Invalid end' }),
    exclude: objectId.optional(),
  })
  .refine((q) => q.end > q.start, { path: ['end'], message: 'End must be after start' });

export const rentalListQuery = z.object({
  status: z.string().optional(), // comma separated
  overdue: z.enum(['true', 'false']).optional(),
  item: objectId.optional(),
  q: z.string().trim().max(60).optional(),
});
