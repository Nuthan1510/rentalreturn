import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { STATUS_META, CONDITIONS } from '../utils.js';

/* ---------- Icons ---------- */
const PATHS = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  plus: 'M12 5v14M5 12h14',
  alert: 'M12 3l10 18H2L12 3zM12 10v5M12 18h.01',
  check: 'M5 12l5 5L20 7',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5',
  wrench: 'M14 6a4 4 0 005 5l-9 9a2 2 0 01-3-3l9-9a4 4 0 00-2-2zM15 3l3 3',
  x: 'M6 6l12 12M18 6L6 18',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4',
  chevL: 'M15 6l-6 6 6 6',
  chevR: 'M9 6l6 6-6 6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
};
export const Icon = ({ name, size = 18, className = '' }) => (
  <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={PATHS[name]} />
  </svg>
);

/* ---------- Badges ---------- */
export const StatusBadge = ({ status, pulse }) => {
  const m = STATUS_META[status] || { label: status, tone: 'muted' };
  return (
    <span className={`badge badge-${m.tone} ${pulse || status === 'overdue' ? 'badge-pulse' : ''}`}>
      <i className="dot" />
      {m.label}
    </span>
  );
};

export const ConditionMeter = ({ value }) => {
  const idx = CONDITIONS.indexOf(value);
  const level = CONDITIONS.length - idx; // excellent = 5
  return (
    <span className={`cond cond-${value}`} title={`Condition: ${value}`}>
      <span className="cond-bars">
        {CONDITIONS.map((_, i) => (
          <b key={i} className={i < level ? 'on' : ''} />
        ))}
      </span>
      <span className="cond-label">{value}</span>
    </span>
  );
};

/* ---------- Modal ---------- */
export function Modal({ title, subtitle, onClose, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('input, select, textarea, button.btn-primary')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <Icon name="x" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

/* ---------- Form field ---------- */
export const Field = ({ label, error, hint, children }) => (
  <label className={`field ${error ? 'field-error' : ''}`}>
    <span className="field-label">{label}</span>
    {children}
    {error ? <span className="field-msg" role="alert">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
  </label>
);

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <Icon name={t.tone === 'ok' ? 'check' : 'alert'} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Misc ---------- */
export const Empty = ({ emoji = '📭', title, text, action }) => (
  <div className="empty">
    <div className="empty-emoji">{emoji}</div>
    <h3>{title}</h3>
    {text && <p>{text}</p>}
    {action}
  </div>
);

export const Skeleton = ({ h = 90, count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton" style={{ height: h }} />
    ))}
  </>
);

// Counts up to a number for stat cards
export function CountUp({ value = 0, format = (v) => v }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return setN(value);
    const from = n;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 700);
      setN(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{format(Math.round(n))}</>;
}
