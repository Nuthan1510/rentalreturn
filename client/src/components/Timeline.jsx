import { useMemo, useState } from 'react';
import { Icon, Skeleton } from './ui.jsx';
import { DAY, startOfDay, fmtDateTime, CATEGORY_EMOJI } from '../utils.js';

const SPAN = 14; // days visible

export default function Timeline({ items, rentals, now, loading, onBook }) {
  const [offset, setOffset] = useState(-1); // days relative to today at left edge
  const ws = useMemo(() => startOfDay(new Date(now)).getTime() + offset * DAY, [now, offset]);
  const we = ws + SPAN * DAY;
  const days = Array.from({ length: SPAN }, (_, i) => new Date(ws + i * DAY));
  const pct = (t) => ((Math.min(Math.max(t, ws), we) - ws) / (we - ws)) * 100;

  const byItem = useMemo(() => {
    const m = new Map();
    rentals.filter((r) => r.status === 'booked' || r.status === 'active').forEach((r) => {
      const k = r.item?.id || r.item?._id || r.item;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    });
    return m;
  }, [rentals]);

  const book = (e, item) => {
    if (item.status === 'maintenance') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const day = Math.floor(((e.clientX - rect.left) / rect.width) * SPAN);
    const start = new Date(ws + day * DAY + 9 * 3600000);
    if (start.getTime() < Date.now()) start.setTime(Date.now() + 3600000);
    onBook(item, start);
  };

  const todayPct = pct(now);
  const showToday = now >= ws && now <= we;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Booking timeline</h1>
          <p>Click an empty slot to book it. Overlaps are blocked automatically.</p>
        </div>
        <div className="seg">
          <button className="icon-btn" onClick={() => setOffset((o) => o - 7)} aria-label="Earlier"><Icon name="chevL" /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => setOffset(-1)}>Today</button>
          <button className="icon-btn" onClick={() => setOffset((o) => o + 7)} aria-label="Later"><Icon name="chevR" /></button>
        </div>
      </header>

      <div className="legend">
        <span><i className="lg lg-booked" /> Booked</span>
        <span><i className="lg lg-active" /> Out on rent</span>
        <span><i className="lg lg-overdue" /> Overdue</span>
        <span><i className="lg lg-maint" /> Maintenance</span>
      </div>

      {loading ? (
        <Skeleton h={300} />
      ) : (
        <div className="tl-scroll">
          <div className="tl">
            <div className="tl-row tl-header">
              <div className="tl-name" />
              <div className="tl-track">
                {days.map((d, i) => (
                  <div key={i} className={`tl-day ${startOfDay(d).getTime() === startOfDay(new Date(now)).getTime() ? 'is-today' : ''} ${[0, 6].includes(d.getDay()) ? 'is-weekend' : ''}`}>
                    <b>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</b>
                    <span>{d.getDate()}</span>
                  </div>
                ))}
              </div>
            </div>

            {items.map((item) => (
              <div className="tl-row" key={item.id}>
                <div className="tl-name">
                  <span>{CATEGORY_EMOJI[item.category]}</span>
                  <div><strong>{item.name}</strong><small>{item.sku}</small></div>
                </div>
                <div
                  className={`tl-track tl-clickable ${item.status === 'maintenance' ? 'tl-maint' : ''}`}
                  onClick={(e) => book(e, item)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Book ${item.name}`}
                  onKeyDown={(e) => e.key === 'Enter' && item.status !== 'maintenance' && onBook(item)}
                >
                  {days.map((_, i) => <div key={i} className="tl-cell" style={{ left: `${(i / SPAN) * 100}%`, width: `${100 / SPAN}%` }} />)}
                  {showToday && <div className="tl-now" style={{ left: `${todayPct}%` }} />}
                  {item.status === 'maintenance' && <span className="tl-maint-label">🛠 In maintenance</span>}
                  {(byItem.get(item.id) || []).map((r) => {
                    const start = new Date(r.startDate).getTime();
                    const due = new Date(r.dueDate).getTime();
                    const end = r.isOverdue ? Math.max(due, now) : due;
                    if (end < ws || start > we) return null;
                    const left = pct(start);
                    const width = Math.max(1.6, pct(end) - left);
                    const dueW = r.isOverdue ? pct(due) - left : width;
                    return (
                      <div
                        key={r.id}
                        className={`tl-bar ${r.isOverdue ? 'overdue' : r.status}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        onClick={(e) => e.stopPropagation()}
                        title={`${r.customerName}\n${fmtDateTime(r.startDate)} → ${fmtDateTime(r.dueDate)}${r.isOverdue ? '\nOVERDUE' : ''}`}
                      >
                        {r.isOverdue && <i className="tl-late" style={{ left: `${(dueW / width) * 100}%` }} />}
                        <span>{r.customerName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
