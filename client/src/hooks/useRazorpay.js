import { useCallback } from 'react';
import api from '../services/api';
import { useSite } from '../context/SiteContext';

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'; // Razorpay's official Standard Checkout script

let scriptPromise;
const loadScript = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.onload = () => resolve(true);
      s.onerror = () => { scriptPromise = null; resolve(false); };
      document.body.appendChild(s);
    });
  }
  return scriptPromise;
};

/**
 * pay(orderId) -> 'paid' | 'failed' | 'dismissed'
 * The order is marked paid ONLY by the server after it verifies Razorpay's signature (or the webhook arrives).
 */
export default function useRazorpay() {
  const { settings } = useSite();

  const pay = useCallback(async (orderId) => {
    const ok = await loadScript();
    if (!ok) throw new Error('Could not load the payment window. Check your internet connection.');

    const { data: session } = await api.post('/payments/create-order', { orderId });

    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: session.keyId,
        amount: session.amount,
        currency: session.currency,
        order_id: session.razorpayOrderId,
        name: settings?.storeName || 'Bimari Mitao Herbs',
        description: `Order ${session.orderId}`,
        prefill: session.prefill,
        theme: { color: '#1B5E3A' },
        modal: { ondismiss: () => resolve('dismissed'), confirm_close: true },
        handler: async (response) => {
          try {
            await api.post('/payments/verify', { orderId, ...response });
            resolve('paid');
          } catch (e) {
            reject(e);
          }
        },
      });
      rzp.on('payment.failed', () => resolve('failed'));
      rzp.open();
    });
  }, [settings]);

  return pay;
}
