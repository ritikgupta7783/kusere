import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import api, { parseError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import OrderTimeline from '../../components/OrderTimeline';
import { Button, ErrorNote, OrderStatusBadge, PageLoader, PaymentStatusBadge } from '../../components/ui';
import { imageUrl } from '../../utils/images';
import { formatDate, formatPrice, paymentMethodLabel, TRANSITIONS } from '../../utils/format';

export default function OrderDetail() {
  const { orderId } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => api.get(`/admin/orders/${orderId}`).then((r) => setOrder(r.data.order)).catch((e) => setError(parseError(e).message)), [orderId]);
  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!order) return <PageLoader />;

  const run = async (key, fn, ok) => {
    setBusy(key);
    try { const r = await fn(); setOrder(r.data.order); toast.success(ok); if (r.data.refundRequired) toast.info('This order was paid online. Use "Refund payment" to return the money.'); }
    catch (e) { toast.error(parseError(e).message); } finally { setBusy(''); }
  };
  const setStatus = (s) => {
    if (s === 'Cancelled' && !window.confirm('Cancel this order? This cannot be undone.')) return;
    run(s, () => api.patch(`/admin/orders/${orderId}/status`, { status: s }), `Order marked ${s}`);
  };
  const refund = () => {
    if (!window.confirm(`Refund ${formatPrice(order.total)} to the customer via Razorpay?`)) return;
    run('refund', () => api.post(`/admin/orders/${orderId}/refund`), 'Refund initiated');
  };

  const next = TRANSITIONS[order.status];
  const a = order.shippingAddress;
  const canRefund = order.paymentMethod === 'RAZORPAY' && order.paymentStatus === 'Paid' && order.payment?.razorpayPaymentId && ['Pending', 'Confirmed', 'Processing', 'Cancelled'].includes(order.status);
  const canCollect = order.paymentMethod === 'COD' && order.paymentStatus === 'COD Pending' && order.status !== 'Cancelled';

  return (
    <div className="space-y-6">
      <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-forest"><ChevronLeft size={16} /> All orders</Link>
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-mono text-2xl font-bold text-forest">{order.orderId}</h2><p className="text-xs text-ink-400">Placed {formatDate(order.createdAt, true)}</p></div>
          <div className="flex gap-2"><OrderStatusBadge status={order.status} /><PaymentStatusBadge status={order.paymentStatus} /></div>
        </div>
        <div className="mt-6"><OrderTimeline status={order.status} /></div>
        <div className="mt-6 flex flex-wrap gap-3">
          {next.filter((s) => s !== 'Cancelled').map((s) => <Button key={s} loading={busy === s} onClick={() => setStatus(s)}>Mark {s}</Button>)}
          {next.includes('Cancelled') && <Button variant="danger" loading={busy === 'Cancelled'} onClick={() => setStatus('Cancelled')}>Cancel order</Button>}
          {canCollect && <Button variant="accent" loading={busy === 'cod'} onClick={() => run('cod', () => api.patch(`/admin/orders/${orderId}/cod-collected`), 'COD collection recorded')}>Mark COD collected</Button>}
          {canRefund && <Button variant="outline" loading={busy === 'refund'} onClick={refund}>Refund payment</Button>}
          {next.length === 0 && !canRefund && !canCollect && <p className="text-sm text-ink-500">No further actions for this order.</p>}
        </div>
        {order.paymentMethod === 'RAZORPAY' && order.paymentStatus !== 'Paid' && order.status === 'Pending' && <p className="mt-3 text-xs text-ink-400">Online orders can be confirmed only after payment is verified.</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6 text-sm">
          <h3 className="text-xl font-semibold">Customer</h3>
          <p className="mt-3 font-medium">{order.user?.name || a.fullName}</p>
          <p className="text-ink-500">{order.user?.email || a.email}</p><p className="text-ink-500">{order.user?.phone}</p>
          {order.user?._id && <Link to={`/admin/customers/${order.user._id}`} className="mt-2 inline-block font-medium text-forest hover:underline">View customer</Link>}
        </div>
        <div className="card p-6 text-sm">
          <h3 className="text-xl font-semibold">Delivery address</h3>
          <p className="mt-3 font-medium">{a.fullName} &middot; {a.phone}</p>
          <p className="text-ink-500">{a.addressLine}, {a.district}, {a.state} - {a.pincode}</p>
          {order.deliveryInstructions && <p className="mt-2 text-xs text-ink-400">Instructions: {order.deliveryInstructions}</p>}
        </div>
        <div className="card p-6 text-sm">
          <h3 className="text-xl font-semibold">Payment</h3>
          <dl className="mt-3 space-y-1.5">
            <div className="flex justify-between gap-3"><dt className="text-ink-500">Method</dt><dd>{paymentMethodLabel(order.paymentMethod)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-500">Status</dt><dd>{order.paymentStatus}</dd></div>
            {order.payment?.razorpayOrderId && <div className="flex justify-between gap-3"><dt className="text-ink-500">Razorpay order</dt><dd className="break-all font-mono text-xs">{order.payment.razorpayOrderId}</dd></div>}
            {order.payment?.razorpayPaymentId && <div className="flex justify-between gap-3"><dt className="text-ink-500">Razorpay payment</dt><dd className="break-all font-mono text-xs">{order.payment.razorpayPaymentId}</dd></div>}
            {order.payment?.paidAt && <div className="flex justify-between gap-3"><dt className="text-ink-500">Paid at</dt><dd>{formatDate(order.payment.paidAt, true)}</dd></div>}
            {order.payment?.codCollectedAt && <div className="flex justify-between gap-3"><dt className="text-ink-500">Cash collected</dt><dd>{formatDate(order.payment.codCollectedAt, true)}</dd></div>}
            {order.payment?.refundId && <div className="flex justify-between gap-3"><dt className="text-ink-500">Refund</dt><dd className="break-all font-mono text-xs">{order.payment.refundId}</dd></div>}
            {order.payment?.failureReason && <div className="flex justify-between gap-3"><dt className="text-ink-500">Failure</dt><dd>{order.payment.failureReason}</dd></div>}
          </dl>
        </div>
        <div className="card p-6 text-sm">
          <h3 className="text-xl font-semibold">Items</h3>
          <ul className="mt-3 divide-y divide-cream-200">
            {order.items.map((i) => (
              <li key={i.product} className="flex items-center gap-3 py-2"><img src={imageUrl(i.image)} alt="" className="h-12 w-9 rounded bg-leaf-100 object-contain p-0.5" /><span className="flex-1">{i.name} x {i.quantity}</span><span className="font-semibold">{formatPrice(i.lineTotal)}</span></li>
            ))}
          </ul>
          <div className="mt-2 space-y-1 border-t border-cream-200 pt-2">
            <div className="flex justify-between"><span className="text-ink-500">Delivery</span><span>{formatPrice(order.deliveryCharge)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span>{formatPrice(order.total)}</span></div>
          </div>
        </div>
      </div>

      <div className="card p-6 text-sm">
        <h3 className="text-xl font-semibold">History</h3>
        <ul className="mt-3 space-y-2">
          {[...order.statusHistory].reverse().map((h, i) => (
            <li key={i} className="flex flex-wrap gap-x-3 text-ink-500"><span className="text-ink-400">{formatDate(h.at, true)}</span><strong className="text-ink">{h.status}</strong><span>{h.paymentStatus}</span><span>{h.note}</span><span className="text-xs text-ink-400">{h.by}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
