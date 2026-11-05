import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import api, { parseError } from '../../services/api';
import useDebounce from '../../hooks/useDebounce';
import { ErrorNote, OrderStatusBadge, PageLoader, PaymentStatusBadge, Pagination } from '../../components/ui';
import { formatDate, formatPrice, paymentMethodLabel } from '../../utils/format';

const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export default function Orders() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const dq = useDebounce(q);

  useEffect(() => { setPage(1); }, [dq, status]);
  useEffect(() => {
    document.title = 'Orders | Admin';
    api.get('/admin/orders', { params: { q: dq, status, page } }).then((r) => { setData(r.data); setError(''); }).catch((e) => setError(parseError(e).message));
  }, [dq, status, page]);

  return (
    <div className="space-y-5">
      <h2 className="text-3xl font-semibold">Orders</h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search size={18} className="absolute left-4 top-3 text-ink-400" /><input className="input pl-11" placeholder="Search by order ID, customer name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" /></div>
        <select className="input sm:w-52" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {!data && !error ? <PageLoader /> : data && (
        <div className="card overflow-hidden">
          {data.orders.length === 0 ? <p className="p-8 text-center text-sm text-ink-500">No orders match.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-cream-100 text-xs uppercase tracking-wide text-ink-400"><tr><th className="px-5 py-3">Order</th><th>Customer</th><th>Total</th><th>Method</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {data.orders.map((o) => (
                    <tr key={o.orderId} className="border-t border-cream-200 hover:bg-cream/60">
                      <td className="px-5 py-3"><Link className="font-mono font-semibold text-forest hover:underline" to={`/admin/orders/${o.orderId}`}>{o.orderId}</Link></td>
                      <td>{o.shippingAddress.fullName}<br /><span className="text-xs text-ink-400">{o.shippingAddress.phone}</span></td>
                      <td className="font-semibold">{formatPrice(o.total)}</td><td className="text-ink-500">{paymentMethodLabel(o.paymentMethod)}</td>
                      <td><PaymentStatusBadge status={o.paymentStatus} /></td><td><OrderStatusBadge status={o.status} /></td><td className="text-ink-500">{formatDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  );
}
