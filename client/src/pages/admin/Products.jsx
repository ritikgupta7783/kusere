import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import api, { parseError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Badge, ErrorNote, PageLoader, Toggle } from '../../components/ui';
import { imageUrl } from '../../utils/images';
import { formatPrice } from '../../utils/format';

export default function Products() {
  const toast = useToast();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.get('/products', { params: { all: true } }).then((r) => setProducts(r.data.products)).catch((e) => setError(parseError(e).message));
  useEffect(() => { document.title = 'Products | Admin'; load(); }, []);

  const toggleActive = async (p) => {
    const { _id, createdAt, updatedAt, __v, id, available, ...rest } = p;
    try { await api.put(`/products/${p._id}`, { ...rest, isActive: !p.isActive }); toast.success(p.isActive ? 'Product deactivated' : 'Product activated'); load(); }
    catch (e) { toast.error(parseError(e).message); }
  };

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!products) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h2 className="text-3xl font-semibold">Products</h2><Link to="/admin/products/new" className="btn-primary btn-sm"><Plus size={16} /> Add product</Link></div>
      <ul className="grid gap-4 md:grid-cols-2">
        {products.map((p) => (
          <li key={p._id} className="card flex gap-4 p-4">
            <img src={imageUrl(p.image)} alt={p.name} className="h-28 w-20 shrink-0 rounded-xl bg-leaf-100 object-contain p-1" />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{p.name}</h3>{!p.isActive && <Badge tone="red">Inactive</Badge>}{!p.inStock && <Badge tone="amber">Out of stock</Badge>}</div>
              <p className="text-sm text-ink-500">{formatPrice(p.price)} <span className="text-ink-400 line-through">{p.mrp > p.price ? formatPrice(p.mrp) : ''}</span> &middot; MRP {formatPrice(p.mrp)}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                <Toggle checked={p.isActive} onChange={() => toggleActive(p)} label={p.isActive ? 'Active' : 'Inactive'} />
                <Link to={`/admin/products/${p._id}`} className="btn-outline btn-sm"><Pencil size={14} /> Edit</Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
