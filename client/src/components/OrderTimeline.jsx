import { Check, XCircle } from 'lucide-react';
import { ORDER_STEPS } from '../utils/format';

/** Horizontal progress tracker for the order status. */
export default function OrderTimeline({ status }) {
  if (status === 'Cancelled') {
    return <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"><XCircle size={18} /> This order was cancelled</div>;
  }
  const current = ORDER_STEPS.indexOf(status);
  return (
    <ol className="flex items-start" aria-label="Order progress">
      {ORDER_STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step} className="relative flex flex-1 flex-col items-center text-center" aria-current={i === current ? 'step' : undefined}>
            {i > 0 && <span className={`absolute right-1/2 top-4 h-0.5 w-full ${i <= current ? 'bg-forest' : 'bg-cream-200'}`} aria-hidden />}
            <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${done ? 'border-forest bg-forest text-white' : 'border-cream-200 bg-white text-ink-400'}`}>
              {done ? <Check size={16} /> : i + 1}
            </span>
            <span className={`mt-2 text-[11px] font-medium sm:text-xs ${done ? 'text-forest' : 'text-ink-400'}`}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
