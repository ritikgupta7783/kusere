import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import api, { parseError } from '../../services/api';
import useRazorpay from '../../hooks/useRazorpay';
import { useToast } from '../../context/ToastContext';
import OrderTimeline from '../../components/OrderTimeline';
import { Button, ErrorNote, OrderStatusBadge, PageLoader, PaymentStatusBadge } from '../../components/ui';
import { imageUrl } from '../../utils/images';
import { formatDate, formatPrice, paymentMethodLabel } from '../../utils/format';

export default function OrderDetail() {
  const { orderId } = useParams();
  const pay = useRazorpay();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get(`/orders/${orderId}`).then((r) => setOrder(r.data.order)).catch((e) => setError(parseError(e).message)), [orderId]);
  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!order) return <PageLoader />;

  const canPay = order.paymentMethod === 'RAZORPAY' && ['Pending', 'Failed'].includes(order.paymentStatus) && order.status !== 'Cancelled';
  const a = order.shippingAddress;

  const retry = async () => {
    setBusy(true);
    try {
      const result = await pay(order.orderId);
      if (result === 'paid') toast.success('Payment successful');
      else toast.error(result === 'failed' ? 'Payment failed. Please try again.' : 'Payment was not completed.');
      await load();
    } catch (e) { toast.error(e?.response ? parseError(e).message : e.message); } finally { setBusy(false); }
  };

  return (
    <section className="space-y-6">
      <Link to="/account/orders" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-forest"><ChevronLeft size={16} /> All orders</Link>
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="font-mono text-lg font-bold text-forest">{order.orderId}</p><p className="text-xs text-ink-400">Placed {formatDate(order.createdAt, true)}</p></div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="mt-6"><OrderTimeline status={order.status} /></div>
      </div>

      {canPay && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-turmeric bg-turmeric-100 p-5">
          <p className="text-sm text-amber-900">Payment for this order is pending. Complete it to confirm your order.</p>
          <Button onClick={retry} loading={busy}>Pay {formatPrice(order.total)}</Button>
        </div>
      )}

      <div className="card p-6">
        <h2 className="text-xl font-semibold">Items</h2>
        <ul className="mt-4 divide-y divide-cream-200">
          {order.items.map((i) => (
            <li key={i.product} className="flex items-center gap-4 py-3">
              <img src={imageUrl(i.image)} alt="" className="h-16 w-12 rounded-lg bg-leaf-100 object-contain p-1" />
              <div className="flex-1 text-sm"><p className="font-medium">{i.name}</p><p className="text-ink-500">{i.quantity} x {formatPrice(i.unitPrice)}</p></div>
              <p className="font-semibold">{formatPrice(i.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-cream-200 pt-3 text-sm">
          <div className="flex justify-between"><span className="text-ink-500">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-ink-500">Delivery</span><span>{order.deliveryCharge === 0 ? 'Free' : formatPrice(order.deliveryCharge)}</span></div>
          <div className="flex justify-between text-base font-bold"><span>Total</span><span className="text-forest">{formatPrice(order.total)}</span></div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6 text-sm">
          <h2 className="text-xl font-semibold">Payment</h2>
          <p className="mt-3 text-ink-500">{paymentMethodLabel(order.paymentMethod)}</p>
          <div className="mt-2"><PaymentStatusBadge status={order.paymentStatus} /></div>
          {order.payment?.razorpayPaymentId && <p className="mt-3 break-all text-xs text-ink-400">Payment ID: {order.payment.razorpayPaymentId}</p>}
        </div>
        <div className="card p-6 text-sm">
          <h2 className="text-xl font-semibold">Delivery address</h2>
          <p className="mt-3 font-medium">{a.fullName} &middot; {a.phone}</p>
          <p className="text-ink-500">{a.addressLine}, {a.district}, {a.state} - {a.pincode}</p>
          {order.deliveryInstructions && <p className="mt-2 text-xs text-ink-400">Note: {order.deliveryInstructions}</p>}
        </div>
      </div>
    </section>
  );
}
