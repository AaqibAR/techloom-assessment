import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import api, { getUserId } from '../api';

export default function ShopPage({ cart, setCart }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: '', category: '', minPrice: '', maxPrice: '', inStock: false });
  const [selected, setSelected] = useState(null); // product detail view
  const [error, setError] = useState('');

  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [checkoutKey, setCheckoutKey] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payResult, setPayResult] = useState(null);

  async function loadCategories() {
    const res = await api.get('/products/categories');
    setCategories(res.data.filter(Boolean));
  }

  async function loadProducts() {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.category) params.category = filters.category;
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (filters.inStock) params.inStock = 'true';
    const res = await api.get('/products', { params });
    setProducts(res.data);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const t = setTimeout(loadProducts, 300); // light debounce for the search box
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { productId: product._id, name: product.name, price: product.price, quantity: 1 }];
    });
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  async function handleCheckout() {
    setError('');
    setPayResult(null);
    const key = checkoutKey || uuidv4();
    setCheckoutKey(key);
    try {
      const res = await api.post('/orders', {
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        idempotencyKey: key,
        userId: getUserId(),
      });
      setCheckoutOrder(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function handlePay() {
    if (!checkoutOrder) return;
    setPaying(true);
    setPayResult(null);
    try {
      const res = await api.post(`/orders/${checkoutOrder._id}/pay`);
      setPayResult(res.data.outcome);
      setCheckoutOrder(res.data.order);
      if (res.data.outcome === 'success' || res.data.outcome === 'failure') {
        setCart([]);
        setCheckoutKey(null);
        loadProducts();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setPaying(false);
    }
  }

  function cancelCheckout() {
    setCheckoutOrder(null);
    setCheckoutKey(null);
    setPayResult(null);
  }

  return (
    <div className="page">
      <div className="main-col">
        <h2>Shop</h2>
        {error && <p className="error">{error}</p>}

        <div className="filter-bar">
          <input
            placeholder="Search products..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            placeholder="Min price"
            type="number"
            value={filters.minPrice}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
          />
          <input
            placeholder="Max price"
            type="number"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filters.inStock}
              onChange={(e) => setFilters({ ...filters, inStock: e.target.checked })}
            />
            In stock only
          </label>
        </div>

        {selected && (
          <div className="detail-panel">
            <button className="link" onClick={() => setSelected(null)}>
              ← Back to results
            </button>
            <h3>{selected.name}</h3>
            <p className="muted">{selected.category}</p>
            <p>{selected.description || 'No description provided.'}</p>
            <p>${selected.price.toFixed(2)}</p>
            <p className={selected.stock === 0 ? 'out' : ''}>Stock: {selected.stock}</p>
            <button disabled={selected.stock === 0} onClick={() => addToCart(selected)}>
              Add to cart
            </button>
          </div>
        )}

        {!selected && (
          <div className="product-grid">
            {products.map((p) => (
              <div className="card" key={p._id}>
                <h3 className="link-title" onClick={() => setSelected(p)}>
                  {p.name}
                </h3>
                <p className="muted">{p.category}</p>
                <p>${p.price.toFixed(2)}</p>
                <p className={p.stock === 0 ? 'out' : ''}>Stock: {p.stock}</p>
                <div className="card-actions">
                  <button disabled={p.stock === 0} onClick={() => addToCart(p)}>
                    Add to cart
                  </button>
                </div>
              </div>
            ))}
            {products.length === 0 && <p>No products match your filters.</p>}
          </div>
        )}
      </div>

      <aside className="cart-col">
        <h2>Cart</h2>
        {cart.length === 0 && <p>Cart is empty</p>}
        {cart.map((i) => (
          <div className="cart-item" key={i.productId}>
            <span>
              {i.name} × {i.quantity}
            </span>
            <button className="link" onClick={() => removeFromCart(i.productId)}>
              remove
            </button>
          </div>
        ))}
        {cart.length > 0 && !checkoutOrder && (
          <button className="checkout-btn" onClick={handleCheckout}>
            Checkout (reserve stock)
          </button>
        )}

        {checkoutOrder && (
          <div className="checkout-panel">
            <p>
              Order status: <strong>{checkoutOrder.status}</strong>
            </p>
            {checkoutOrder.reservationExpiresAt && (
              <p className="muted">
                Reservation expires: {new Date(checkoutOrder.reservationExpiresAt).toLocaleTimeString()}
              </p>
            )}
            {payResult && <p>Payment outcome: {payResult}</p>}
            {checkoutOrder.status === 'Reserved' && (
              <button onClick={handlePay} disabled={paying}>
                {paying ? 'Processing...' : 'Pay now'}
              </button>
            )}
            <button className="link" onClick={cancelCheckout}>
              Close
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
