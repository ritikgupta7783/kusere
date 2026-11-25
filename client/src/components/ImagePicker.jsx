import { useEffect, useState } from 'react';
import { Check, Upload } from 'lucide-react';
import api from '../services/api';
import { imageUrl } from '../utils/images';

/**
 * Lets the admin choose a bundled image or upload one to Cloudinary.
 */
export default function ImagePicker({ label, value, onChange, multiple = false }) {
  const [images, setImages] = useState([]);
  const [uploaded, setUploaded] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  useEffect(() => { api.get('/admin/images').then((r) => setImages(r.data.images)).catch(() => setImages([])); }, []);

  const selected = multiple ? value || [] : [value];
  const toggle = (path) => {
    if (!multiple) return onChange(path);
    onChange(selected.includes(path) ? selected.filter((p) => p !== path) : [...selected, path]);
  };
  const upload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (multiple && selected.length + files.length > 8) {
      setUploadError('A gallery can contain at most 8 images');
      event.target.value = '';
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const uploaded = [];
      for (const file of files) {
        const form = new FormData();
        form.append('image', file);
        const r = await api.post('/admin/uploads/image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        uploaded.push(r.data.url);
      }
      if (multiple) onChange([...selected, ...uploaded]);
      else onChange(uploaded[0]);
      setUploaded((current) => multiple ? [...current, ...uploaded.map((url) => ({ path: url, label: 'Cloudinary upload', kind: 'upload' }))] : [{ path: uploaded[0], label: 'Cloudinary upload', kind: 'upload' }]);
    } catch (error) {
      setUploadError(error.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <label className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cream-200 bg-white px-4 py-2.5 text-sm font-semibold text-forest hover:bg-leaf-100">
        <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload to Cloudinary'}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple={multiple} className="sr-only" onChange={upload} disabled={uploading} />
      </label>
      {uploadError && <p className="mb-3 text-xs text-brand-red">{uploadError}</p>}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {[...images, ...uploaded].map((img) => {
          const on = selected.includes(img.path);
          return (
            <button type="button" key={img.path} onClick={() => toggle(img.path)} aria-pressed={on} title={img.label}
              className={`relative overflow-hidden rounded-xl border-2 bg-white p-1.5 text-left transition ${on ? 'border-forest ring-2 ring-forest/20' : 'border-cream-200 hover:border-leaf'}`}>
              <img src={imageUrl(img.path)} alt={img.label} className="h-24 w-full rounded-lg bg-cream-100 object-contain" loading="lazy" />
              <span className="mt-1 line-clamp-2 block text-[11px] leading-tight text-ink-500">{img.label}</span>
              {on && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-forest text-white"><Check size={12} /></span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
