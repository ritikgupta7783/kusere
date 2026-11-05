import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import { PageLoader } from './components/ui';
import Home from './pages/Home';

// Everything except the home page is code-split so the first load stays fast.
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmed = lazy(() => import('./pages/OrderConfirmed'));
const Account = lazy(() => import('./pages/account/Account'));
const NotFound = lazy(() => import('./pages/NotFound'));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminOrderDetail = lazy(() => import('./pages/admin/OrderDetail'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminProductEdit = lazy(() => import('./pages/admin/ProductEdit'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers'));
const AdminCustomerDetail = lazy(() => import('./pages/admin/CustomerDetail'));
const AdminContent = lazy(() => import('./pages/admin/Content'));
const AdminMessages = lazy(() => import('./pages/admin/Messages'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="shop/:slug" element={<ProductDetails />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Navigate to="/login?mode=register" replace />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="cart" element={<Cart />} />

          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<Checkout />} />
            <Route path="order/:orderId/confirmed" element={<OrderConfirmed />} />
            <Route path="account/*" element={<Account />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="admin" element={<ProtectedRoute adminOnly />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:orderId" element={<AdminOrderDetail />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/:id" element={<AdminProductEdit />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="customers/:id" element={<AdminCustomerDetail />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
