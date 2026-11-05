import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShoppingBag, ChevronLeft, Info } from 'lucide-react';
import api, { parseError } from '../services/api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { imageUrl } from '../utils/images';
import { formatPrice } from '../utils/format';
import { Badge, EmptyState, PageLoader, QuantitySelector } from '../components/ui';

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setProduct(null); setError('');
    api.get(`/products/${slug}`).then((r) => { setProduct(r.data.product); document.title = `${r.data.product.name} | Bimari Mitao Herbs`; })
      .catch((e) => setError(parseError(e).status === 404 ? 'not-found' : parseError(e).message));
  }, [slug]);

  if (error === 'not-found') return <div className="container-page py-20"><EmptyState title="Product not found" text="It may have been removed." action={<Link to="/shop" className="btn-primary">Back to shop</Link>} /></div>;
  if (error) return <div className="container-page py-20"><p className="text-center text-brand-red">{error}</p></div>;
  if (!product) return <PageLoader />;

  const available = product.isActive && product.inStock;
  const images = [...new Set([product.image, ...(product.gallery || [])])];
  const discount = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;

  return (
    <div className="container-page py-8 sm:py-12">
      <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-forest"><ChevronLeft size={16} /> All products</Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* gallery */}
        <div>
          <div className="flex items-center justify-center rounded-3xl bg-gradient-to-b from-leaf-100 to-cream-100 p-6">
            <img src={imageUrl(images[active])} alt={`${product.name} - view ${active + 1}`} className="max-h-[520px] w-auto object-contain mix-blend-multiply" width="540" height="960" />
          </div>
          {images.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button key={src} onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} aria-pressed={i === active}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white p-1 ${i === active ? 'border-forest' : 'border-cream-200'}`}>
                  <img src={imageUrl(src)} alt="" className="h-full w-full object-contain" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* info */}
        <div>
          <p className="eyebrow">{product.category}</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{product.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone={available ? 'green' : 'red'}>{available ? 'In stock' : 'Out of stock'}</Badge>
            {product.targetAge && <Badge tone="blue">Ages {product.targetAge}</Badge>}
            <Badge>Net weight {product.netWeight}</Badge>
          </div>
          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="text-4xl font-bold text-forest">{formatPrice(product.price)}</span>
            <span className={`text-ink-400 ${discount ? 'line-through' : ''}`}>MRP {formatPrice(product.mrp)}</span>
            {discount > 0 && <Badge tone="amber">{discount}% off</Badge>}
          </div>
          <p className="mt-5 leading-relaxed text-ink-500">{product.description}</p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <QuantitySelector value={qty} onChange={setQty} />
            <button className="btn-outline" disabled={!available} onClick={() => { add(product, qty); toast.success(`${qty} x ${product.name} added to cart`); }}><ShoppingBag size={16} /> Add to Cart</button>
            <button className="btn-primary" disabled={!available} onClick={() => { add(product, qty); navigate('/checkout'); }}>Buy Now</button>
          </div>

          <p className="mt-6 flex gap-2 rounded-xl bg-turmeric-100 p-4 text-sm text-amber-900"><Info size={18} className="mt-0.5 shrink-0" /> Adult supervision is recommended during brushing to minimize accidental swallowing. This is an Ayurvedic proprietary medicine.</p>
        </div>
      </div>

      <div className="mt-16 grid gap-8 lg:grid-cols-2">
        {product.ingredients?.length > 0 && (
          <section className="card p-6">
            <h2 className="text-2xl font-semibold">Ingredients</h2>
            <p className="text-sm text-ink-500">{product.ingredientsNote}</p>
            <table className="mt-4 w-full text-sm">
              <tbody>
                {product.ingredients.map((i) => (
                  <tr key={i.name} className="border-t border-cream-200"><td className="py-2.5">{i.name}</td><td className="py-2.5 text-right font-semibold text-forest">{i.percentage}%</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <div className="space-y-8">
          {product.benefits?.length > 0 && (
            <section className="card p-6">
              <h2 className="text-2xl font-semibold">Key benefits</h2>
              <ul className="mt-4 space-y-2 text-sm text-ink-500">{product.benefits.map((b) => <li key={b} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" />{b}</li>)}</ul>
            </section>
          )}
          {product.usage?.length > 0 && (
            <section className="card p-6">
              <h2 className="text-2xl font-semibold">How to use</h2>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink-500">{product.usage.map((u) => <li key={u}>{u}</li>)}</ol>
            </section>
          )}
        </div>
      </div>

      {product.ingredients?.some((i) => i.description) && (
        <section className="mt-8 card p-6">
          <h2 className="text-2xl font-semibold">About the herbs</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {product.ingredients.filter((i) => i.description).map((i) => (
              <div key={i.name}><dt className="font-semibold">{i.name}</dt><dd className="text-sm text-ink-500">{i.description}</dd></div>
            ))}
          </dl>
        </section>
      )}

      {product.specifications?.length > 0 && (
        <section className="mt-8 card p-6">
          <h2 className="text-2xl font-semibold">Specifications</h2>
          <dl className="mt-4 divide-y divide-cream-200 text-sm">
            {product.specifications.map((s) => (
              <div key={s.label} className="grid gap-1 py-3 sm:grid-cols-[220px_1fr]"><dt className="font-medium">{s.label}</dt><dd className="text-ink-500">{s.value}</dd></div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
