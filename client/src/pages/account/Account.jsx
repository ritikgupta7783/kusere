import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { User, MapPin, Package, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Profile from './Profile';
import Addresses from './Addresses';
import Orders from './Orders';
import OrderDetail from './OrderDetail';
import ChangePassword from './ChangePassword';

const tabs = [
  { to: '/account', label: 'Profile', icon: User, end: true },
  { to: '/account/orders', label: 'Orders', icon: Package },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/account/password', label: 'Password', icon: KeyRound },
];

export default function Account() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { document.title = 'My account | Bimari Mitao Herbs'; }, []);

  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-4xl font-semibold">My account</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Account" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium lg:rounded-xl ${isActive ? 'bg-forest text-white' : 'bg-white text-ink-500 hover:text-forest'} border border-cream-200`}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
          <button onClick={async () => { await logout(); navigate('/'); }} className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border border-cream-200 bg-white px-4 text-sm font-medium text-brand-red lg:rounded-xl"><LogOut size={16} /> Logout</button>
        </nav>
        <div className="min-w-0">
          <Routes>
            <Route index element={<Profile />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:orderId" element={<OrderDetail />} />
            <Route path="addresses" element={<Addresses />} />
            <Route path="password" element={<ChangePassword />} />
            <Route path="*" element={<Navigate to="/account" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
