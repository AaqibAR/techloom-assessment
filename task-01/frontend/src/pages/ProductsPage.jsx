import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import api from '../api';

export default function ProductsPage({ cart, setCart }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', stock: '' });
  const [error, setError] = useState('');
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [checkoutKey, setCheckoutKey] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payResult, setPayResult] = useState(null);

  async function loadProducts() {
    const res = await api.get('/products');
    setProducts(res.data);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleCreateProduct(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/products', {
        name: form.name,
        price: Number(form.price),
        stock: Number(form.stock),
      });
      setForm({ name: '', price: '', stock: '' });
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function handleDeleteProduct(id) {
    await api.delete(`/products/${id}`);
    loadProducts();
  }

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
      }
      // on 'timeout' the order stays Reserved — user can retry Pay
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
        <h2>Products</h2>
        {error && <p className="error">{error}</p>}

        <form className="inline-form" onSubmit={handleCreateProduct}>
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Price"
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
          <input
            placeholder="Stock"
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            required
          />
          <button type="submit">Add product</button>
        </form>

        <div className="product-grid">
          {products.map((p) => (
            <div className="card" key={p._id}>
              <h3>{p.name}</h3>
              <p>${p.price.toFixed(2)}</p>
              <p className={p.stock === 0 ? 'out' : ''}>Stock: {p.stock}</p>
              <div className="card-actions">
                <button disabled={p.stock === 0} onClick={() => addToCart(p)}>
                  Add to cart
                </button>
                <button className="danger" onClick={() => handleDeleteProduct(p._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
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
