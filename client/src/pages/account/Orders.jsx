import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import api, { parseError } from '../../services/api';
import { EmptyState, ErrorNote, OrderStatusBadge, PageLoader, PaymentStatusBadge } from '../../components/ui';
import { formatDate, formatPrice, paymentMethodLabel } from '../../utils/format';

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/orders/my-orders').then((r) => setOrders(r.data.orders)).catch((e) => setError(parseError(e).message)); }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!orders) return <PageLoader />;
  if (!orders.length) return <EmptyState icon={Package} title="No orders yet" text="Your orders will appear here." action={<Link to="/shop" className="btn-primary">Start shopping</Link>} />;

  return (
    <section>
      <h2 className="text-2xl font-semibold">Order history</h2>
      <ul className="mt-5 space-y-4">
        {orders.map((o) => (
          <li key={o.orderId}>
            <Link to={`/account/orders/${o.orderId}`} className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-bold text-forest">{o.orderId}</p>
                <OrderStatusBadge status={o.status} />
              </div>
              <p className="mt-1 text-xs text-ink-400">{formatDate(o.createdAt, true)}</p>
              <p className="mt-3 text-sm text-ink-500">{o.items.map((i) => `${i.name} x ${i.quantity}`).join(', ')}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-ink-500">{paymentMethodLabel(o.paymentMethod)} <PaymentStatusBadge status={o.paymentStatus} /></span>
                <strong>{formatPrice(o.total)}</strong>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
