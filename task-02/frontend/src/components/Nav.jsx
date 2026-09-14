import { NavLink } from 'react-router-dom';

export default function Nav({ cartCount }) {
  return (
    <nav className="nav">
      <span className="brand">Task 02 — Storefront</span>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Shop
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => (isActive ? 'active' : '')}>
          Order History
        </NavLink>
      </div>
      <span className="cart-badge">Cart: {cartCount}</span>
    </nav>
  );
}
