import { useMemo, useRef, useState } from 'react';
import { Icon, StatusBadge, ConditionMeter, Empty, Skeleton } from './ui.jsx';
import { inr, fmtDate, dueLabel, CATEGORIES, CATEGORY_EMOJI } from '../utils.js';

// Card with a pointer-driven 3D tilt
function TiltCard({ children, className }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el || window.matchMedia('(hover: none)').matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${(-py * 9).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(px * 11).toFixed(2)}deg`);
    el.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
    el.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
  };
  const reset = () => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };
  return (
    <article ref={ref} className={`tilt ${className}`} onMouseMove={onMove} onMouseLeave={reset}>
      <div className="tilt-glare" />
      {children}
    </article>
  );
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'rented', label: 'Rented' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'maintenance', label: 'Maintenance' },
];

export default function Inventory({ items, loading, now, onBook, onEdit, onAdd }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [filter, setFilter] = useState('all');

  const shown = useMemo(
    () =>
      items.filter(
        (i) =>
          (cat === 'All' || i.category === cat) &&
          (filter === 'all' || i.availability === filter) &&
          (`${i.name} ${i.sku}`.toLowerCase().includes(q.toLowerCase()))
      ),
    [items, q, cat, filter]
  );
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, f.id === 'all' ? items.length : items.filter((i) => i.availability === f.id).length])), [items]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Inventory</h1>
          <p>{items.length} items · live availability</p>
        </div>
        <button className="btn btn-primary" onClick={onAdd}><Icon name="plus" /> Add item</button>
      </header>

      <div className="toolbar">
        <label className="search">
          <Icon name="search" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or SKU…" aria-label="Search items" />
        </label>
        <div className="chips" role="tablist" aria-label="Availability filter">
          {FILTERS.map((f) => (
            <button key={f.id} role="tab" aria-selected={filter === f.id} className={`chip ${filter === f.id ? 'chip-on' : ''}`} onClick={() => setFilter(f.id)}>
              {f.label} <span>{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="chips chips-scroll">
        {['All', ...CATEGORIES].map((c) => (
          <button key={c} className={`chip chip-soft ${cat === c ? 'chip-on' : ''}`} onClick={() => setCat(c)}>
            {c !== 'All' && CATEGORY_EMOJI[c]} {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="cards"><Skeleton h={250} count={6} /></div>
      ) : shown.length === 0 ? (
        <Empty emoji="🔍" title="No items match" text="Try a different search or filter." />
      ) : (
        <div className="cards">
          {shown.map((i) => {
            const bookable = i.availability !== 'maintenance';
            return (
              <TiltCard key={i.id} className={`item item-${i.availability}`}>
                <div className="item-top">
                  <span className="item-emoji">{CATEGORY_EMOJI[i.category]}</span>
                  <StatusBadge status={i.availability} />
                </div>
                <h3>{i.name}</h3>
                <p className="sku">{i.sku} · {i.category}</p>
                <div className="item-prices">
                  <div><b>{inr(i.dailyRate)}</b><span>per day</span></div>
                  <div><b>{inr(i.deposit)}</b><span>deposit</span></div>
                </div>
                <ConditionMeter value={i.condition} />
                <div className="item-note">
                  {i.currentRental ? (
                    <span className={i.currentRental.isOverdue ? 'txt-bad' : ''}>
                      <Icon name="clock" size={14} /> {i.currentRental.customerName} · {dueLabel(i.currentRental, now)}
                    </span>
                  ) : i.nextBooking ? (
                    <span><Icon name="calendar" size={14} /> Next: {fmtDate(i.nextBooking.startDate)} · {i.nextBooking.customerName}</span>
                  ) : (
                    <span className="muted">No upcoming bookings</span>
                  )}
                </div>
                <div className="item-actions">
                  <button className="btn btn-primary btn-sm" disabled={!bookable} onClick={() => onBook(i)} title={bookable ? '' : 'In maintenance'}>
                    Book
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => onEdit(i)}><Icon name="edit" size={15} /> Edit</button>
                </div>
              </TiltCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
