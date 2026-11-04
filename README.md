# RentalReturn

Small equipment rental tracking. Rental businesses need to track item availability, customer bookings, deposits, and returns. RentalReturn is a rental register with due dates and item condition that **prevents double booking** and **flags overdue returns**.

**Stack:** React UI · Node.js + Express REST API · MongoDB (Mongoose) · input validation (Zod) · centralized error handling · responsive design · 3D hero scene (three.js / react-three-fiber)

## Requirement checklist

| Requirement | Where it lives |
|---|---|
| Track item availability | `GET /api/items` computes live availability (`available / rented / overdue / maintenance`) and shows the next booking. UI: Inventory page + Timeline |
| Customer bookings | `POST /api/rentals`, booking modal with live availability check |
| Deposits | Each rental snapshots the item deposit, tracks `depositPaid`, and calculates the refund on return |
| Returns | `PATCH /api/rentals/:id/return` records condition, late fee, damage fee, deposit refund |
| Rental register with due dates | Register page: sortable/filterable table with due countdowns |
| Item condition | `excellent / good / fair / poor / damaged` recorded at pickup and on return; damaged items auto-move to maintenance |
| **Prevent double booking** | `utils/rentalLogic.js` - overlap rule + post-insert race re-check (see below) |
| **Flag overdue returns** | `Rental.isOverdue` virtual (picked up, not returned, past due) + dashboard alerts, red timeline bars, sidebar badge, late-fee calculation |
| React UI | `client/src` |
| Node + Express REST API | `server/src` |
| MongoDB persistence | Mongoose models `Item`, `Rental` |
| Input validation | Zod schemas in `server/src/validators.js` (server) and inline checks in the forms (client) |
| Error handling | `middleware/errorHandler.js` maps Zod, Mongoose, duplicate-key and custom errors to clean JSON; the UI shows field-level and toast errors |
| Responsive design | Sidebar becomes a bottom nav on phones, the register table becomes stacked cards, modals become bottom sheets |

## Run it

Requires Node 18+.

```bash
# 1. install everything once
npm install
npm run setup

# 2. configure the database
cp server/.env.example server/.env
#    Edit server/.env and set MONGODB_URI, e.g.
#    mongodb://127.0.0.1:27017/rentalreturn        (local MongoDB)
#    mongodb+srv://<user>:<pass>@<cluster>/rentalreturn   (MongoDB Atlas, free tier)

# 3. start API (port 5000) + React dev server (port 5173)
npm run dev
```

Open <http://localhost:5173>. The database is seeded with 12 items and 11 rentals (including two overdue ones) the first time it is empty. Set `SEED=false` to disable that.

If you leave `MONGODB_URI` empty, the server tries to start a temporary in-memory MongoDB (`mongodb-memory-server`). That needs internet access to download a MongoDB binary the first time, and data resets on restart. For your submission, use a real `MONGODB_URI`.

Production style (one server serves the built React app): `npm start`

## How double booking is prevented

Two bookings for the same item conflict when their time ranges overlap:

```
existing.startDate < new.dueDate  AND  existing.dueDate > new.startDate
```

- Checked on the server in `POST /api/rentals` (the UI cannot bypass it) and returned as `409 Conflict` with the clashing booking.
- Back-to-back bookings are allowed (one ends exactly when the next starts).
- An item that was picked up and is **overdue** blocks all new bookings until it is returned, because it is physically out.
- Items in **maintenance** cannot be booked.
- A re-check after insert deletes the new booking if a concurrent request won the race.
- The booking form calls `GET /api/items/:id/availability` as you type, so users see a conflict before they submit.

## Overdue and fees

- `isOverdue = status === 'active' && dueDate < now`, computed on read so it is always current. The client also refreshes every 60 s.
- Late fee = days overdue (rounded up) × daily rate × `LATE_FEE_MULTIPLIER` (default 1.5).
- On return: `refund = max(0, deposit paid − late fee − damage fee)`. Any shortfall is shown as "customer still owes".

## Rental lifecycle

```
booked ──checkout──▶ active ──return──▶ returned
   └──cancel──▶ cancelled
```

## REST API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health and DB status |
| GET | `/api/items` | All items with live availability |
| GET | `/api/items/:id` | One item |
| GET | `/api/items/:id/availability?start=&end=` | Would this booking clash? |
| POST | `/api/items` | Add item |
| PUT | `/api/items/:id` | Edit item or set maintenance |
| DELETE | `/api/items/:id` | Delete (blocked if open bookings) |
| GET | `/api/rentals?status=&overdue=true&q=&item=` | Rental register |
| POST | `/api/rentals` | Create booking (409 on overlap) |
| PATCH | `/api/rentals/:id/checkout` | Hand item to customer |
| PATCH | `/api/rentals/:id/return` | Take return `{conditionIn, damageFee, notes}` |
| PATCH | `/api/rentals/:id/cancel` | Cancel an un-collected booking |
| GET | `/api/stats` | Dashboard numbers |

Errors always look like `{ "error": { "status": 400, "message": "...", "details": [{ "field": "...", "message": "..." }] } }`.

Status codes: `400` validation, `404` not found, `409` conflict (double booking, duplicate SKU, delete blocked), `500` unexpected.

## Project structure

```
rentalreturn/
├── server/src/
│   ├── index.js              app, DB connection, seeding, static serving
│   ├── models/               Item.js, Rental.js (virtuals: isOverdue, accruedLateFee…)
│   ├── routes/               items.js, rentals.js, stats.js
│   ├── middleware/           validate.js, errorHandler.js
│   ├── utils/                rentalLogic.js (double-booking guard), seed.js, AppError.js
│   └── validators.js         Zod schemas
└── client/src/
    ├── App.jsx               shell, data loading, modals
    ├── api.js                fetch wrapper + ApiError
    └── components/           Dashboard, Inventory, Rentals, Timeline,
                              BookingModal, ItemModal, ReturnModal, Hero3D, ui
```

## UI/UX notes

- **3D:** an interactive three.js scene on the dashboard (drill, toolbox, drum, return-loop knot). It follows the pointer, floats, and spins when clicked. Inventory cards tilt in 3D with a light glare. Honors `prefers-reduced-motion` and falls back gracefully without WebGL.
- **Timeline:** 14-day Gantt per item; click an empty slot to book. Overdue bars extend to now with a striped "late" section and a live "now" line.
- Live availability feedback in the booking form, a fee preview on returns, inline field errors, toasts, skeleton loaders, empty states, keyboard-accessible modals (Esc to close, focus handling).

## Ideas to extend

Authentication, SMS/email reminders for due dates, item photos, damage-photo upload, payment gateway for deposits, CSV export of the register.
