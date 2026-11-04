import { Component, Suspense, lazy } from 'react';
import { Icon, CountUp, Skeleton, Empty, StatusBadge } from './ui.jsx';
import { inr, dueLabel, fmtDateTime, CATEGORY_EMOJI } from '../utils.js';

const Hero3D = lazy(() => import('./Hero3D.jsx'));

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <div className="scene-fallback">🛠️</div> : this.props.children;
  }
}

function Ring({ value }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 130 130" className="ring" role="img" aria-label={`Fleet utilization ${value} percent`}>
      <circle cx="65" cy="65" r={r} className="ring-bg" />
      <circle cx="65" cy="65" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} transform="rotate(-90 65 65)" />
      <text x="65" y="63" textAnchor="middle" className="ring-num">{value}%</text>
      <text x="65" y="82" textAnchor="middle" className="ring-sub">in use</text>
    </svg>
  );
}

function Stat({ label, value, tone, icon, format, sub }) {
  return (
    <div className={`stat stat-${tone}`}>
      <div className="stat-icon"><Icon name={icon} size={20} /></div>
      <div>
        <div className="stat-value"><CountUp value={value} format={format} /></div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export default function Dashboard({ stats, rentals, now, loading, onNewBooking, onReturn, onCheckout, go }) {
  const overdue = rentals.filter((r) => r.isOverdue);
  const dueToday = rentals.filter((r) => r.status === 'active' && !r.isOverdue && new Date(r.dueDate) <= new Date(new Date(now).setHours(23, 59, 59, 999)));
  const pickups = rentals.filter((r) => r.status === 'booked').sort((a, b) => new Date(a.startDate) - new Date(b.startDate)).slice(0, 4);

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><Icon name="shield" size={14} /> No double bookings. No lost gear.</span>
          <h1>Every item out, <em>every item back.</em></h1>
          <p>Track availability, bookings, deposits and returns in one register — with live overdue alerts so nothing goes missing.</p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => onNewBooking()}>
              <Icon name="plus" /> New booking
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => go('timeline')}>
              <Icon name="calendar" /> Open timeline
            </button>
          </div>
          <small className="hint-3d">Drag over the scene · click a tool to spin it</small>
        </div>
        <div className="hero-scene" aria-hidden="true">
          <SceneBoundary>
            <Suspense fallback={<div className="scene-fallback pulse">🛠️</div>}>
              <Hero3D />
            </Suspense>
          </SceneBoundary>
        </div>
      </section>

      {loading || !stats ? (
        <div className="stats"><Skeleton h={92} count={6} /></div>
      ) : (
        <section className="stats" aria-label="Key numbers">
          <Stat label="Available now" value={stats.availableNow} tone="ok" icon="check" sub={`of ${stats.totalItems - stats.maintenance} bookable`} />
          <Stat label="Out on rent" value={stats.outNow} tone="info" icon="box" sub={`${stats.dueToday} due today`} />
          <Stat label="Overdue" value={stats.overdue} tone={stats.overdue ? 'bad' : 'muted'} icon="alert" sub={stats.overdue ? `${inr(stats.lateFeesAccruing)} late fees accruing` : 'All returns on time'} />
          <Stat label="Upcoming bookings" value={stats.upcoming} tone="warn" icon="calendar" sub="Waiting for pickup" />
          <Stat label="Deposits held" value={stats.depositsHeld} tone="info" icon="shield" format={inr} sub="On active rentals" />
          <Stat label="Revenue collected" value={stats.revenue} tone="ok" icon="list" format={inr} sub="From returned rentals" />
        </section>
      )}

      <div className="grid-2">
        <section className="panel panel-attn">
          <header className="panel-head">
            <h2><Icon name="alert" /> Needs attention</h2>
            <span className="count-pill">{overdue.length + dueToday.length}</span>
          </header>
          {overdue.length + dueToday.length === 0 ? (
            <Empty emoji="🎉" title="All clear" text="Nothing overdue and nothing due today." />
          ) : (
            <ul className="attn-list">
              {[...overdue, ...dueToday].map((r) => (
                <li key={r.id} className={r.isOverdue ? 'is-overdue' : ''}>
                  <span className="attn-emoji">{CATEGORY_EMOJI[r.item?.category] || '📦'}</span>
                  <div className="attn-main">
                    <strong>{r.item?.name}</strong>
                    <span>{r.customerName} · {r.customerPhone}</span>
                  </div>
                  <div className="attn-due">
                    <b className={r.isOverdue ? 'txt-bad' : 'txt-warn'}>{dueLabel(r, now)}</b>
                    {r.isOverdue && <span>Late fee {inr(r.accruedLateFee)}</span>}
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={() => onReturn(r)}>
                    <Icon name="undo" size={15} /> Return
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <header className="panel-head">
            <h2><Icon name="clock" /> Next pickups</h2>
            <button className="link" onClick={() => go('rentals')}>View register <Icon name="arrow" size={14} /></button>
          </header>
          {pickups.length === 0 ? (
            <Empty emoji="🗓️" title="No upcoming pickups" text="New bookings will appear here." />
          ) : (
            <ul className="attn-list">
              {pickups.map((r) => (
                <li key={r.id}>
                  <span className="attn-emoji">{CATEGORY_EMOJI[r.item?.category] || '📦'}</span>
                  <div className="attn-main">
                    <strong>{r.item?.name}</strong>
                    <span>{r.customerName}</span>
                  </div>
                  <div className="attn-due">
                    <b>{fmtDateTime(r.startDate)}</b>
                    <span>{r.depositPaid ? 'Deposit paid' : 'Deposit pending'}</span>
                  </div>
                  <button className="btn btn-sm btn-ghost" onClick={() => onCheckout(r)}>Hand over</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {stats && (
        <section className="panel">
          <header className="panel-head"><h2><Icon name="grid" /> Fleet utilization</h2></header>
          <div className="util">
            <Ring value={stats.utilization} />
            <ul className="bars">
              {Object.entries(stats.byCategory).map(([cat, v]) => (
                <li key={cat}>
                  <span className="bar-label">{CATEGORY_EMOJI[cat]} {cat}</span>
                  <span className="bar-track"><i style={{ width: `${(v.out / v.total) * 100}%` }} /></span>
                  <span className="bar-num">{v.out}/{v.total}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
