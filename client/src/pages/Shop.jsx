import { useEffect, useState } from 'react';
import { PackageSearch } from 'lucide-react';
import api, { parseError } from '../services/api';
import ProductCard from '../components/ProductCard';
import { EmptyState, ErrorNote, PageLoader } from '../components/ui';

export default function Shop() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Shop | Bimari Mitao Herbs';
    api.get('/products').then((r) => setProducts(r.data.products)).catch((e) => setError(parseError(e).message));
  }, []);

  return (
    <div className="container-page py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="eyebrow">Shop</p>
        <h1 className="mt-2 text-4xl font-semibold">Ayurvedic oral care</h1>
        <p className="mt-3 text-ink-500">Herbal formulations from Bimari Mitao Herbs.</p>
      </div>
      <div className="mt-10">
        {error && <ErrorNote>{error}</ErrorNote>}
        {!products && !error && <PageLoader label="Loading products..." />}
        {products && products.length === 0 && <EmptyState icon={PackageSearch} title="No products available" text="Please check back soon." />}
        {products && products.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
