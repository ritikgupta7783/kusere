import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import api from '../services/api';
import { imageUrl } from '../utils/images';

/**
 * Lets the admin choose from the predefined local image library (GET /api/admin/images).
 * No upload. Pass `multiple` for galleries. In phase 2 this component can show Cloudinary assets instead.
 */
export default function ImagePicker({ label, value, onChange, multiple = false }) {
  const [images, setImages] = useState([]);
  useEffect(() => { api.get('/admin/images').then((r) => setImages(r.data.images)).catch(() => setImages([])); }, []);

  const selected = multiple ? value || [] : [value];
  const toggle = (path) => {
    if (!multiple) return onChange(path);
    onChange(selected.includes(path) ? selected.filter((p) => p !== path) : [...selected, path]);
  };

  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {images.map((img) => {
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
