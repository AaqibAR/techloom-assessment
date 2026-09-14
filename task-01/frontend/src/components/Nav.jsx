import { NavLink } from 'react-router-dom';

export default function Nav({ cartCount }) {
  return (
    <nav className="nav">
      <span className="brand">Task 01 — POS</span>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Products
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => (isActive ? 'active' : '')}>
          Orders
        </NavLink>
      </div>
      <span className="cart-badge">Cart: {cartCount}</span>
    </nav>
  );
}
