import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import api, { parseError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, ErrorNote, OrderStatusBadge, PageLoader, PaymentStatusBadge } from '../../components/ui';
import { formatDate, formatPrice } from '../../utils/format';

export default function CustomerDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get(`/admin/customers/${id}`).then((r) => setData(r.data)).catch((e) => setError(parseError(e).message)); }, [id]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <PageLoader />;
  const { customer: c, orders } = data;

  const toggle = async () => {
    if (c.isActive && !window.confirm(`Deactivate ${c.name}? They will be signed out and unable to log in.`)) return;
    setBusy(true);
    try { const r = await api.patch(`/admin/customers/${id}/active`, { isActive: !c.isActive }); setData({ ...data, customer: r.data.customer }); toast.success(r.data.customer.isActive ? 'Account reactivated' : 'Account deactivated'); }
    catch (e) { toast.error(parseError(e).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <Link to="/admin/customers" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-forest"><ChevronLeft size={16} /> Customers</Link>
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-3xl font-semibold">{c.name}</h2><p className="break-all text-sm text-ink-500">{c.email} &middot; {c.phone}</p></div>
          <div className="flex gap-2"><Badge tone={c.isEmailVerified ? 'green' : 'amber'}>{c.isEmailVerified ? 'Email verified' : 'Email unverified'}</Badge><Badge tone={c.isActive ? 'green' : 'red'}>{c.isActive ? 'Active' : 'Deactivated'}</Badge></div>
        </div>
        <p className="mt-3 text-xs text-ink-400">Joined {formatDate(c.createdAt, true)}{c.lastLoginAt ? ` - last sign-in ${formatDate(c.lastLoginAt, true)}` : ''}</p>
        <div className="mt-5"><Button variant={c.isActive ? 'danger' : 'primary'} loading={busy} onClick={toggle}>{c.isActive ? 'Deactivate account' : 'Reactivate account'}</Button></div>
      </div>
      <section className="card overflow-hidden">
        <h3 className="p-5 text-xl font-semibold">Order history ({orders.length})</h3>
        {orders.length === 0 ? <p className="px-5 pb-6 text-sm text-ink-500">No orders yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase tracking-wide text-ink-400"><tr><th className="px-5 py-3">Order</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{orders.map((o) => (
              <tr key={o.orderId} className="border-t border-cream-200"><td className="px-5 py-3"><Link to={`/admin/orders/${o.orderId}`} className="font-mono font-semibold text-forest hover:underline">{o.orderId}</Link></td><td>{formatPrice(o.total)}</td><td><PaymentStatusBadge status={o.paymentStatus} /></td><td><OrderStatusBadge status={o.status} /></td><td className="text-ink-500">{formatDate(o.createdAt)}</td></tr>
            ))}</tbody></table></div>
        )}
      </section>
    </div>
  );
}
