import { Item } from '../models/Item.js';
import { Rental } from '../models/Rental.js';

const H = 60 * 60 * 1000;
const D = 24 * H;

const ITEMS = [
  { name: 'Bosch Hammer Drill', sku: 'PT-001', category: 'Power Tools', dailyRate: 350, deposit: 1500, condition: 'good' },
  { name: 'Angle Grinder 4"', sku: 'PT-002', category: 'Power Tools', dailyRate: 250, deposit: 1000, condition: 'excellent' },
  { name: 'Jigsaw Pro', sku: 'PT-003', category: 'Power Tools', dailyRate: 300, deposit: 1200, condition: 'fair' },
  { name: 'Lawn Mower (Electric)', sku: 'GD-001', category: 'Garden', dailyRate: 500, deposit: 2500, condition: 'good' },
  { name: 'Hedge Trimmer', sku: 'GD-002', category: 'Garden', dailyRate: 280, deposit: 1200, condition: 'excellent' },
  { name: 'Pressure Washer', sku: 'CL-001', category: 'Cleaning', dailyRate: 600, deposit: 3000, condition: 'good' },
  { name: 'Wet & Dry Vacuum', sku: 'CL-002', category: 'Cleaning', dailyRate: 320, deposit: 1500, condition: 'fair' },
  { name: 'HD Projector', sku: 'AV-001', category: 'Audio & Video', dailyRate: 900, deposit: 5000, condition: 'excellent' },
  { name: 'Party Speaker 500W', sku: 'AV-002', category: 'Audio & Video', dailyRate: 750, deposit: 4000, condition: 'good' },
  { name: '4-Person Tent', sku: 'CP-001', category: 'Camping', dailyRate: 400, deposit: 2000, condition: 'good' },
  { name: 'Extension Ladder 12ft', sku: 'LD-001', category: 'Ladders', dailyRate: 200, deposit: 1000, condition: 'fair' },
  { name: 'Folding Tables (x4)', sku: 'EV-001', category: 'Event Gear', dailyRate: 450, deposit: 2000, condition: 'poor' },
];

export async function seedIfEmpty() {
  if ((await Item.countDocuments()) > 0) return false;
  const items = await Item.insertMany(ITEMS);
  const by = (sku) => items.find((i) => i.sku === sku);
  const now = Date.now();

  const mk = (sku, customerName, customerPhone, startOffset, dueOffset, status, depositPaid = true, extra = {}) => {
    const item = by(sku);
    return {
      item: item._id,
      customerName,
      customerPhone,
      startDate: new Date(now + startOffset),
      dueDate: new Date(now + dueOffset),
      status,
      depositPaid,
      dailyRate: item.dailyRate,
      deposit: item.deposit,
      conditionOut: item.condition,
      ...(status === 'active' ? { checkedOutAt: new Date(now + startOffset) } : {}),
      ...extra,
    };
  };

  await Rental.insertMany([
    // Overdue
    mk('PT-001', 'Rahul Verma', '+91 98450 11223', -4 * D, -1 * D - 3 * H, 'active'),
    mk('CL-001', 'Anita Desai', '+91 99001 44556', -3 * D, -6 * H, 'active'),
    // Out and on time / due today
    mk('GD-001', 'Karthik Rao', '+91 97410 22334', -1 * D, 5 * H, 'active'),
    mk('AV-001', 'Meera Iyer', '+91 98860 77889', -1 * D, 2 * D, 'active'),
    // Upcoming bookings
    mk('AV-002', 'Sanjay Kumar', '+91 90080 12345', 1 * D, 3 * D, 'booked', false),
    mk('CP-001', 'Divya Nair', '+91 99800 65432', 2 * D, 5 * D, 'booked'),
    mk('PT-001', 'Imran Sheikh', '+91 96320 88776', 2 * D, 4 * D, 'booked', false),
    mk('GD-002', 'Priya Shetty', '+91 98440 33221', 3 * D, 4 * D, 'booked'),
    // History
    mk('PT-002', 'Arjun Reddy', '+91 98450 99887', -9 * D, -7 * D, 'returned', true, {
      returnedAt: new Date(now - 7 * D),
      conditionIn: 'excellent',
      depositRefund: 1000,
    }),
    mk('LD-001', 'Lakshmi Murthy', '+91 98860 55443', -6 * D, -5 * D, 'returned', true, {
      returnedAt: new Date(now - 5 * D + 8 * H),
      conditionIn: 'fair',
      lateFee: 300,
      depositRefund: 700,
    }),
    mk('PT-003', 'Naveen Gowda', '+91 99020 11122', -12 * D, -10 * D, 'returned', true, {
      returnedAt: new Date(now - 10 * D),
      conditionIn: 'fair',
      depositRefund: 1200,
    }),
  ]);
  return true;
}
