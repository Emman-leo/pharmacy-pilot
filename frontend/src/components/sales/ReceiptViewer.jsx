import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../common/Spinner';
import './ReceiptViewer.css';

export default function ReceiptViewer() {
  const { id } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voiding, setVoiding] = useState(false);
  const [voidError, setVoidError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const api = useApi();
  const { isAdmin } = useAuth();

  useEffect(() => {
    api.get(`/sales/receipt/${id}`)
      .then(setReceipt)
      .catch((err) => {
        setError(err.message || 'Failed to load receipt');
        setReceipt(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleVoid = async () => {
    setVoiding(true);
    setVoidError('');
    try {
      const updatedReceipt = await api.post(`/sales/${id}/void`);
      setReceipt(updatedReceipt);
      setShowConfirm(false);
    } catch (err) {
      setVoidError(err.message || 'Failed to void sale');
    } finally {
      setVoiding(false);
    }
  };

  if (loading) return <Spinner label="Loading receipt…" />;
  if (!receipt) return <p>{error || 'Receipt not found.'}</p>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-viewer">
      <div className="receipt-actions no-print">
        <Link to="/app/sales" className="btn btn-ghost">← New Sale</Link>
        <Link to="/app/sales/history" className="btn btn-ghost">← Sales History</Link>
        <button type="button" className="btn btn-primary" onClick={handlePrint}>Print receipt</button>
        {isAdmin && receipt.status !== 'VOIDED' && (
          <button 
            type="button" 
            className="btn btn-danger" 
            onClick={() => setShowConfirm(true)}
          >
            Void sale
          </button>
        )}
      </div>

      {receipt.status === 'VOIDED' && (
        <div className="receipt-voided-banner">
          SALE VOIDED
        </div>
      )}

      {showConfirm && (
        <div className="void-confirm">
          <p><strong>Warning:</strong> This will reverse the sale and restore all stock. This cannot be undone.</p>
          {voidError && <div className="error-banner">{voidError}</div>}
          <div className="void-confirm-actions">
            <button 
              type="button" 
              className="btn btn-danger" 
              onClick={handleVoid}
              disabled={voiding}
            >
              {voiding ? 'Voiding…' : 'Confirm void'}
            </button>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => {
                setShowConfirm(false);
                setVoidError('');
              }}
              disabled={voiding}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
              <th>Price (₵)</th>
              <th>Total (₵)</th>
            </tr>
          </thead>
          <tbody>
            {(receipt.sale_items || []).map((si) => (
              <tr key={si.id}>
                <td>{si.drugs?.name || 'Unknown'}</td>
                <td>{si.quantity}</td>
                <td>₵{parseFloat(si.unit_price).toFixed(2)}</td>
                <td>₵{parseFloat(si.total_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-totals">
          <div className="receipt-row">
            <span>Subtotal</span>
            <span>₵{parseFloat(receipt.total_amount).toFixed(2)}</span>
          </div>
          {parseFloat(receipt.discount_amount) > 0 && (
            <div className="receipt-row">
              <span>Discount</span>
              <span>-₵{parseFloat(receipt.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="receipt-row receipt-total">
            <span>Total</span>
            <span>₵{parseFloat(receipt.final_amount).toFixed(2)}</span>
          </div>
        </div>

        <footer className="receipt-footer">
          <p>Thank you for your purchase</p>
        </footer>
      </div>
    </div>
  );
}
