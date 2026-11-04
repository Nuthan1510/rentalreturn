import { useEffect, useMemo, useState } from 'react';
import { Modal, Field, Icon, useToast } from './ui.jsx';
import { api, ApiError } from '../api.js';
import { inr, nextHour, toLocalInput, fromLocalInput, rentalDays, fmtDateTime } from '../utils.js';

export default function BookingModal({ items, preItem, preStart, onClose, onSaved }) {
  const toast = useToast();
  const bookable = useMemo(() => items.filter((i) => i.status !== 'maintenance'), [items]);
  const start0 = preStart || nextHour();
  const [form, setForm] = useState({
    item: preItem?.id || '',
    customerName: '',
    customerPhone: '',
    startDate: toLocalInput(start0),
    dueDate: toLocalInput(new Date(new Date(start0).getTime() + 86400000)),
    depositPaid: false,
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [avail, setAvail] = useState({ state: 'idle' }); // idle | checking | ok | blocked

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };
  const item = items.find((i) => i.id === form.item);

  // Live availability check (debounced) - same rule the server enforces on save
  useEffect(() => {
    if (!form.item || !form.startDate || !form.dueDate) return setAvail({ state: 'idle' });
    const s = new Date(form.startDate), d = new Date(form.dueDate);
    if (!(d > s)) return setAvail({ state: 'idle' });
    setAvail({ state: 'checking' });
    const t = setTimeout(async () => {
      try {
        const r = await api.availability(form.item, s.toISOString(), d.toISOString());
        setAvail(r.available ? { state: 'ok' } : { state: 'blocked', reason: r.reason, conflict: r.conflict });
      } catch {
        setAvail({ state: 'idle' });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [form.item, form.startDate, form.dueDate]);

  const days = form.startDate && form.dueDate && new Date(form.dueDate) > new Date(form.startDate) ? rentalDays(form.startDate, form.dueDate) : 0;
  const total = item ? days * item.dailyRate : 0;

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!form.item) er.item = 'Choose an item';
    if (form.customerName.trim().length < 2) er.customerName = 'Enter the customer name';
    if (!/^\+?[\d\s-]{7,16}$/.test(form.customerPhone.trim())) er.customerPhone = 'Enter a valid phone number';
    if (!(new Date(form.dueDate) > new Date(form.startDate))) er.dueDate = 'Due date must be after the start';
    setErrors(er);
    if (Object.keys(er).length) return;

    setSaving(true);
    try {
      const rental = await api.createRental({
        ...form,
        startDate: fromLocalInput(form.startDate),
        dueDate: fromLocalInput(form.dueDate),
      });
      toast(`Booked ${rental.item?.name} for ${rental.customerName}`);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      if (err.status === 409) setAvail({ state: 'blocked', reason: err.message, conflict: err.details });
      toast(err.message, 'bad');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="New booking" subtitle="Overlapping bookings for the same item are blocked." onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="form">
        <Field label="Equipment" error={errors.item}>
          <select value={form.item} onChange={set('item')}>
            <option value="">Select an item…</option>
            {bookable.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} · {inr(i.dailyRate)}/day{i.availability === 'overdue' ? ' (overdue - unavailable)' : i.availability === 'rented' ? ' (out now)' : ''}
              </option>
            ))}
          </select>
        </Field>

        <div className="row">
          <Field label="Customer name" error={errors.customerName}>
            <input value={form.customerName} onChange={set('customerName')} placeholder="e.g. Rahul Verma" autoComplete="off" />
          </Field>
          <Field label="Phone" error={errors.customerPhone}>
            <input value={form.customerPhone} onChange={set('customerPhone')} placeholder="+91 98450 11223" inputMode="tel" />
          </Field>
        </div>

        <div className="row">
          <Field label="Pickup" error={errors.startDate}>
            <input type="datetime-local" value={form.startDate} onChange={set('startDate')} />
          </Field>
          <Field label="Due back" error={errors.dueDate}>
            <input type="datetime-local" value={form.dueDate} onChange={set('dueDate')} min={form.startDate} />
          </Field>
        </div>

        <div className={`avail avail-${avail.state}`} role="status" aria-live="polite">
          {avail.state === 'checking' && <><span className="spin" /> Checking availability…</>}
          {avail.state === 'ok' && <><Icon name="check" /> Available for these dates</>}
          {avail.state === 'blocked' && (
            <>
              <Icon name="alert" />
              <div>
                <b>{avail.reason}</b>
                {avail.conflict?.startDate && <small>Existing: {fmtDateTime(avail.conflict.startDate)} → {fmtDateTime(avail.conflict.dueDate)}</small>}
              </div>
            </>
          )}
          {avail.state === 'idle' && <span className="muted">Pick an item and dates to check availability</span>}
        </div>

        <label className="check">
          <input type="checkbox" checked={form.depositPaid} onChange={set('depositPaid')} />
          <span>Deposit collected {item ? <b>({inr(item.deposit)})</b> : ''}</span>
        </label>

        <Field label="Notes (optional)">
          <textarea rows={2} value={form.notes} onChange={set('notes')} maxLength={300} placeholder="Accessories included, special instructions…" />
        </Field>

        <footer className="modal-foot">
          <div className="summary">
            {item && days > 0 ? (
              <>
                <span>{days} day{days > 1 ? 's' : ''} × {inr(item.dailyRate)}</span>
                <strong>{inr(total)}</strong>
              </>
            ) : <span className="muted">Rental total</span>}
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving || avail.state === 'blocked'}>
            {saving ? 'Booking…' : 'Confirm booking'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
