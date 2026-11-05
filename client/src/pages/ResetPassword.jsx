import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { parseError } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Button, ErrorNote, Field } from '../components/ui';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setBusy(true); setError('');
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) { setError(parseError(err).message); } finally { setBusy(false); }
  };

  return (
    <div className="leaf-bg"><div className="container-page flex min-h-[60vh] items-center justify-center py-12">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6 sm:p-8" noValidate>
        <h1 className="text-center text-3xl font-semibold">Choose a new password</h1>
        {!token && <ErrorNote>This reset link is incomplete. Please open the link from your email again.</ErrorNote>}
        <ErrorNote>{error}</ErrorNote>
        <Field label="New password" type="password" autoComplete="new-password" placeholder="Create a strong password" hint="8+ characters with upper-case, lower-case and a number" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <Field label="Confirm new password" type="password" autoComplete="new-password" placeholder="Re-enter your password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
        <Button type="submit" loading={busy} disabled={!token} className="w-full">Update password</Button>
        <p className="text-center text-sm"><Link to="/login" className="font-semibold text-forest hover:underline">Back to sign in</Link></p>
      </form>
    </div></div>
  );
}
