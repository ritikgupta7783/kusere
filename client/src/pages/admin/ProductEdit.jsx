import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import api, { parseError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ImagePicker from '../../components/ImagePicker';
import { Button, ErrorNote, Field, PageLoader, Toggle } from '../../components/ui';

const blank = {
  name: '', slug: '', category: 'Ayurvedic Proprietary Medicine', shortDescription: '', description: '', mrp: 0, price: 0, netWeight: '', targetAge: '',
  ingredientsNote: '', ingredients: [], benefits: [], usage: [], specifications: [], image: '/assets/cavi-care-front.jpg', gallery: [], inStock: true, isActive: true, isFeatured: false,
};

/** Editable list of plain strings (benefits, usage steps). */
function StringList({ label, items, onChange }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="space-y-2">
        {items.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input className="input" aria-label={`${label} ${i + 1}`} value={v} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
            <button type="button" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-brand-red hover:bg-red-50"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => onChange([...items, ''])}><Plus size={14} /> Add</button>
    </div>
  );
}

export default function ProductEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(isNew ? blank : null);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) return;
    api.get(`/products/${id}`).then((r) => { const { _id, createdAt, updatedAt, __v, id: x, available, ...p } = r.data.product; setForm({ ...blank, ...p }); }).catch((e) => setError(parseError(e).message));
  }, [id, isNew]);

  if (error && !form) return <ErrorNote>{error}</ErrorNote>;
  if (!form) return <PageLoader />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setNum = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value === '' ? '' : Number(e.target.value) }));
  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setFields({});
    const payload = {
      ...form, mrp: Number(form.mrp), price: Number(form.price),
      slug: form.slug || undefined,
      benefits: form.benefits.map((s) => s.trim()).filter(Boolean), usage: form.usage.map((s) => s.trim()).filter(Boolean),
      ingredients: form.ingredients.map((i) => ({ ...i, percentage: Number(i.percentage) })),
      specifications: form.specifications.filter((s) => s.label?.trim() && s.value?.trim()),
    };
    try {
      if (isNew) await api.post('/products', payload); else await api.put(`/products/${id}`, payload);
      toast.success('Product saved'); navigate('/admin/products');
    } catch (err) { const p = parseError(err); setFields(p.fields || {}); setError(p.message); window.scrollTo({ top: 0, behavior: 'smooth' }); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="space-y-6" noValidate>
      <Link to="/admin/products" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-forest"><ChevronLeft size={16} /> Products</Link>
      <h2 className="text-3xl font-semibold">{isNew ? 'New product' : 'Edit product'}</h2>
      <ErrorNote>{error}</ErrorNote>

      <section className="card space-y-4 p-6">
        <h3 className="text-xl font-semibold">Basics</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={form.name} onChange={set('name')} error={fields.name} required />
          <Field label="Category" value={form.category} onChange={set('category')} error={fields.category} />
          <Field label="Net weight" value={form.netWeight} onChange={set('netWeight')} placeholder="e.g. 8 g" />
          <Field label="Target age" value={form.targetAge} onChange={set('targetAge')} placeholder="e.g. 2 to 18 years" />
          <Field label="MRP (Rs.)" type="number" min="0" step="0.01" value={form.mrp} onChange={setNum('mrp')} error={fields.mrp} required />
          <Field label="Selling price (Rs.)" type="number" min="0" step="0.01" value={form.price} onChange={setNum('price')} error={fields.price} required />
        </div>
        <Field label="Short description" value={form.shortDescription} onChange={set('shortDescription')} error={fields.shortDescription} />
        <Field as="textarea" label="Description" value={form.description} onChange={set('description')} error={fields.description} required />
        <div className="flex flex-wrap gap-6">
          <Toggle checked={form.isActive} onChange={(v) => upd('isActive', v)} label="Active (visible in shop)" />
          <Toggle checked={form.inStock} onChange={(v) => upd('inStock', v)} label="In stock" />
          <Toggle checked={form.isFeatured} onChange={(v) => upd('isFeatured', v)} label="Featured on home page" />
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h3 className="text-xl font-semibold">Images (choose from the local library)</h3>
        <ImagePicker label="Main image" value={form.image} onChange={(v) => upd('image', v)} />
        <ImagePicker label="Gallery images" multiple value={form.gallery} onChange={(v) => upd('gallery', v)} />
        {fields.image && <p className="text-xs text-brand-red">{fields.image}</p>}
      </section>

      <section className="card space-y-4 p-6">
        <h3 className="text-xl font-semibold">Ingredients</h3>
        <Field label="Heading note" value={form.ingredientsNote} onChange={set('ingredientsNote')} placeholder="e.g. Each 5g contains" />
        <div className="space-y-3">
          {form.ingredients.map((ing, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-cream-200 p-3 sm:grid-cols-[1fr_110px_44px]">
              <input className="input" aria-label="Ingredient name" placeholder="Name" value={ing.name} onChange={(e) => upd('ingredients', form.ingredients.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="input" aria-label="Percentage" type="number" min="0" max="100" step="0.1" placeholder="%" value={ing.percentage} onChange={(e) => upd('ingredients', form.ingredients.map((x, j) => (j === i ? { ...x, percentage: e.target.value } : x)))} />
              <button type="button" aria-label="Remove ingredient" onClick={() => upd('ingredients', form.ingredients.filter((_, j) => j !== i))} className="flex h-11 items-center justify-center rounded-xl text-brand-red hover:bg-red-50"><Trash2 size={16} /></button>
              <input className="input sm:col-span-3" aria-label="Ingredient description" placeholder="Description (optional)" value={ing.description || ''} onChange={(e) => upd('ingredients', form.ingredients.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost btn-sm" onClick={() => upd('ingredients', [...form.ingredients, { name: '', percentage: 0, description: '' }])}><Plus size={14} /> Add ingredient</button>
      </section>

      <section className="card space-y-5 p-6">
        <StringList label="Key benefits" items={form.benefits} onChange={(v) => upd('benefits', v)} />
        <StringList label="Usage instructions" items={form.usage} onChange={(v) => upd('usage', v)} />
        <div>
          <p className="label">Specifications</p>
          <div className="space-y-2">
            {form.specifications.map((s, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[200px_1fr_44px]">
                <input className="input" aria-label="Label" placeholder="Label" value={s.label} onChange={(e) => upd('specifications', form.specifications.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <input className="input" aria-label="Value" placeholder="Value" value={s.value} onChange={(e) => upd('specifications', form.specifications.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                <button type="button" aria-label="Remove" onClick={() => upd('specifications', form.specifications.filter((_, j) => j !== i))} className="flex h-11 items-center justify-center rounded-xl text-brand-red hover:bg-red-50"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => upd('specifications', [...form.specifications, { label: '', value: '' }])}><Plus size={14} /> Add specification</button>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-cream-200 bg-cream-100/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="submit" loading={busy}>Save product</Button>
        <Link to="/admin/products" className="btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}
