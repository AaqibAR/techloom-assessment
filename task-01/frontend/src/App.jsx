import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';

export default function App() {
  const [cart, setCart] = useState([]);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="app">
      <Nav cartCount={cartCount} />
      <Routes>
        <Route path="/" element={<ProductsPage cart={cart} setCart={setCart} />} />
        <Route path="/orders" element={<OrdersPage />} />
      </Routes>
    </div>
  );
}
