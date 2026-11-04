export const CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged'];
export const CATEGORIES = ['Power Tools', 'Garden', 'Cleaning', 'Audio & Video', 'Camping', 'Ladders', 'Event Gear', 'Other'];
export const CATEGORY_EMOJI = {
  'Power Tools': '🔧',
  Garden: '🌿',
  Cleaning: '🧼',
  'Audio & Video': '🎛️',
  Camping: '⛺',
  Ladders: '🪜',
  'Event Gear': '🎪',
  Other: '📦',
};

export const DAY = 86400000;
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const inr = (n) => money.format(n || 0);

const dFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const tFmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
export const fmtDate = (d) => dFmt.format(new Date(d));
export const fmtDateTime = (d) => `${dFmt.format(new Date(d))}, ${tFmt.format(new Date(d))}`;

export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// <input type="datetime-local"> <-> ISO
export const toLocalInput = (d) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};
export const fromLocalInput = (v) => new Date(v).toISOString();

export function nextHour(offsetHours = 0) {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1 + offsetHours);
  return d;
}

// "in 3h", "2 days overdue" ...
export function dueLabel(rental, now = Date.now()) {
  const due = new Date(rental.dueDate).getTime();
  const diff = due - now;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(abs / 3600000);
  const days = Math.floor(abs / DAY);
  const text = mins < 60 ? `${mins}m` : hrs < 48 ? `${hrs}h` : `${days}d ${Math.floor((abs % DAY) / 3600000)}h`;
  return diff < 0 ? `${text} overdue` : `due in ${text}`;
}

export const rentalDays = (start, due) => Math.max(1, Math.ceil((new Date(due) - new Date(start)) / DAY));

export const STATUS_META = {
  available: { label: 'Available', tone: 'ok' },
  rented: { label: 'Rented out', tone: 'info' },
  overdue: { label: 'Overdue', tone: 'bad' },
  maintenance: { label: 'Maintenance', tone: 'warn' },
  booked: { label: 'Booked', tone: 'info' },
  active: { label: 'Out on rent', tone: 'info' },
  returned: { label: 'Returned', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
};
