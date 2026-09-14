import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import ShopPage from './pages/ShopPage.jsx';
import OrderHistoryPage from './pages/OrderHistoryPage.jsx';

export default function App() {
  const [cart, setCart] = useState([]);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="app">
      <Nav cartCount={cartCount} />
      <Routes>
        <Route path="/" element={<ShopPage cart={cart} setCart={setCart} />} />
        <Route path="/orders" element={<OrderHistoryPage />} />
      </Routes>
    </div>
  );
}
