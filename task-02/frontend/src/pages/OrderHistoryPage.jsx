import { useEffect, useState } from 'react';
import api, { getUserId } from '../api';

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  async function loadOrders() {
    try {
      const res = await api.get('/orders', { params: { userId: getUserId() } });
      setOrders(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handlePay(id) {
    try {
      await api.post(`/orders/${id}/pay`);
      loadOrders();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function handleCancel(id) {
    try {
      await api.post(`/orders/${id}/cancel`);
      loadOrders();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function handleRefund(id) {
    try {
      await api.post(`/orders/${id}/refund`);
      loadOrders();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  return (
    <div className="page">
      <div className="main-col">
        <h2>Order History</h2>
        <p className="muted">Showing orders for this browser ({getUserId()}) — no login required.</p>
        {error && <p className="error">{error}</p>}
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Items</th>
              <th>Status</th>
              <th>Refund</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id}>
                <td className="mono">{o._id.slice(-8)}</td>
                <td>{o.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}</td>
                <td>
                  <span className={`status status-${o.status.toLowerCase()}`}>{o.status}</span>
                </td>
                <td>{o.refunded ? `Refunded ${new Date(o.refundedAt).toLocaleDateString()}` : '—'}</td>
                <td>
                  {o.status === 'Reserved' && (
                    <>
                      <button onClick={() => handlePay(o._id)}>Pay</button>
                      <button className="danger" onClick={() => handleCancel(o._id)}>
                        Cancel
                      </button>
                    </>
                  )}
                  {o.status === 'Paid' && (
                    <button className="danger" onClick={() => handleCancel(o._id)}>
                      Cancel
                    </button>
                  )}
                  {o.status === 'Cancelled' && o.wasPaid && !o.refunded && (
                    <button onClick={() => handleRefund(o._id)}>Refund</button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan="5">No orders yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
