import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useSite } from '../context/SiteContext';
import { imageUrl } from '../utils/images';
import { deliveryFor, formatPrice } from '../utils/format';
import { EmptyState, ErrorNote, QuantitySelector } from '../components/ui';

export default function Cart() {
  const { items, subtotal, setQuantity, remove, syncWithCatalogue, syncError, MAX_QTY } = useCart();
  const { settings } = useSite();
  const toast = useToast();
  const navigate = useNavigate();

  // Refresh display prices/availability from the live catalogue when the cart opens.
  useEffect(() => {
    if (!items.length) return;
    api.get('/products').then((r) => syncWithCatalogue(r.data.products).forEach((n) => toast.info(n))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!items.length) {
    return <div className="container-page space-y-4 py-20"><ErrorNote>{syncError}</ErrorNote><EmptyState icon={ShoppingBag} title="Your cart is empty" text="Add Cavi-Care to get started." action={<Link to="/shop" className="btn-primary">Browse products</Link>} /></div>;
  }
  const delivery = deliveryFor(settings, subtotal);

  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-4xl font-semibold">Your cart</h1>
      <ErrorNote>{syncError}</ErrorNote>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <ul className="space-y-4">
          {items.map((i) => (
            <li key={i.productId} className="card flex gap-4 p-4">
              <Link to={`/shop/${i.slug}`} className="shrink-0 rounded-xl bg-leaf-100 p-2"><img src={imageUrl(i.image)} alt={i.name} className="h-24 w-16 object-contain mix-blend-multiply sm:h-28 sm:w-20" /></Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <Link to={`/shop/${i.slug}`} className="font-semibold hover:text-forest">{i.name}</Link>
                  <button onClick={() => remove(i.productId)} aria-label={`Remove ${i.name}`} className="h-9 w-9 shrink-0 rounded-full text-ink-400 hover:bg-red-50 hover:text-brand-red"><Trash2 size={18} className="mx-auto" /></button>
                </div>
                <p className="text-sm text-ink-500">Unit price {formatPrice(i.price)}</p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <QuantitySelector size="sm" value={i.quantity} max={MAX_QTY} onChange={(q) => setQuantity(i.productId, q)} />
                  <p className="font-bold text-forest">{formatPrice(i.price * i.quantity)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="card h-fit space-y-3 p-6 lg:sticky lg:top-24">
          <h2 className="text-2xl font-semibold">Summary</h2>
          <div className="flex justify-between text-sm"><span className="text-ink-500">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-ink-500">Delivery</span><span>{delivery === 0 ? 'Free' : formatPrice(delivery)}</span></div>
          <div className="flex justify-between border-t border-cream-200 pt-3 text-lg font-bold"><span>Total</span><span className="text-forest">{formatPrice(subtotal + delivery)}</span></div>
          <button className="btn-primary w-full" onClick={() => navigate('/checkout')}>Proceed to checkout</button>
          <Link to="/shop" className="btn-ghost w-full">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
