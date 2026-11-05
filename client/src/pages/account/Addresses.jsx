import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Pencil } from 'lucide-react';
import api, { parseError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, EmptyState, ErrorNote, Field, PageLoader } from '../../components/ui';

const blank = { label: '', fullName: '', phone: '', addressLine: '', pincode: '', district: '', state: '', isDefault: false };

export default function Addresses() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null); // null = closed
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/account/addresses').then((r) => setList(r.data.addresses)).catch((e) => setError(parseError(e).message));
  useEffect(() => { load(); }, []);

  const open = (a) => { setEditingId(a?._id || null); setForm(a ? { ...blank, ...a } : blank); setErrors({}); setError(''); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setErrors({});
    const { _id, user, createdAt, updatedAt, __v, ...payload } = form;
    try {
      if (editingId) await api.put(`/account/addresses/${editingId}`, payload); else await api.post('/account/addresses', payload);
      toast.success('Address saved'); setForm(null); load();
    } catch (err) { const p = parseError(err); setErrors(p.fields); setError(Object.keys(p.fields).length ? '' : p.message); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try { await api.delete(`/account/addresses/${id}`); toast.success('Address deleted'); load(); } catch (err) { toast.error(parseError(err).message); }
  };

  if (!list && !error) return <PageLoader />;

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Saved addresses</h2>
        {!form && <button className="btn-primary btn-sm" onClick={() => open(null)}><Plus size={16} /> Add address</button>}
      </div>

      {form && (
        <form onSubmit={save} className="card mt-5 space-y-4 p-6" noValidate>
          <h3 className="text-xl font-semibold">{editingId ? 'Edit address' : 'New address'}</h3>
          <ErrorNote>{error}</ErrorNote>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Label (e.g. Home)" value={form.label} onChange={set('label')} error={errors.label} />
            <Field label="Full name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} required />
            <Field label="Phone number" type="tel" inputMode="numeric" value={form.phone} onChange={set('phone')} error={errors.phone} required />
            <Field label="PIN code" inputMode="numeric" maxLength={6} value={form.pincode} onChange={set('pincode')} error={errors.pincode} required />
          </div>
          <Field as="textarea" label="Complete address" value={form.addressLine} onChange={set('addressLine')} error={errors.addressLine} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="District" value={form.district} onChange={set('district')} error={errors.district} required />
            <Field label="State" value={form.state} onChange={set('state')} error={errors.state} required />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-forest" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> Make this my default address</label>
          <div className="flex gap-3"><Button type="submit" loading={busy}>Save address</Button><button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button></div>
        </form>
      )}

      {list && list.length === 0 && !form && <div className="mt-6"><EmptyState icon={MapPin} title="No saved addresses" text="Addresses you use at checkout can be saved here." /></div>}
      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {list?.map((a) => (
          <li key={a._id} className="card p-5 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{a.label || 'Address'} {a.isDefault && <Badge tone="green">Default</Badge>}</p>
              <div className="flex gap-1">
                <button aria-label="Edit address" onClick={() => open(a)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-leaf-100"><Pencil size={16} /></button>
                <button aria-label="Delete address" onClick={() => remove(a._id)} className="flex h-9 w-9 items-center justify-center rounded-full text-brand-red hover:bg-red-50"><Trash2 size={16} /></button>
              </div>
            </div>
            <p className="mt-2">{a.fullName} &middot; {a.phone}</p>
            <p className="mt-1 text-ink-500">{a.addressLine}, {a.district}, {a.state} - {a.pincode}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
