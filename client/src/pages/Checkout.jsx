import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, Banknote, ShoppingBag } from 'lucide-react';
import api, { parseError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import useRazorpay from '../hooks/useRazorpay';
import { imageUrl } from '../utils/images';
import { deliveryFor, formatPrice, newKey } from '../utils/format';
import { Button, EmptyState, ErrorNote, Field } from '../components/ui';

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clear, syncWithCatalogue, syncError } = useCart();
  const { settings } = useSite();
  const toast = useToast();
  const navigate = useNavigate();
  const pay = useRazorpay();
  const idemKey = useRef(newKey());

  const [form, setForm] = useState({ fullName: user?.name || '', phone: user?.phone || '', addressLine: '', pincode: '', district: '', state: '', deliveryInstructions: '' });
  const [saved, setSaved] = useState([]);
  const [method, setMethod] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);

  useEffect(() => {
    document.title = 'Checkout | Bimari Mitao Herbs';
    api.get('/account/addresses').then((r) => {
      setSaved(r.data.addresses);
      const d = r.data.addresses.find((a) => a.isDefault) || r.data.addresses[0];
      if (d) fillFrom(d);
    }).catch(() => {});
    if (items.length) api.get('/products').then((r) => syncWithCatalogue(r.data.products).forEach((n) => toast.info(n))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick the first payment method that is actually available.
  useEffect(() => {
    if (!settings || method) return;
    if (settings.onlinePaymentsAvailable) setMethod('RAZORPAY'); else if (settings.codEnabled) setMethod('COD');
  }, [settings, method]);

  const fillFrom = (a) => setForm((f) => ({ ...f, fullName: a.fullName, phone: a.phone, addressLine: a.addressLine, pincode: a.pincode, district: a.district, state: a.state }));
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  if (!items.length) return <div className="container-page space-y-4 py-20"><ErrorNote>{syncError}</ErrorNote><EmptyState icon={ShoppingBag} title="Your cart is empty" action={<Link to="/shop" className="btn-primary">Browse products</Link>} /></div>;

  const delivery = deliveryFor(settings, subtotal);
  const total = subtotal + delivery;
  const noMethods = settings && !settings.onlinePaymentsAvailable && !settings.codEnabled;

  const place = async (e) => {
    e.preventDefault();
    if (!method) return setError('Please choose a payment method');
    setBusy(true); setError(''); setErrors({});
    let order;
    try {
      const { deliveryInstructions, ...shippingAddress } = form;
      const { data } = await api.post('/orders', {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress, deliveryInstructions, paymentMethod: method, idempotencyKey: idemKey.current,
      });
      order = data.order;
      if (saveAddress && !saved.some((a) => a.addressLine === form.addressLine && a.pincode === form.pincode)) {
        api.post('/account/addresses', { ...shippingAddress, label: 'Home', isDefault: saved.length === 0 }).catch(() => {});
      }
    } catch (err) {
      const p = parseError(err);
      setErrors(p.fields || {}); setError(p.code === 'VALIDATION_ERROR' ? 'Please correct the highlighted fields.' : p.message);
      setBusy(false); return;
    }

    clear(); // the order exists now; payment can be retried from the order page if needed
    if (method === 'COD') { toast.success('Order placed'); return navigate(`/order/${order.orderId}/confirmed`, { replace: true }); }

    try {
      const result = await pay(order.orderId);
      if (result === 'paid') { toast.success('Payment successful'); return navigate(`/order/${order.orderId}/confirmed`, { replace: true }); }
      toast.error(result === 'failed' ? 'Payment failed. You can retry from your order page.' : 'Payment was not completed. You can retry from your order page.');
    } catch (err) {
      toast.error(err?.response ? parseError(err).message : err.message || 'Payment could not be completed.');
    }
    navigate(`/account/orders/${order.orderId}`, { replace: true });
  };

  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-4xl font-semibold">Checkout</h1>
      <ErrorNote>{syncError}</ErrorNote>
      <form onSubmit={place} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="card space-y-4 p-6">
            <h2 className="text-2xl font-semibold">Delivery details</h2>
            {saved.length > 0 && (
              <div>
                <label className="label" htmlFor="saved">Use a saved address</label>
                <select id="saved" className="input" defaultValue="" onChange={(e) => { const a = saved.find((x) => x._id === e.target.value); if (a) fillFrom(a); }}>
                  <option value="">Choose...</option>
                  {saved.map((a) => <option key={a._id} value={a._id}>{a.label || 'Address'} - {a.addressLine.slice(0, 40)}, {a.pincode}</option>)}
                </select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" autoComplete="name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} required />
              <Field label="Phone number" type="tel" inputMode="numeric" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} required />
            </div>
            <Field label="Email (verified)" value={user?.email || ''} readOnly disabled />
            <Field as="textarea" label="Complete address" autoComplete="street-address" placeholder="House / street / village / landmark" value={form.addressLine} onChange={set('addressLine')} error={errors.addressLine} className="[&_textarea]:min-h-[90px]" required />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="PIN code" inputMode="numeric" maxLength={6} autoComplete="postal-code" value={form.pincode} onChange={set('pincode')} error={errors.pincode} required />
              <Field label="District" value={form.district} onChange={set('district')} error={errors.district} required />
              <Field label="State" autoComplete="address-level1" value={form.state} onChange={set('state')} error={errors.state} required />
            </div>
            <Field label="Delivery instructions (optional)" value={form.deliveryInstructions} onChange={set('deliveryInstructions')} maxLength={300} />
            <label className="flex items-center gap-2 text-sm text-ink-500"><input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-4 w-4 accent-forest" /> Save this address to my account</label>
          </section>

          <section className="card space-y-3 p-6">
            <h2 className="text-2xl font-semibold">Payment method</h2>
            {noMethods && <ErrorNote>No payment method is currently available. Please contact the store.</ErrorNote>}
            {[
              { id: 'RAZORPAY', icon: CreditCard, title: 'Pay online', text: 'UPI, cards, net banking and wallets via Razorpay', enabled: settings?.onlinePaymentsAvailable, off: 'Online payment is not available yet' },
              { id: 'COD', icon: Banknote, title: 'Cash on Delivery', text: 'Pay in cash when your order arrives', enabled: settings?.codEnabled, off: 'Cash on Delivery is not available right now' },
            ].map(({ id, icon: Icon, title, text, enabled, off }) => (
              <label key={id} className={`flex items-start gap-3 rounded-xl border-2 p-4 transition ${!enabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'} ${method === id ? 'border-forest bg-leaf-100/60' : 'border-cream-200'}`}>
                <input type="radio" name="method" className="mt-1 h-4 w-4 accent-forest" checked={method === id} disabled={!enabled} onChange={() => setMethod(id)} />
                <Icon className="mt-0.5 shrink-0 text-forest" size={20} />
                <span><span className="block font-semibold">{title}</span><span className="text-sm text-ink-500">{enabled ? text : off}</span></span>
              </label>
            ))}
          </section>
        </div>

        <aside className="card h-fit space-y-4 p-6 lg:sticky lg:top-24">
          <h2 className="text-2xl font-semibold">Order summary</h2>
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.productId} className="flex items-center gap-3">
                <img src={imageUrl(i.image)} alt="" className="h-14 w-10 rounded-lg bg-leaf-100 object-contain p-1" />
                <div className="min-w-0 flex-1 text-sm"><p className="truncate font-medium">{i.name}</p><p className="text-ink-500">{i.quantity} x {formatPrice(i.price)}</p></div>
                <p className="text-sm font-semibold">{formatPrice(i.price * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-cream-200 pt-4 text-sm">
            <div className="flex justify-between"><span className="text-ink-500">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-ink-500">Delivery</span><span>{delivery === 0 ? 'Free' : formatPrice(delivery)}</span></div>
            <div className="flex justify-between pt-2 text-lg font-bold"><span>Total</span><span className="text-forest">{formatPrice(total)}</span></div>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <Button type="submit" loading={busy} disabled={!method} className="w-full">{method === 'RAZORPAY' ? `Pay ${formatPrice(total)}` : 'Place order'}</Button>
          <p className="text-center text-xs text-ink-400">Prices are confirmed by our server when you place the order.</p>
        </aside>
      </form>
    </div>
  );
}
