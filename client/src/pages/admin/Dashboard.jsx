import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, Users, Clock, Truck, IndianRupee, Banknote } from 'lucide-react';
import api, { parseError } from '../../services/api';
import { ErrorNote, OrderStatusBadge, PageLoader, PaymentStatusBadge } from '../../components/ui';
import { formatDate, formatPrice } from '../../utils/format';

const Stat = ({ icon: Icon, label, value, sub, tone = 'text-forest' }) => (
  <div className="card p-5">
    <div className="flex items-center gap-3">
      <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-leaf-100 ${tone}`}><Icon size={20} /></span>
      <p className="text-sm text-ink-500">{label}</p>
    </div>
    <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
    {sub && <p className="mt-1 text-xs text-ink-400">{sub}</p>}
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { document.title = 'Dashboard | Admin'; api.get('/admin/dashboard').then((r) => setData(r.data)).catch((e) => setError(parseError(e).message)); }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <PageLoader />;
  const { stats: s, recentOrders } = data;

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold">Overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={ShoppingCart} label="Total orders" value={s.totalOrders} />
        <Stat icon={Package} label="Total products" value={s.totalProducts} />
        <Stat icon={Users} label="Total customers" value={s.totalCustomers} />
        <Stat icon={Clock} label="Pending orders" value={s.pendingOrders} tone="text-amber-700" />
        <Stat icon={Truck} label="Delivered orders" value={s.deliveredOrders} />
        <Stat icon={IndianRupee} label="Paid online revenue" value={formatPrice(s.paidOnlineRevenue)} sub={`${s.paidOnlineOrders} verified payments (failed/unpaid excluded)`} />
        <Stat icon={Banknote} label="COD collected" value={formatPrice(s.codCollected)} sub={`${s.codCollectedOrders} orders, shown separately`} />
        <Stat icon={Banknote} label="COD awaiting collection" value={formatPrice(s.codPendingAmount)} sub={`${s.codPendingOrders} open orders`} tone="text-amber-700" />
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between p-5"><h3 className="text-xl font-semibold">Recent orders</h3><Link to="/admin/orders" className="text-sm font-medium text-forest hover:underline">View all</Link></div>
        {recentOrders.length === 0 ? <p className="px-5 pb-6 text-sm text-ink-500">No orders yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-cream-100 text-xs uppercase tracking-wide text-ink-400"><tr><th className="px-5 py-3">Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.orderId} className="border-t border-cream-200">
                    <td className="px-5 py-3"><Link className="font-mono font-semibold text-forest hover:underline" to={`/admin/orders/${o.orderId}`}>{o.orderId}</Link></td>
                    <td>{o.shippingAddress.fullName}</td><td>{formatPrice(o.total)}</td>
                    <td><PaymentStatusBadge status={o.paymentStatus} /></td><td><OrderStatusBadge status={o.status} /></td><td className="text-ink-500">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
