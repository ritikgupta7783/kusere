import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { BRAND } from '../utils/images';

export default function Footer() {
  const { content, settings } = useSite();
  return (
    <footer className="mt-24 bg-forest-900 text-cream">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1.4fr]">
        <div>
          <span className="inline-block rounded-xl bg-white px-3 py-2"><img src={BRAND.logo} alt="Bimari Mitao Herbs" className="h-9 w-auto" width="140" height="36" loading="lazy" /></span>
          <p className="mt-4 max-w-sm text-sm text-cream/75">{content?.footerTagline}</p>
        </div>
        <nav aria-label="Footer">
          <h3 className="font-sans text-sm font-semibold uppercase tracking-widest text-turmeric">Explore</h3>
          <ul className="mt-4 space-y-2 text-sm text-cream/80">
            {[['/', 'Home'], ['/shop', 'Shop'], ['/about', 'About us'], ['/contact', 'Contact'], ['/account', 'My account']].map(([to, label]) => (
              <li key={to}><Link to={to} className="hover:text-white">{label}</Link></li>
            ))}
          </ul>
        </nav>
        <div>
          <h3 className="font-sans text-sm font-semibold uppercase tracking-widest text-turmeric">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm text-cream/80">
            {settings?.phone && <li className="flex gap-3"><Phone size={16} className="mt-0.5 shrink-0" /><a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="hover:text-white">{settings.phone}</a></li>}
            {settings?.email && <li className="flex gap-3"><Mail size={16} className="mt-0.5 shrink-0" /><a href={`mailto:${settings.email}`} className="break-all hover:text-white">{settings.email}</a></li>}
            {settings?.address && <li className="flex gap-3"><MapPin size={16} className="mt-0.5 shrink-0" /><span>{settings.address}</span></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-cream/60 sm:flex-row sm:justify-between">
          <p>{content?.footerNote}</p>
          <p className="shrink-0">&copy; {new Date().getFullYear()} {settings?.storeName || 'Bimari Mitao Herbs'}</p>
        </div>
      </div>
    </footer>
  );
}
