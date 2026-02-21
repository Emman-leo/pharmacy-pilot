import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import './ReceiptViewer.css';

export default function ReceiptViewer() {
  const { id } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    api.get(`/sales/receipt/${id}`)
      .then(setReceipt)
      .catch(() => setReceipt(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (!receipt) return <p>Receipt not found.</p>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-viewer">
      <div className="receipt-actions no-print">
        <Link to="/app/sales" className="btn btn-ghost">← New Sale</Link>
        <button type="button" className="btn btn-primary" onClick={handlePrint}>Print receipt</button>
      </div>

      <div className="receipt">
        <header className="receipt-header">
          <h1>Pharmacy Pilot</h1>
          <p className="receipt-receipt-num">{receipt.receipt_number}</p>
          <p className="receipt-date">{new Date(receipt.sale_date).toLocaleString()}</p>
          {receipt.customer_name && <p>Customer: {receipt.customer_name}</p>}
        </header>

        <table className="receipt-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {(receipt.sale_items || []).map((si) => (
              <tr key={si.id}>
                <td>{si.drugs?.name || 'Unknown'}</td>
                <td>{si.quantity}</td>
                <td>${parseFloat(si.unit_price).toFixed(2)}</td>
                <td>${parseFloat(si.total_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-totals">
          <div className="receipt-row">
            <span>Subtotal</span>
            <span>${parseFloat(receipt.total_amount).toFixed(2)}</span>
          </div>
          {parseFloat(receipt.discount_amount) > 0 && (
            <div className="receipt-row">
              <span>Discount</span>
              <span>-${parseFloat(receipt.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="receipt-row receipt-total">
            <span>Total</span>
            <span>${parseFloat(receipt.final_amount).toFixed(2)}</span>
          </div>
        </div>

        <footer className="receipt-footer">
          <p>Thank you for your purchase</p>
        </footer>
      </div>
    </div>
  );
}
