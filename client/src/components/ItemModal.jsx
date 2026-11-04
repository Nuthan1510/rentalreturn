import { useState } from 'react';
import { Modal, Field, useToast } from './ui.jsx';
import { api, ApiError } from '../api.js';
import { CATEGORIES, CONDITIONS } from '../utils.js';

export default function ItemModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const editing = !!item;
  const [form, setForm] = useState({
    name: item?.name || '',
    sku: item?.sku || '',
    category: item?.category || CATEGORIES[0],
    dailyRate: item?.dailyRate ?? '',
    deposit: item?.deposit ?? '',
    condition: item?.condition || 'good',
    status: item?.status || 'active',
    notes: item?.notes || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (form.name.trim().length < 2) er.name = 'Name must be at least 2 characters';
    if (!/^[A-Za-z0-9-]{2,20}$/.test(form.sku.trim())) er.sku = 'Use 2–20 letters, numbers or dashes';
    if (form.dailyRate === '' || Number(form.dailyRate) < 0) er.dailyRate = 'Enter a daily rate (0 or more)';
    if (form.deposit === '' || Number(form.deposit) < 0) er.deposit = 'Enter a deposit (0 or more)';
    setErrors(er);
    if (Object.keys(er).length) return;

    setSaving(true);
    try {
      const body = { ...form, dailyRate: Number(form.dailyRate), deposit: Number(form.deposit) };
      if (editing) await api.updateItem(item.id, body);
      else await api.createItem(body);
      toast(editing ? 'Item updated' : 'Item added');
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      toast(err.message, 'bad');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${item.name}? This cannot be undone.`)) return;
    try {
      await api.deleteItem(item.id);
      toast('Item deleted');
      onSaved();
      onClose();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  return (
    <Modal title={editing ? 'Edit item' : 'Add equipment'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="form">
        <div className="row">
          <Field label="Name" error={errors.name}><input value={form.name} onChange={set('name')} placeholder="Bosch Hammer Drill" /></Field>
          <Field label="SKU" error={errors.sku} hint="Unique code"><input value={form.sku} onChange={set('sku')} placeholder="PT-004" style={{ textTransform: 'uppercase' }} /></Field>
        </div>
        <div className="row">
          <Field label="Category" error={errors.category}>
            <select value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Condition" error={errors.condition}>
            <select value={form.condition} onChange={set('condition')}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
        </div>
        <div className="row">
          <Field label="Daily rate (₹)" error={errors.dailyRate}><input type="number" min="0" inputMode="numeric" value={form.dailyRate} onChange={set('dailyRate')} /></Field>
          <Field label="Deposit (₹)" error={errors.deposit}><input type="number" min="0" inputMode="numeric" value={form.deposit} onChange={set('deposit')} /></Field>
        </div>
        {editing && (
          <Field label="Availability" hint="Maintenance removes the item from bookable stock">
            <select value={form.status} onChange={set('status')}>
              <option value="active">Active - can be booked</option>
              <option value="maintenance">Maintenance - cannot be booked</option>
            </select>
          </Field>
        )}
        <Field label="Notes (optional)"><textarea rows={2} value={form.notes} onChange={set('notes')} maxLength={300} /></Field>
        <footer className="modal-foot">
          {editing && <button type="button" className="btn btn-danger" onClick={remove}>Delete</button>}
          <span className="grow" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add item'}</button>
        </footer>
      </form>
    </Modal>
  );
}
