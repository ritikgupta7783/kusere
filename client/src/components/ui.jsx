import { forwardRef, useId } from 'react';
import { Loader2, Minus, Plus } from 'lucide-react';

export const Spinner = ({ className = '' }) => <Loader2 className={`animate-spin ${className}`} aria-hidden />;

export const PageLoader = ({ label = 'Loading...' }) => (
  <div className="flex min-h-[40vh] items-center justify-center gap-3 text-ink-500" role="status">
    <Spinner className="text-forest" size={22} /> <span className="text-sm">{label}</span>
  </div>
);

export function Button({ variant = 'primary', loading = false, children, className = '', ...props }) {
  return (
    <button className={`btn-${variant} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
}

export const Field = forwardRef(function Field({ label, error, hint, as = 'input', className = '', children, ...props }, ref) {
  const id = useId();
  const Tag = as;
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="label">{label}</label>}
      <Tag id={id} ref={ref} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={`input ${as === 'textarea' ? 'min-h-[110px] resize-y' : ''} ${error ? 'input-error' : ''}`} {...props}>
        {children}
      </Tag>
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-400">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-xs text-brand-red" role="alert">{error}</p>}
    </div>
  );
});

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-sm">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-forest' : 'bg-cream-200'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
      {label}
    </label>
  );
}

export function QuantitySelector({ value, onChange, min = 1, max = 20, size = 'md' }) {
  const h = size === 'sm' ? 'h-9' : 'h-11';
  return (
    <div className={`inline-flex ${h} items-center rounded-full border border-cream-200 bg-white`} role="group" aria-label="Quantity">
      <button type="button" className="flex h-full w-10 items-center justify-center rounded-l-full hover:bg-leaf-100 disabled:opacity-40" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Decrease quantity"><Minus size={16} /></button>
      <span className="w-9 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className="flex h-full w-10 items-center justify-center rounded-r-full hover:bg-leaf-100 disabled:opacity-40" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Increase quantity"><Plus size={16} /></button>
    </div>
  );
}

const TONES = {
  green: 'bg-leaf-100 text-forest', amber: 'bg-turmeric-100 text-amber-800', red: 'bg-red-50 text-red-700',
  gray: 'bg-cream-100 text-ink-500', blue: 'bg-indigo-50 text-brand-indigo',
};
export const Badge = ({ tone = 'gray', children }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>
);

const ORDER_TONE = { Pending: 'amber', Confirmed: 'blue', Processing: 'blue', Shipped: 'blue', Delivered: 'green', Cancelled: 'red' };
const PAY_TONE = { Pending: 'amber', Paid: 'green', Failed: 'red', 'COD Pending': 'amber', Refunded: 'gray' };
export const OrderStatusBadge = ({ status }) => <Badge tone={ORDER_TONE[status] || 'gray'}>{status}</Badge>;
export const PaymentStatusBadge = ({ status }) => <Badge tone={PAY_TONE[status] || 'gray'}>{status}</Badge>;

export const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="card mx-auto flex max-w-md flex-col items-center px-6 py-12 text-center">
    {Icon && <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-leaf-100 text-forest"><Icon size={26} /></span>}
    <h2 className="text-xl font-semibold">{title}</h2>
    {text && <p className="mt-2 text-sm text-ink-500">{text}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export const ErrorNote = ({ children }) =>
  children ? <p className="rounded-xl border border-brand-red/30 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{children}</p> : null;

export const Pagination = ({ page, pages, onChange }) =>
  pages > 1 ? (
    <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
      <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span className="text-ink-500">Page {page} of {pages}</span>
      <button className="btn-outline btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  ) : null;
