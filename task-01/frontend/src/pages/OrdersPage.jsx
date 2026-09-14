import { useEffect, useState } from 'react';
import api from '../api';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  async function loadOrders() {
    try {
      const res = await api.get('/orders');
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

  return (
    <div className="page">
      <div className="main-col">
        <h2>Order History</h2>
        {error && <p className="error">{error}</p>}
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Items</th>
              <th>Status</th>
              <th>Reservation expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id}>
                <td className="mono">{o._id.slice(-8)}</td>
                <td>
                  {o.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                </td>
                <td>
                  <span className={`status status-${o.status.toLowerCase()}`}>{o.status}</span>
                </td>
                <td>
                  {o.reservationExpiresAt
                    ? new Date(o.reservationExpiresAt).toLocaleTimeString()
                    : '—'}
                </td>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
