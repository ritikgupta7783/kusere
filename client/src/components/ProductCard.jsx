import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { imageUrl } from '../utils/images';
import { formatPrice } from '../utils/format';
import { Badge } from './ui';

export default function ProductCard({ product }) {
  const { add } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const available = product.isActive && product.inStock;
  const hasDiscount = product.mrp > product.price;

  return (
    <article className="card group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-soft">
      <Link to={`/shop/${product.slug}`} className="relative block bg-gradient-to-b from-leaf-100 to-cream-100 p-6" aria-label={`View ${product.name}`}>
        <img src={imageUrl(product.image)} alt={product.name} loading="lazy" width="360" height="640"
          className="mx-auto h-72 w-auto object-contain mix-blend-multiply transition duration-500 group-hover:scale-105" />
        <span className="absolute left-4 top-4"><Badge tone={available ? 'green' : 'red'}>{available ? 'In stock' : 'Out of stock'}</Badge></span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow">{product.category}</p>
        <h3 className="mt-1 text-xl font-semibold">{product.name}</h3>
        <p className="mt-1 text-sm text-ink-500">{product.shortDescription}</p>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-forest">{formatPrice(product.price)}</span>
          {hasDiscount && <span className="text-sm text-ink-400 line-through">{formatPrice(product.mrp)}</span>}
          {!hasDiscount && <span className="text-xs text-ink-400">MRP</span>}
          <span className="ml-auto text-xs text-ink-400">{product.netWeight}</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link to={`/shop/${product.slug}`} className="btn-outline col-span-2">View Details</Link>
          <button className="btn-outline" disabled={!available} onClick={() => { add(product, 1); toast.success(`${product.name} added to cart`); }}>
            <ShoppingBag size={16} /> Add to Cart
          </button>
          <button className="btn-primary" disabled={!available} onClick={() => { add(product, 1); navigate('/checkout'); }}>Buy Now</button>
        </div>
      </div>
    </article>
  );
}
