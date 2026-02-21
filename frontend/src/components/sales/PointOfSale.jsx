import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Cart from './Cart';
import './PointOfSale.css';

const AUTOCOMPLETE_MAX = 8;

export default function PointOfSale() {
  const [drugs, setDrugs] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [estimate, setEstimate] = useState({ total: 0 });
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef(null);
  const api = useApi();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/inventory/drugs').then(setDrugs).catch(console.error);
  }, []);

  const autocompleteList = search.trim()
    ? filtered.slice(0, AUTOCOMPLETE_MAX)
    : [];

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(drugs);
      setAutocompleteOpen(false);
      setHighlightedIndex(-1);
      return;
    }
    const q = search.toLowerCase();
    const matches = drugs.filter((d) =>
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.generic_name && d.generic_name.toLowerCase().includes(q))
    );
    setFiltered(matches);
    setAutocompleteOpen(matches.length > 0);
    setHighlightedIndex(0);
  }, [search, drugs]);

  const addToCart = useCallback((drug) => {
    setCart((prev) => {
      const found = prev.find((c) => c.drug_id === drug.id);
      if (found) {
        return prev.map((c) =>
          c.drug_id === drug.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { drug_id: drug.id, drug, quantity: 1 }];
    });
    setSearch('');
    setAutocompleteOpen(false);
    setHighlightedIndex(-1);
    searchRef.current?.focus();
  }, []);

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

  const checkout = useCallback(async () => {
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
      navigate(`/app/sales/receipt/${sale.id}`);
    } catch (err) {
      alert(err.message || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  }, [cart, customerName, discount, api, navigate]);

  const handleSearchKeyDown = (e) => {
    if (!autocompleteOpen || autocompleteList.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i < autocompleteList.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : autocompleteList.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const drug = autocompleteList[highlightedIndex];
      if (drug) addToCart(drug);
    } else if (e.key === 'Escape') {
      setAutocompleteOpen(false);
      setHighlightedIndex(-1);
    }
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        checkout();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [checkout]);

  return (
    <div className="pos">
      <div className="pos-header">
        <h1>Point of Sale</h1>
        <p className="pos-shortcuts">Ctrl+Enter: Checkout · Type to search, Enter to add</p>
      </div>

      <div className="pos-body">
        <div className="pos-products">
          <div className="pos-search-wrap">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search drugs (type name or generic)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => search.trim() && autocompleteList.length > 0 && setAutocompleteOpen(true)}
              onBlur={() => setTimeout(() => setAutocompleteOpen(false), 150)}
              onKeyDown={handleSearchKeyDown}
              className="pos-search"
            />
            {autocompleteOpen && autocompleteList.length > 0 && (
              <ul className="pos-autocomplete">
                {autocompleteList.map((d, i) => (
                  <li
                    key={d.id}
                    className={i === highlightedIndex ? 'pos-autocomplete-item highlighted' : 'pos-autocomplete-item'}
                    onMouseDown={(e) => { e.preventDefault(); addToCart(d); }}
                    onMouseEnter={() => setHighlightedIndex(i)}
                  >
                    <span className="pos-ac-name">{d.name}</span>
                    <span className="pos-ac-detail">{d.dosage || d.generic_name || ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
