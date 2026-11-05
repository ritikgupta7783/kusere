import { useState } from 'react';
import api, { parseError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, ErrorNote, Field } from '../../components/ui';

export default function ChangePassword() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return setError('New passwords do not match');
    setBusy(true); setError('');
    try {
      await api.put('/account/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed. Other devices were signed out.');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { setError(parseError(err).message); } finally { setBusy(false); }
  };

  return (
    <section className="card max-w-lg p-6 sm:p-8">
      <h2 className="text-2xl font-semibold">Change password</h2>
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <ErrorNote>{error}</ErrorNote>
        <Field label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
        <Field label="New password" type="password" autoComplete="new-password" hint="8+ characters with upper-case, lower-case and a number" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required />
        <Field label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
        <Button type="submit" loading={busy}>Update password</Button>
      </form>
    </section>
  );
}
