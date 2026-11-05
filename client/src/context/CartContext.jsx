import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const KEY = 'bmh_cart_v1';
const MAX_QTY = 20;

const load = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((i) => i && i.productId && i.quantity > 0) : [];
  } catch {
    return [];
  }
};

/**
 * Cart lines keep a display snapshot (name, image, price). The snapshot is only for showing the cart:
 * the server re-reads every price from MongoDB when the order is placed.
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage full or blocked */ }
  }, [items]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e) => { if (e.key === KEY) setItems(load()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((product, quantity = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.productId === product._id);
      if (found) return prev.map((i) => (i.productId === product._id ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i));
      return [...prev, { productId: product._id, slug: product.slug, name: product.name, image: product.image, price: product.price, mrp: product.mrp, quantity: Math.min(MAX_QTY, quantity) }];
    });
  }, []);

  const setQuantity = useCallback((productId, quantity) => {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(MAX_QTY, quantity)) } : i)));
  }, []);
  const remove = useCallback((productId) => setItems((prev) => prev.filter((i) => i.productId !== productId)), []);
  const clear = useCallback(() => setItems([]), []);

  /** Refreshes prices/names from the live catalogue and drops products that are no longer sold. Returns notes for the user. */
  const syncWithCatalogue = useCallback((products) => {
    const notes = [];
    setItems((prev) =>
      prev
        .map((i) => {
          const p = products.find((x) => x._id === i.productId);
          if (!p || !p.isActive) { notes.push(`${i.name} is no longer available and was removed.`); return null; }
          if (p.price !== i.price) notes.push(`The price of ${p.name} changed to Rs. ${p.price}.`);
          return { ...i, name: p.name, image: p.image, price: p.price, mrp: p.mrp, slug: p.slug, inStock: p.inStock };
        })
        .filter(Boolean)
    );
    return notes;
  }, []);

  const value = useMemo(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + Math.round(i.price * 100) * i.quantity, 0) / 100;
    return { items, count, subtotal, add, setQuantity, remove, clear, syncWithCatalogue, MAX_QTY };
  }, [items, add, setQuantity, remove, clear, syncWithCatalogue]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
