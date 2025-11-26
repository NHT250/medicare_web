// Main App Component with React Router
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';

// Pages
import Homepage from './pages/Homepage';
import Auth from './pages/Auth';
import Register from './pages/Register';
import ProductsPage from './pages/Products';
import Cart from './pages/Cart';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import CustomerOrders from './pages/Orders';
import MyOrderDetail from './pages/MyOrderDetail';
import Profile from './pages/Profile';
import Forbidden from './pages/Forbidden';
import PaymentResult from './pages/PaymentResult';

import AdminLayout from './admin/AdminLayout';
import { RequireAdmin, RequireSignedIn } from './guards';
import Dashboard from './admin/pages/Dashboard';
import AdminProducts from './admin/pages/AdminProducts';
import AdminProductEditor from './admin/pages/AdminProductEditor';
import AdminUsers from './admin/pages/AdminUsers';
import AdminUserEditor from './admin/pages/AdminUserEditor';
import AdminOrders from './admin/pages/AdminOrders';
import AdminOrderDetail from './admin/pages/AdminOrderDetail';

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';
// Import Font Awesome (via CDN in index.html)
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Homepage />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Register />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/payment-result" element={<PaymentResult />} />
              <Route
                path="/checkout"
                element={
                  <RequireSignedIn>
                    <Checkout />
                  </RequireSignedIn>
                }
              />
              <Route
                path="/orders"
                element={
                  <RequireSignedIn>
                    <CustomerOrders />
                  </RequireSignedIn>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <RequireSignedIn>
                    <MyOrderDetail />
                  </RequireSignedIn>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireSignedIn>
                    <Profile />
                  </RequireSignedIn>
                }
              />
              <Route path="/403" element={<Forbidden />} />

              <Route
                path="/admin/*"
                element={
                  <RequireAdmin>
                    <AdminLayout />
                  </RequireAdmin>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/new" element={<AdminProductEditor mode="create" />} />
                <Route path="products/:id/edit" element={<AdminProductEditor mode="edit" />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="orders/:id" element={<AdminOrderDetail />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="users/:id" element={<AdminUserEditor />} />
              </Route>

              {/* Redirect unknown routes to homepage */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
