import { useMemo, useState } from 'react';
import { Icon, StatusBadge, ConditionMeter, Empty, Skeleton } from './ui.jsx';
import { inr, fmtDateTime, dueLabel, rentalDays } from '../utils.js';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'active', label: 'Out on rent' },
  { id: 'booked', label: 'Booked' },
  { id: 'returned', label: 'Returned' },
  { id: 'cancelled', label: 'Cancelled' },
];

const rank = (r) => (r.isOverdue ? 0 : r.status === 'active' ? 1 : r.status === 'booked' ? 2 : 3);

export default function Rentals({ rentals, loading, now, onNew, onCheckout, onReturn, onCancel }) {
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');

  const withState = useMemo(() => rentals.map((r) => ({ ...r, _key: r.isOverdue ? 'overdue' : r.status })), [rentals]);
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, t.id === 'all' ? withState.length : withState.filter((r) => r._key === t.id || (t.id === 'active' && r.isOverdue)).length])), [withState]);

  const shown = useMemo(
    () =>
      withState
        .filter((r) => (tab === 'all' ? true : tab === 'active' ? r.status === 'active' : r._key === tab))
        .filter((r) => `${r.customerName} ${r.item?.name} ${r.item?.sku} ${r.customerPhone}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => rank(a) - rank(b) || new Date(a.dueDate) - new Date(b.dueDate)),
    [withState, tab, q]
  );

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Rental register</h1>
          <p>Due dates, deposits and item condition for every rental</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNew()}><Icon name="plus" /> New booking</button>
      </header>

      <div className="toolbar">
        <label className="search">
          <Icon name="search" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer, item or phone…" aria-label="Search rentals" />
        </label>
        <div className="chips chips-scroll" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={`chip ${tab === t.id ? 'chip-on' : ''} ${t.id === 'overdue' && counts.overdue ? 'chip-bad' : ''}`} onClick={() => setTab(t.id)}>
              {t.label} <span>{counts[t.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton h={64} count={6} />
      ) : shown.length === 0 ? (
        <Empty emoji="🧾" title="No rentals here" text="Create a booking to get started." action={<button className="btn btn-primary" onClick={() => onNew()}>New booking</button>} />
      ) : (
        <div className="table-wrap">
          <table className="register">
            <thead>
              <tr>
                <th>Item</th><th>Customer</th><th>Out</th><th>Due</th><th>Deposit</th><th>Condition</th><th>Status</th><th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={r.isOverdue ? 'row-overdue' : ''}>
                  <td data-label="Item">
                    <strong>{r.item?.name}</strong>
                    <small>{r.item?.sku} · {rentalDays(r.startDate, r.dueDate)}d · {inr(r.dailyRate * rentalDays(r.startDate, r.dueDate))}</small>
                  </td>
                  <td data-label="Customer"><strong>{r.customerName}</strong><small>{r.customerPhone}</small></td>
                  <td data-label="Out">{fmtDateTime(r.startDate)}</td>
                  <td data-label="Due">
                    {fmtDateTime(r.dueDate)}
                    {r.status === 'active' && <small className={r.isOverdue ? 'txt-bad' : 'txt-warn'}>{dueLabel(r, now)}</small>}
                    {r.status === 'returned' && <small>Returned {fmtDateTime(r.returnedAt)}</small>}
                  </td>
                  <td data-label="Deposit">
                    {inr(r.deposit)}
                    <small className={r.depositPaid ? 'txt-ok' : 'txt-warn'}>
                      {r.status === 'returned' ? `Refunded ${inr(r.depositRefund)}` : r.depositPaid ? 'Paid' : 'Pending'}
                    </small>
                  </td>
                  <td data-label="Condition">
                    <ConditionMeter value={r.conditionIn || r.conditionOut} />
                    <small>{r.conditionIn ? 'on return' : 'on pickup'}</small>
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={r.isOverdue ? 'overdue' : r.status} />
                    {r.lateFee > 0 && <small className="txt-bad">Late fee {inr(r.lateFee)}</small>}
                    {r.isOverdue && <small className="txt-bad">Fee so far {inr(r.accruedLateFee)}</small>}
                  </td>
                  <td className="actions">
                    {r.status === 'booked' && (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => onCheckout(r)}>Hand over</button>
                        <button className="icon-btn" onClick={() => onCancel(r)} aria-label="Cancel booking" title="Cancel booking"><Icon name="x" size={16} /></button>
                      </>
                    )}
                    {r.status === 'active' && (
                      <button className="btn btn-sm btn-primary" onClick={() => onReturn(r)}><Icon name="undo" size={15} /> Return</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
