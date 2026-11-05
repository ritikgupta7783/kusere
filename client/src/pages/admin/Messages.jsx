import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import api, { parseError } from '../../services/api';
import useDebounce from '../../hooks/useDebounce';
import { useToast } from '../../context/ToastContext';
import { Badge, ErrorNote, PageLoader, Pagination } from '../../components/ui';
import { formatDate } from '../../utils/format';

export default function Messages() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [resolved, setResolved] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const dq = useDebounce(q);
  useEffect(() => { setPage(1); }, [dq, resolved]);

  const load = () => api.get('/admin/contact', { params: { q: dq, resolved, page } }).then((r) => { setData(r.data); setError(''); }).catch((e) => setError(parseError(e).message));
  useEffect(() => { document.title = 'Enquiries | Admin'; load(); /* eslint-disable-next-line */ }, [dq, resolved, page]);

  const mark = async (m, value) => {
    try { await api.patch(`/admin/contact/${m._id}/resolve`, { isResolved: value }); toast.success(value ? 'Marked as resolved' : 'Reopened'); load(); }
    catch (e) { toast.error(parseError(e).message); }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-3xl font-semibold">Enquiries</h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search size={18} className="absolute left-4 top-3 text-ink-400" /><input className="input pl-11" placeholder="Search messages" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search messages" /></div>
        <select className="input sm:w-48" value={resolved} onChange={(e) => setResolved(e.target.value)} aria-label="Filter"><option value="">All</option><option value="false">Open</option><option value="true">Resolved</option></select>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {!data && !error ? <PageLoader /> : data && (data.messages.length === 0 ? <p className="card p-8 text-center text-sm text-ink-500">No messages.</p> : (
        <ul className="space-y-4">
          {data.messages.map((m) => (
            <li key={m._id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="font-semibold">{m.name}</p><p className="text-sm text-ink-500"><a className="hover:text-forest" href={`mailto:${m.email}`}>{m.email}</a> &middot; <a className="hover:text-forest" href={`tel:${m.phone}`}>{m.phone}</a></p></div>
                <div className="flex items-center gap-2"><Badge tone={m.isResolved ? 'green' : 'amber'}>{m.isResolved ? 'Resolved' : 'Open'}</Badge><span className="text-xs text-ink-400">{formatDate(m.createdAt, true)}</span></div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm">{m.message}</p>
              <div className="mt-4"><button className="btn-outline btn-sm" onClick={() => mark(m, !m.isResolved)}>{m.isResolved ? 'Reopen' : 'Mark as resolved'}</button></div>
            </li>
          ))}
        </ul>
      ))}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  );
}
