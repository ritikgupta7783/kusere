import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { parseError } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const LEGACY_KEY = 'bmh_cart_v1';
const GUEST_KEY = 'bmh_cart_v2_guest';
const MAX_QTY = 20;

const userKey = (id) => `bmh_cart_v2_user_${id}`;

const load = (key) => {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
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
  const { user, loading } = useAuth();
  const id = user?.id || user?._id;
  const activeKey = id ? userKey(id) : GUEST_KEY;
  const activeKeyRef = useRef(activeKey);
  activeKeyRef.current = activeKey;
  const [cart, setCart] = useState({ ownerKey: null, items: [] });
  const [syncError, setSyncError] = useState('');
  const previousKey = useRef(null);
  const hydrationId = useRef(0);
  const writeQueue = useRef(Promise.resolve());
  const items = !loading && cart.ownerKey === activeKey ? cart.items : [];

  useEffect(() => {
    if (loading) return;
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* storage blocked */ }
    const requestId = ++hydrationId.current;

    // A signed-out visitor starts with an empty cart after an account signs out.
    if (previousKey.current && previousKey.current !== GUEST_KEY && activeKey === GUEST_KEY) {
      try { localStorage.removeItem(GUEST_KEY); } catch { /* storage blocked */ }
      setCart({ ownerKey: GUEST_KEY, items: [] });
      setSyncError('');
    } else if (id) {
      setCart({ ownerKey: null, items: [] });
      const hydrate = async () => {
        try {
          const { data } = await api.get('/cart');
          if (requestId !== hydrationId.current) return;
          let savedItems = data.items;
          if (!data.exists) {
            const localItems = load(activeKey);
            if (localItems.length) {
              const { data: migrated } = await api.put('/cart', {
                items: localItems.map(({ productId, quantity }) => ({ productId, quantity })),
              });
              savedItems = migrated.items;
            }
          }
          if (requestId === hydrationId.current) {
            setCart({ ownerKey: activeKey, items: savedItems });
            setSyncError('');
          }
        } catch (error) {
          if (requestId === hydrationId.current) {
            setCart({ ownerKey: activeKey, items: load(activeKey) });
            setSyncError(parseError(error).message);
          }
        }
      };
      hydrate();
    } else {
      setCart({ ownerKey: activeKey, items: load(activeKey) });
      setSyncError('');
    }
    previousKey.current = activeKey;
  }, [activeKey, id, loading]);

  useEffect(() => {
    if (loading || cart.ownerKey !== activeKey) return;
    try { localStorage.setItem(activeKey, JSON.stringify(cart.items)); } catch { /* storage full or blocked */ }
    if (!id) return;

    const payload = cart.items.map(({ productId, quantity }) => ({ productId, quantity }));
    const timer = setTimeout(() => {
      const write = writeQueue.current.catch(() => {}).then(async () => {
        if (activeKeyRef.current !== activeKey) return;
        await api.put('/cart', { items: payload });
        if (activeKeyRef.current === activeKey) setSyncError('');
      });
      writeQueue.current = write.catch((error) => {
        if (activeKeyRef.current === activeKey) setSyncError(parseError(error).message);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [activeKey, cart, id, loading]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === activeKey && !loading) setCart({ ownerKey: activeKey, items: load(activeKey) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [activeKey, loading]);

  const updateItems = useCallback((update) => {
    if (loading) return;
    setCart((current) => ({
      ownerKey: activeKey,
      items: update(current.ownerKey === activeKey ? current.items : load(activeKey)),
    }));
  }, [activeKey, loading]);

  const add = useCallback((product, quantity = 1) => {
    updateItems((prev) => {
      const found = prev.find((i) => i.productId === product._id);
      if (found) return prev.map((i) => (i.productId === product._id ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i));
      return [...prev, { productId: product._id, slug: product.slug, name: product.name, image: product.image, price: product.price, mrp: product.mrp, quantity: Math.min(MAX_QTY, quantity) }];
    });
  }, [updateItems]);

  const setQuantity = useCallback((productId, quantity) => {
    updateItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(MAX_QTY, quantity)) } : i)));
  }, [updateItems]);
  const remove = useCallback((productId) => updateItems((prev) => prev.filter((i) => i.productId !== productId)), [updateItems]);
  const clear = useCallback(() => updateItems(() => []), [updateItems]);

  /** Refreshes prices/names from the live catalogue and drops products that are no longer sold. Returns notes for the user. */
  const syncWithCatalogue = useCallback((products) => {
    const notes = [];
    updateItems((prev) =>
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
  }, [updateItems]);

  const value = useMemo(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + Math.round(i.price * 100) * i.quantity, 0) / 100;
    return { items, count, subtotal, add, setQuantity, remove, clear, syncWithCatalogue, syncError, MAX_QTY };
  }, [items, add, setQuantity, remove, clear, syncWithCatalogue, syncError]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
