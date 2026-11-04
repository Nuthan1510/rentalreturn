import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { Icon, ToastProvider, useToast } from './components/ui.jsx';
import Dashboard from './components/Dashboard.jsx';
import Inventory from './components/Inventory.jsx';
import Rentals from './components/Rentals.jsx';
import Timeline from './components/Timeline.jsx';
import BookingModal from './components/BookingModal.jsx';
import ItemModal from './components/ItemModal.jsx';
import ReturnModal from './components/ReturnModal.jsx';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'inventory', label: 'Inventory', icon: 'box' },
  { id: 'rentals', label: 'Register', icon: 'list' },
  { id: 'timeline', label: 'Timeline', icon: 'calendar' },
];

function Shell() {
  const toast = useToast();
  const [tab, setTab] = useState(() => location.hash.slice(1) || 'dashboard');
  const [data, setData] = useState({ items: [], rentals: [], stats: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [modal, setModal] = useState(null); // {type, ...}

  const refresh = useCallback(async () => {
    try {
      const [items, rentals, stats] = await Promise.all([api.items(), api.rentals(), api.stats()]);
      setData({ items, rentals, stats });
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 60000); // keep overdue flags fresh
    const tick = setInterval(() => setNow(Date.now()), 30000); // countdown labels
    return () => (clearInterval(poll), clearInterval(tick));
  }, [refresh]);

  useEffect(() => {
    const onHash = () => setTab(location.hash.slice(1) || 'dashboard');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id) => {
    location.hash = id;
    setTab(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const close = useCallback(() => setModal(null), []);

  const checkout = async (r) => {
    try {
      await api.checkout(r.id);
      toast(`${r.item?.name} handed to ${r.customerName}`);
      refresh();
    } catch (e) {
      toast(e.message, 'bad');
    }
  };
  const cancel = async (r) => {
    if (!window.confirm(`Cancel the booking for ${r.customerName}?`)) return;
    try {
      await api.cancelRental(r.id);
      toast('Booking cancelled');
      refresh();
    } catch (e) {
      toast(e.message, 'bad');
    }
  };

  const overdueCount = data.stats?.overdue || 0;
  const actions = {
    newBooking: (item, start) => setModal({ type: 'booking', item, start }),
    ret: (rental) => setModal({ type: 'return', rental }),
  };

  return (
    <div className="app">
      <aside className="side">
        <a className="brand" href="#dashboard" onClick={() => go('dashboard')}>
          <span className="logo"><Icon name="undo" size={18} /></span>
          <span>Rental<b>Return</b></span>
        </a>
        <nav aria-label="Main">
          {TABS.map((t) => (
            <button key={t.id} className={`nav ${tab === t.id ? 'nav-on' : ''}`} onClick={() => go(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              <Icon name={t.icon} />
              <span>{t.label}</span>
              {t.id === 'rentals' && overdueCount > 0 && <em className="nav-alert">{overdueCount}</em>}
            </button>
          ))}
        </nav>
        <button className="btn btn-primary side-cta" onClick={() => actions.newBooking()}>
          <Icon name="plus" /> New booking
        </button>
      </aside>

      <main className="main">
        {error && (
          <div className="banner" role="alert">
            <Icon name="alert" /> <span>{error}</span>
            <button className="btn btn-sm btn-ghost" onClick={refresh}>Retry</button>
          </div>
        )}
        {tab === 'dashboard' && (
          <Dashboard stats={data.stats} rentals={data.rentals} now={now} loading={loading} go={go} onNewBooking={actions.newBooking} onReturn={actions.ret} onCheckout={checkout} />
        )}
        {tab === 'inventory' && (
          <Inventory items={data.items} loading={loading} now={now} onBook={(i) => actions.newBooking(i)} onEdit={(i) => setModal({ type: 'item', item: i })} onAdd={() => setModal({ type: 'item' })} />
        )}
        {tab === 'rentals' && (
          <Rentals rentals={data.rentals} loading={loading} now={now} onNew={actions.newBooking} onCheckout={checkout} onReturn={actions.ret} onCancel={cancel} />
        )}
        {tab === 'timeline' && <Timeline items={data.items} rentals={data.rentals} now={now} loading={loading} onBook={actions.newBooking} />}
      </main>

      {modal?.type === 'booking' && <BookingModal items={data.items} preItem={modal.item} preStart={modal.start} onClose={close} onSaved={refresh} />}
      {modal?.type === 'item' && <ItemModal item={modal.item} onClose={close} onSaved={refresh} />}
      {modal?.type === 'return' && <ReturnModal rental={modal.rental} lateMultiplier={data.stats?.lateFeeMultiplier} onClose={close} onSaved={refresh} />}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
