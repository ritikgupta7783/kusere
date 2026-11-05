import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingBag, User, LogOut, LayoutDashboard, UserCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../utils/images';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const { count } = useCart();
  const { user, isAdmin, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setOpen(false); setMenu(false); }, [pathname]);

  const linkCls = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${isActive ? 'bg-leaf-100 text-forest' : 'text-ink-500 hover:text-forest'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-cream-200/80 bg-cream/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-3 sm:h-[72px]">
        <Link to="/" aria-label="Bimari Mitao Herbs home" className="shrink-0">
          <img src={BRAND.logo} alt="Bimari Mitao Herbs" className="h-9 w-auto mix-blend-multiply sm:h-11" width="160" height="40" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>{l.label}</NavLink>)}
        </nav>

        <div className="flex items-center gap-1">
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} aria-label="Account menu" aria-expanded={menu}
              className="flex h-11 w-11 items-center justify-center rounded-full text-forest hover:bg-leaf-100">
              <User size={22} />
            </button>
            {menu && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-cream-200 bg-white p-1.5 shadow-soft animate-rise">
                {user ? (
                  <>
                    <p className="truncate px-3 py-2 text-xs text-ink-400">Signed in as<br /><span className="font-medium text-ink">{user.name}</span></p>
                    {isAdmin && <Link to="/admin/dashboard" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-leaf-100"><LayoutDashboard size={16} /> Admin dashboard</Link>}
                    <Link to="/account" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-leaf-100"><UserCircle size={16} /> My account</Link>
                    <button onClick={async () => { await logout(); navigate('/'); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-leaf-100"><LogOut size={16} /> Sign out</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="block rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-leaf-100">Sign in</Link>
                    <Link to="/login?mode=register" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-leaf-100">Create account</Link>
                  </>
                )}
              </div>
            )}
          </div>

          <Link to="/cart" aria-label={`Shopping cart, ${count} item${count === 1 ? '' : 's'}`} className="relative flex h-11 w-11 items-center justify-center rounded-full text-forest hover:bg-leaf-100">
            <ShoppingBag size={22} />
            {count > 0 && <span className="absolute right-0.5 top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-red px-1 text-[11px] font-bold text-white">{count}</span>}
          </Link>

          <button className="flex h-11 w-11 items-center justify-center rounded-full text-forest hover:bg-leaf-100 md:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-cream-200 bg-cream px-4 pb-4 pt-2 md:hidden" aria-label="Mobile">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `block rounded-xl px-4 py-3 text-base font-medium ${isActive ? 'bg-leaf-100 text-forest' : 'text-ink'}`}>{l.label}</NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
