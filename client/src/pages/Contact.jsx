import { useEffect, useState } from 'react';
import { Phone, Mail, MapPin, CheckCircle2 } from 'lucide-react';
import api, { parseError } from '../services/api';
import { useSite } from '../context/SiteContext';
import { Button, ErrorNote, Field } from '../components/ui';

const empty = { name: '', email: '', phone: '', message: '' };

export default function Contact() {
  const { content, settings } = useSite();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => { document.title = 'Contact | Bimari Mitao Herbs'; }, []);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setErrors({});
    try {
      await api.post('/contact', form);
      setDone(true); setForm(empty);
    } catch (err) {
      const p = parseError(err);
      setErrors(p.fields); setError(Object.keys(p.fields).length ? '' : p.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="container-page py-12 sm:py-16">
      <p className="eyebrow">Contact us</p>
      <h1 className="mt-2 text-4xl font-semibold">We would love to hear from you</h1>
      <p className="mt-3 max-w-xl text-ink-500">{content?.contactIntro}</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
        <div className="space-y-4">
          {[
            { icon: Phone, title: 'Phone', value: settings?.phone, href: settings && `tel:${settings.phone.replace(/\s/g, '')}` },
            { icon: Mail, title: 'Email', value: settings?.email, href: settings && `mailto:${settings.email}` },
            { icon: MapPin, title: 'Location', value: settings?.address },
          ].map(({ icon: Icon, title, value, href }) => (
            <div key={title} className="card flex gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-leaf-100 text-forest"><Icon size={20} /></span>
              <div className="min-w-0"><p className="text-sm font-semibold">{title}</p>
                {href ? <a href={href} className="break-words text-sm text-ink-500 hover:text-forest">{value}</a> : <p className="text-sm text-ink-500">{value}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="card p-6 sm:p-8">
          {done ? (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle2 size={48} className="text-leaf" />
              <h2 className="mt-4 text-2xl font-semibold">Message sent</h2>
              <p className="mt-2 text-sm text-ink-500">Thank you. We will get back to you soon.</p>
              <button className="btn-outline mt-6" onClick={() => setDone(false)}>Send another message</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4" noValidate>
              <ErrorNote>{error}</ErrorNote>
              <Field label="Name" placeholder="Enter your full name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" required />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" type="email" placeholder="Enter your email address" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" required />
                <Field label="Phone" type="tel" inputMode="tel" placeholder="Enter your phone number" value={form.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" required />
              </div>
              <Field as="textarea" label="Message" placeholder="How can we help?" value={form.message} onChange={set('message')} error={errors.message} required />
              <Button type="submit" loading={busy} className="w-full sm:w-auto">Send message</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
