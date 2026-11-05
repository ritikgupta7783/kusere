import { useEffect, useState } from 'react';
import api, { parseError } from '../../services/api';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import ImagePicker from '../../components/ImagePicker';
import { Button, ErrorNote, Field, PageLoader } from '../../components/ui';

const TEXT_FIELDS = [
  ['Homepage', [['heroHeading', 'Hero heading', 'input'], ['heroDescription', 'Hero description', 'textarea'], ['promoBanner', 'Promotional banner text', 'input']]],
  ['About Us', [['aboutIntro', 'Introduction', 'textarea'], ['mission', 'Mission', 'textarea'], ['vision', 'Vision', 'textarea'], ['philosophy', 'Ayurvedic healthcare philosophy', 'textarea']]],
  ['Footer & contact page', [['footerTagline', 'Footer tagline', 'input'], ['footerNote', 'Footer note', 'textarea'], ['contactIntro', 'Contact page introduction', 'input']]],
];

export default function Content() {
  const { reload } = useSite();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Website content | Admin';
    api.get('/content').then((r) => { const { _id, key, createdAt, updatedAt, __v, ...c } = r.data.content; setForm(c); }).catch((e) => setError(parseError(e).message));
  }, []);

  if (error && !form) return <ErrorNote>{error}</ErrorNote>;
  if (!form) return <PageLoader />;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setFields({});
    try { await api.put('/admin/content', form); await reload(); toast.success('Website updated. Changes are live now.'); }
    catch (err) { const p = parseError(err); setFields(p.fields || {}); setError(p.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="space-y-6" noValidate>
      <div><h2 className="text-3xl font-semibold">Website content</h2><p className="text-sm text-ink-500">Edits appear on the public website immediately, with no redeploy.</p></div>
      <ErrorNote>{error}</ErrorNote>
      {TEXT_FIELDS.map(([title, list]) => (
        <section key={title} className="card space-y-4 p-6">
          <h3 className="text-xl font-semibold">{title}</h3>
          {list.map(([key, label, as]) => <Field key={key} as={as} label={label} value={form[key] || ''} onChange={set(key)} error={fields[key]} />)}
        </section>
      ))}
      <section className="card space-y-5 p-6">
        <h3 className="text-xl font-semibold">Images (local library)</h3>
        <ImagePicker label="Hero image" value={form.heroImage} onChange={(v) => setForm({ ...form, heroImage: v })} />
        <ImagePicker label="Promotional banner image" value={form.promoImage} onChange={(v) => setForm({ ...form, promoImage: v })} />
      </section>
      <p className="text-xs text-ink-400">Phone, email and address are edited under Store settings.</p>
      <Button type="submit" loading={busy}>Save changes</Button>
    </form>
  );
}
