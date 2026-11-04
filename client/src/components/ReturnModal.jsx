import { useState } from 'react';
import { Modal, Field, ConditionMeter, useToast } from './ui.jsx';
import { api, ApiError } from '../api.js';
import { CONDITIONS, inr, dueLabel } from '../utils.js';

export default function ReturnModal({ rental, lateMultiplier = 1.5, onClose, onSaved }) {
  const toast = useToast();
  const [conditionIn, setConditionIn] = useState(rental.conditionOut);
  const [damageFee, setDamageFee] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Preview only - the server calculates the real figures
  const late = rental.accruedLateFee || 0;
  const dmg = Number(damageFee) || 0;
  const held = rental.depositPaid ? rental.deposit : 0;
  const refund = Math.max(0, held - late - dmg);
  const shortfall = Math.max(0, late + dmg - held);
  const worse = CONDITIONS.indexOf(conditionIn) > CONDITIONS.indexOf(rental.conditionOut);

  const submit = async (e) => {
    e.preventDefault();
    if (dmg < 0) return setErrors({ damageFee: 'Damage fee cannot be negative' });
    setSaving(true);
    try {
      await api.returnRental(rental.id, { conditionIn, damageFee: dmg, notes: notes || undefined });
      toast(`${rental.item?.name} returned${conditionIn === 'damaged' ? ' - sent to maintenance' : ''}`, conditionIn === 'damaged' ? 'warn' : 'ok');
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      toast(err.message, 'bad');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Take return" subtitle={`${rental.item?.name} · ${rental.customerName}`} onClose={onClose}>
      <form onSubmit={submit} noValidate className="form">
        {rental.isOverdue && (
          <div className="callout callout-bad">
            <b>{dueLabel(rental)}</b>
            <span>Late fee: {rental.daysOverdue} day(s) × {inr(rental.dailyRate)} × {lateMultiplier} = {inr(late)}</span>
          </div>
        )}
        <div className="row">
          <Field label="Condition when picked up"><div className="static"><ConditionMeter value={rental.conditionOut} /></div></Field>
          <Field label="Condition now">
            <select value={conditionIn} onChange={(e) => setConditionIn(e.target.value)}>
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        {worse && <div className="callout callout-warn">Condition is worse than at pickup. Consider a damage fee.</div>}
        {conditionIn === 'damaged' && <div className="callout callout-warn">Damaged items are moved to maintenance automatically.</div>}

        <Field label="Damage fee (₹, optional)" error={errors.damageFee}>
          <input type="number" min="0" inputMode="numeric" value={damageFee} onChange={(e) => setDamageFee(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Return notes (optional)"><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} /></Field>

        <dl className="bill">
          <div><dt>Deposit held</dt><dd>{rental.depositPaid ? inr(rental.deposit) : 'Not collected'}</dd></div>
          <div><dt>Late fee</dt><dd className={late ? 'txt-bad' : ''}>− {inr(late)}</dd></div>
          <div><dt>Damage fee</dt><dd className={dmg ? 'txt-bad' : ''}>− {inr(dmg)}</dd></div>
          <div className="bill-total"><dt>Refund to customer</dt><dd>{inr(refund)}</dd></div>
          {shortfall > 0 && <div className="bill-due"><dt>Customer still owes</dt><dd>{inr(shortfall)}</dd></div>}
        </dl>

        <footer className="modal-foot">
          <span className="grow" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Confirm return'}</button>
        </footer>
      </form>
    </Modal>
  );
}
