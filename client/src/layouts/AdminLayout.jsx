import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users, FileText, MessageSquare, Settings, Menu, X, LogOut, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../utils/images';

const nav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/content', label: 'Website content', icon: FileText },
  { to: '/admin/messages', label: 'Enquiries', icon: MessageSquare },
  { to: '/admin/settings', label: 'Store settings', icon: Settings },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => { setOpen(false); window.scrollTo({ top: 0 }); }, [pathname]);

  const Sidebar = (
    <div className="flex h-full flex-col bg-forest-900 text-cream">
      <div className="flex h-16 items-center justify-between px-5">
        <span className="rounded-lg bg-white px-2 py-1"><img src={BRAND.logo} alt="Bimari Mitao Herbs" className="h-7 w-auto" /></span>
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Admin">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${isActive ? 'bg-white/15 text-white' : 'text-cream/75 hover:bg-white/10'}`}>
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3 text-sm">
        <Link to="/" className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-cream/75 hover:bg-white/10"><Globe size={18} /> View website</Link>
        <button onClick={async () => { await logout(); navigate('/login'); }} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-cream/75 hover:bg-white/10"><LogOut size={18} /> Sign out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-100/60 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block">{Sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-72 animate-rise">{Sidebar}</div>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-cream-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-leaf-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
          <h1 className="font-display text-lg font-semibold">Admin</h1>
          <span className="truncate text-sm text-ink-500">{user?.name}</span>
        </header>
        <main className="p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
