import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import api, { parseError } from '../services/api';
import { formatPrice, paymentMethodLabel } from '../utils/format';
import { ErrorNote, PageLoader, PaymentStatusBadge } from '../components/ui';

export default function OrderConfirmed() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Order placed | Bimari Mitao Herbs';
    api.get(`/orders/${orderId}`).then((r) => setOrder(r.data.order)).catch((e) => setError(parseError(e).message));
  }, [orderId]);

  if (error) return <div className="container-page py-16"><ErrorNote>{error}</ErrorNote></div>;
  if (!order) return <PageLoader />;

  return (
    <div className="container-page py-14">
      <div className="card mx-auto max-w-xl p-8 text-center">
        <CheckCircle2 size={56} className="mx-auto text-leaf" />
        <h1 className="mt-4 text-3xl font-semibold">Thank you for your order</h1>
        <p className="mt-2 text-sm text-ink-500">Your order number is</p>
        <p className="mt-1 font-mono text-xl font-bold text-forest">{order.orderId}</p>
        <div className="mt-6 space-y-2 rounded-xl bg-cream-100 p-4 text-left text-sm">
          <div className="flex justify-between"><span className="text-ink-500">Total</span><strong>{formatPrice(order.total)}</strong></div>
          <div className="flex justify-between"><span className="text-ink-500">Payment</span><span>{paymentMethodLabel(order.paymentMethod)}</span></div>
          <div className="flex items-center justify-between"><span className="text-ink-500">Payment status</span><PaymentStatusBadge status={order.paymentStatus} /></div>
        </div>
        {order.paymentMethod === 'RAZORPAY' && order.paymentStatus !== 'Paid' && (
          <p className="mt-4 rounded-xl bg-turmeric-100 p-3 text-sm text-amber-900">We are still confirming your payment. If it does not update shortly, check your order page.</p>
        )}
        <p className="mt-4 text-sm text-ink-500">A confirmation email is sent when email is configured on the store.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to={`/account/orders/${order.orderId}`} className="btn-primary">Track order</Link>
          <Link to="/shop" className="btn-outline">Continue shopping</Link>
        </div>
      </div>
    </div>
  );
}
