import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Leaf, ShieldCheck, Sparkles, Baby, Droplets, Check, ShoppingBag } from 'lucide-react';
import api from '../services/api';
import { useSite } from '../context/SiteContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { imageUrl, BRAND } from '../utils/images';
import { formatPrice } from '../utils/format';
import { Badge } from '../components/ui';

const trust = [
  { icon: Droplets, title: 'SLS-free', text: 'No harsh foaming agent' },
  { icon: ShieldCheck, title: 'Fluoride-free', text: 'As stated on the pack' },
  { icon: Leaf, title: 'Ayurvedic formula', text: 'Traditional herbs' },
  { icon: Baby, title: 'Ages 2 to 18', text: 'Made for growing smiles' },
];

export default function Home() {
  const { content, settings } = useSite();
  const { add } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    api.get('/products').then((r) => setProduct(r.data.products.find((p) => p.isFeatured) || r.data.products[0] || null)).catch(() => {});
  }, []);

  const available = product && product.isActive && product.inStock;
  const maxPct = product ? Math.max(...product.ingredients.map((i) => i.percentage)) : 50;

  return (
    <>
      {/* HERO */}
      <section className="leaf-bg overflow-hidden">
        <div className="container-page grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
          <div className="reveal">
            <Badge tone="green">Ayurvedic Proprietary Medicine</Badge>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] text-forest-900 sm:text-5xl lg:text-6xl">
              {content?.heroHeading || <span className="inline-block h-14 w-4/5 animate-pulse rounded-xl bg-cream-200" />}
            </h1>
            <p className="mt-5 max-w-xl text-base text-ink-500 sm:text-lg">{content?.heroDescription}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary">Shop Cavi-Care <ArrowRight size={18} /></Link>
              <a href="#how-to-use" className="btn-outline">How to use</a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500">
              {['SLS & fluoride free', 'Ages 2 to 18 years', 'Adult supervision recommended'].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check size={16} className="text-leaf" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-x-6 bottom-0 top-10 rounded-[3rem] bg-gradient-to-br from-leaf-200 to-leaf-100" aria-hidden />
            <img src={imageUrl(content?.heroImage || BRAND.packFront)} alt="Cavi-Care Herbal Toothpaste tube" width="540" height="960" fetchpriority="high"
              className="relative mx-auto h-[420px] w-auto animate-floaty object-contain mix-blend-multiply drop-shadow-2xl sm:h-[520px]" />
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-cream-200 bg-white">
        <div className="container-page grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
          {trust.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-leaf-100 text-forest"><Icon size={20} /></span>
              <div><p className="text-sm font-semibold">{title}</p><p className="text-xs text-ink-500">{text}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCT */}
      {product && (
        <section className="container-page py-16 sm:py-24">
          <div className="card grid overflow-hidden md:grid-cols-2">
            <div className="flex items-center justify-center bg-gradient-to-br from-cream-100 to-leaf-100 p-8">
              <img src={imageUrl(product.gallery?.[1] || product.image)} alt={`${product.name} - packaging`} loading="lazy" className="max-h-[420px] w-auto object-contain mix-blend-multiply" />
            </div>
            <div className="p-7 sm:p-10">
              <p className="eyebrow">Featured product</p>
              <h2 className="mt-2 text-3xl font-semibold">{product.name}</h2>
              <p className="mt-3 text-ink-500">{product.shortDescription}</p>
              <div className="mt-5 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-forest">{formatPrice(product.price)}</span>
                <span className="text-sm text-ink-400">MRP {formatPrice(product.mrp)} &middot; {product.netWeight}</span>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <button className="btn-outline" disabled={!available} onClick={() => { add(product, 1); toast.success('Added to cart'); }}><ShoppingBag size={16} /> Add to Cart</button>
                <button className="btn-primary" disabled={!available} onClick={() => { add(product, 1); navigate('/checkout'); }}>Buy Now</button>
                <Link to={`/shop/${product.slug}`} className="btn-ghost">View details</Link>
              </div>
              {!available && <p className="mt-3 text-sm text-brand-red">Currently unavailable</p>}
            </div>
          </div>
        </section>
      )}

      {/* BENEFITS */}
      {product?.benefits?.length > 0 && (
        <section className="bg-forest-900 py-16 text-cream sm:py-24">
          <div className="container-page">
            <p className="eyebrow !text-turmeric">Why Cavi-Care</p>
            <h2 className="mt-2 max-w-xl text-3xl font-semibold text-white sm:text-4xl">Gentle, herbal oral care for children and teens</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {product.benefits.map((b, i) => (
                <div key={b} className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
                  <span className="font-display text-3xl text-turmeric">0{i + 1}</span>
                  <p className="mt-3 text-sm leading-relaxed text-cream/90">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* INGREDIENTS */}
      {product?.ingredients?.length > 0 && (
        <section className="container-page py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="eyebrow">Ayurvedic ingredients</p>
              <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Rooted in traditional herbs</h2>
              <p className="mt-4 text-ink-500">{product.ingredientsNote || 'Composition'}: a blend led by Kantkari, with Babool, Turmeric, Nilgiri, Tomar, Majufal and Clove Bud.</p>
              <Link to={`/shop/${product.slug}`} className="btn-outline mt-6">Full product details</Link>
            </div>
            <ul className="space-y-4">
              {product.ingredients.map((ing) => (
                <li key={ing.name} className="card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{ing.name}</span>
                    <span className="text-sm font-bold text-forest">{ing.percentage}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-100" aria-hidden>
                    <div className="h-full rounded-full bg-gradient-to-r from-leaf to-forest" style={{ width: `${Math.max(3, (ing.percentage / maxPct) * 100)}%` }} />
                  </div>
                  {ing.description && <p className="mt-2 text-xs text-ink-500">{ing.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* HOW TO USE */}
      <section id="how-to-use" className="bg-white py-16 sm:py-24">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">How to use</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Four simple steps</h2>
            <ol className="mt-8 space-y-5">
              {(product?.usage || []).map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-bold text-white">{i + 1}</span>
                  <p className="pt-1 text-ink-500">{step}</p>
                </li>
              ))}
            </ol>
          </div>
          <img src={BRAND.howToUse} alt="Cavi-Care usage schedule: after breakfast, after lunch and after dinner" loading="lazy" className="mx-auto max-h-[560px] w-auto rounded-3xl shadow-soft" />
        </div>
      </section>

      {/* ABOUT */}
      <section className="container-page py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Sparkles className="mx-auto text-turmeric" />
          <p className="eyebrow mt-3">About the brand</p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Ayurvedic healthcare from Jonai, Assam</h2>
          <p className="mt-5 text-ink-500">{content?.aboutIntro}</p>
          <Link to="/about" className="btn-outline mt-7">Our story</Link>
        </div>
      </section>

      {/* PROMO */}
      <section className="container-page">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-leaf-100 to-cream-100">
          <div className="grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-2">
            <div>
              <p className="eyebrow">Cavi-Care</p>
              <h2 className="mt-2 text-3xl font-semibold text-forest-900">{content?.promoBanner}</h2>
              <Link to="/shop" className="btn-primary mt-6">Shop now <ArrowRight size={18} /></Link>
            </div>
            <img src={imageUrl(content?.promoImage || BRAND.promoCollage)} alt="Cavi-Care promotional graphic" loading="lazy" className="w-full rounded-2xl shadow-soft" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-16 sm:py-24">
        <div className="rounded-3xl bg-forest px-6 py-12 text-center text-white sm:py-16">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold sm:text-4xl">Start a healthy brushing habit today</h2>
          <p className="mx-auto mt-3 max-w-xl text-cream/80">Cavi-Care Herbal Toothpaste{product ? ` - ${formatPrice(product.price)}` : ''}. Delivered to your door{settings?.codEnabled ? ', pay online or on delivery' : ''}.</p>
          <Link to="/shop" className="btn-accent mt-7">Buy Cavi-Care <ArrowRight size={18} /></Link>
        </div>
      </section>
    </>
  );
}
