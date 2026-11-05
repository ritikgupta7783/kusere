import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import api, { parseError } from '../../services/api';
import useDebounce from '../../hooks/useDebounce';
import { Badge, ErrorNote, PageLoader, Pagination } from '../../components/ui';
import { formatDate } from '../../utils/format';

export default function Customers() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const dq = useDebounce(q);
  useEffect(() => { setPage(1); }, [dq]);
  useEffect(() => {
    document.title = 'Customers | Admin';
    api.get('/admin/customers', { params: { q: dq, page } }).then((r) => { setData(r.data); setError(''); }).catch((e) => setError(parseError(e).message));
  }, [dq, page]);

  return (
    <div className="space-y-5">
      <h2 className="text-3xl font-semibold">Customers</h2>
      <div className="relative"><Search size={18} className="absolute left-4 top-3 text-ink-400" /><input className="input pl-11" placeholder="Search by name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" /></div>
      <ErrorNote>{error}</ErrorNote>
      {!data && !error ? <PageLoader /> : data && (
        <div className="card overflow-hidden">
          {data.customers.length === 0 ? <p className="p-8 text-center text-sm text-ink-500">No customers found.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-cream-100 text-xs uppercase tracking-wide text-ink-400"><tr><th className="px-5 py-3">Name</th><th>Email</th><th>Phone</th><th>Email status</th><th>Account</th><th>Joined</th></tr></thead>
                <tbody>
                  {data.customers.map((c) => (
                    <tr key={c._id} className="border-t border-cream-200 hover:bg-cream/60">
                      <td className="px-5 py-3"><Link to={`/admin/customers/${c._id}`} className="font-semibold text-forest hover:underline">{c.name}</Link></td>
                      <td className="break-all">{c.email}</td><td>{c.phone}</td>
                      <td><Badge tone={c.isEmailVerified ? 'green' : 'amber'}>{c.isEmailVerified ? 'Verified' : 'Unverified'}</Badge></td>
                      <td><Badge tone={c.isActive ? 'green' : 'red'}>{c.isActive ? 'Active' : 'Deactivated'}</Badge></td>
                      <td className="text-ink-500">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  );
}
