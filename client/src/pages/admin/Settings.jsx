import { useEffect, useState } from 'react';
import api, { parseError } from '../../services/api';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { Button, ErrorNote, Field, PageLoader, Toggle } from '../../components/ui';

export default function Settings() {
  const { reload, settings: pub } = useSite();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Store settings | Admin';
    api.get('/admin/settings').then((r) => { const { _id, key, createdAt, updatedAt, __v, ...s } = r.data.settings; setForm({ ...s, freeDeliveryAbove: s.freeDeliveryAbove ?? '' }); }).catch((e) => setError(parseError(e).message));
  }, []);

  if (error && !form) return <ErrorNote>{error}</ErrorNote>;
  if (!form) return <PageLoader />;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setFields({});
    try {
      await api.put('/admin/settings', { ...form, deliveryCharge: Number(form.deliveryCharge), freeDeliveryAbove: form.freeDeliveryAbove === '' ? null : Number(form.freeDeliveryAbove) });
      await reload(); toast.success('Settings saved');
    } catch (err) { const p = parseError(err); setFields(p.fields || {}); setError(p.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6" noValidate>
      <h2 className="text-3xl font-semibold">Store settings</h2>
      <ErrorNote>{error}</ErrorNote>
      <section className="card space-y-4 p-6">
        <h3 className="text-xl font-semibold">Store details</h3>
        <Field label="Store name" value={form.storeName} onChange={set('storeName')} error={fields.storeName} />
        <Field label="Phone" value={form.phone} onChange={set('phone')} error={fields.phone} />
        <Field label="Email" type="email" value={form.email} onChange={set('email')} error={fields.email} />
        <Field as="textarea" label="Store address" value={form.address} onChange={set('address')} error={fields.address} />
      </section>
      <section className="card space-y-4 p-6">
        <h3 className="text-xl font-semibold">Delivery &amp; payments</h3>
        <Field label="Delivery charge (Rs.)" type="number" min="0" step="0.01" value={form.deliveryCharge} onChange={set('deliveryCharge')} error={fields.deliveryCharge} hint="Applied to every order. Set 0 for free delivery." />
        <Field label="Free delivery above (Rs., optional)" type="number" min="0" step="0.01" value={form.freeDeliveryAbove} onChange={set('freeDeliveryAbove')} error={fields.freeDeliveryAbove} hint="Leave empty to always charge the delivery fee." />
        <Toggle checked={form.codEnabled} onChange={(v) => setForm({ ...form, codEnabled: v })} label="Cash on Delivery available" />
        <p className="rounded-xl bg-cream-100 p-3 text-xs text-ink-500">Online payment (Razorpay) is currently <strong>{pub?.onlinePaymentsAvailable ? 'enabled' : 'not configured'}</strong>. It is controlled by the Razorpay keys in the server .env file.</p>
      </section>
      <Button type="submit" loading={busy}>Save settings</Button>
    </form>
  );
}
