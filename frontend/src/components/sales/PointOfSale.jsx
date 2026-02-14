import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Cart from './Cart';
import './PointOfSale.css';

export default function PointOfSale() {
  const [drugs, setDrugs] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [estimate, setEstimate] = useState({ total: 0 });
  const api = useApi();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/inventory/drugs').then(setDrugs).catch(console.error);
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(drugs);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(drugs.filter((d) =>
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.generic_name && d.generic_name.toLowerCase().includes(q))
    ));
  }, [search, drugs]);

  const addToCart = (drug) => {
    setCart((prev) => {
      const found = prev.find((c) => c.drug_id === drug.id);
      if (found) {
        return prev.map((c) =>
          c.drug_id === drug.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { drug_id: drug.id, drug, quantity: 1 }];
    });
  };

  const updateQty = (drugId, delta) => {
    setCart((prev) => {
      const item = prev.find((c) => c.drug_id === drugId);
      if (!item) return prev;
      const next = item.quantity + delta;
      if (next <= 0) return prev.filter((c) => c.drug_id !== drugId);
      return prev.map((c) =>
        c.drug_id === drugId ? { ...c, quantity: next } : c
      );
    });
  };

  const removeFromCart = (drugId) => {
    setCart((prev) => prev.filter((c) => c.drug_id !== drugId));
  };

  useEffect(() => {
    if (cart.length === 0) {
      setEstimate({ total: 0 });
      return;
    }
    const items = cart.map((c) => ({ drug_id: c.drug_id, quantity: c.quantity }));
    api.post('/sales/estimate', { items })
      .then(setEstimate)
      .catch(() => setEstimate({ total: 0 }));
  }, [cart]);

  const checkout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }
    setCheckingOut(true);
    try {
      const items = cart.map((c) => ({ drug_id: c.drug_id, quantity: c.quantity }));
      const sale = await api.post('/sales/checkout', {
        items,
        customer_name: customerName || undefined,
        discount_amount: parseFloat(discount) || 0,
      });
      setCart([]);
      setCustomerName('');
      setDiscount(0);
      navigate(`/sales/receipt/${sale.id}`);
    } catch (err) {
      alert(err.message || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="pos">
      <h1>Point of Sale</h1>

      <div className="pos-body">
        <div className="pos-products">
          <input
            type="text"
            placeholder="Search drugs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pos-search"
          />
          <div className="pos-grid">
            {filtered.map((d) => (
              <button
                key={d.id}
                type="button"
                className="pos-product"
                onClick={() => addToCart(d)}
              >
                <span className="pos-product-name">{d.name}</span>
                <span className="pos-product-detail">{d.dosage || d.category || '-'}</span>
                {d.controlled_drug && <span className="pos-controlled">CD</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="pos-cart">
          <Cart
            cart={cart}
            estimate={estimate}
            onUpdateQty={updateQty}
            onRemove={removeFromCart}
            customerName={customerName}
            onCustomerChange={setCustomerName}
            discount={discount}
            onDiscountChange={setDiscount}
            onCheckout={checkout}
            checkingOut={checkingOut}
          />
        </div>
      </div>
    </div>
  );
}
