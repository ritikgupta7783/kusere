import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import api, { parseError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, ErrorNote, Field } from '../../components/ui';
import { formatDate } from '../../utils/format';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setErrors({});
    try {
      const { data } = await api.put('/account/profile', form);
      setUser(data.user); toast.success('Profile updated');
    } catch (err) { const p = parseError(err); setErrors(p.fields); setError(Object.keys(p.fields).length ? '' : p.message); }
    finally { setBusy(false); }
  };

  return (
    <section className="card p-6 sm:p-8">
      <h2 className="text-2xl font-semibold">Profile</h2>
      <dl className="mt-4 grid gap-4 rounded-xl bg-cream-100 p-4 text-sm sm:grid-cols-2">
        <div><dt className="text-ink-400">Email</dt><dd className="font-medium break-all">{user.email}</dd></div>
        <div><dt className="text-ink-400">Email status</dt><dd className="mt-0.5">{user.isEmailVerified ? <Badge tone="green"><BadgeCheck size={14} className="mr-1" /> Verified</Badge> : <Badge tone="amber">Not verified</Badge>}</dd></div>
        <div><dt className="text-ink-400">Member since</dt><dd className="font-medium">{formatDate(user.createdAt)}</dd></div>
      </dl>
      <form onSubmit={save} className="mt-6 space-y-4" noValidate>
        <ErrorNote>{error}</ErrorNote>
        <Field label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
        <Field label="Phone number" type="tel" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} required />
        <Button type="submit" loading={busy}>Save changes</Button>
      </form>
    </section>
  );
}
