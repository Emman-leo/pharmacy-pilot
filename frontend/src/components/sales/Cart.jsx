import './Cart.css';

export default function Cart({ cart, estimate = {}, onUpdateQty, onRemove, customerName, onCustomerChange, discount, onDiscountChange, onCheckout, checkingOut }) {
  const subtotal = estimate.total ?? 0;
  const discountAmount = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <div className="cart">
      <h2 className="cart-title">Cart</h2>

      <input
        type="text"
        placeholder="Customer name (optional)"
        value={customerName}
        onChange={(e) => onCustomerChange(e.target.value)}
        className="cart-input"
      />

      <div className="cart-items">
        {cart.length === 0 ? (
          <p className="cart-empty">Cart is empty</p>
        ) : (
          cart.map((c) => (
            <div key={c.drug_id} className="cart-item">
              <span className="cart-item-name">{c.drug?.name || 'Unknown'}</span>
              <span className="cart-item-qty">
                <button type="button" className="cart-btn" onClick={() => onUpdateQty(c.drug_id, -1)}>−</button>
                {c.quantity}
                <button type="button" className="cart-btn" onClick={() => onUpdateQty(c.drug_id, 1)}>+</button>
              </span>
              <button type="button" className="cart-remove" onClick={() => onRemove(c.drug_id)}>×</button>
            </div>
          ))
        )}
      </div>

      <div className="cart-discount">
        <label>Discount</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={discount}
          onChange={(e) => onDiscountChange(e.target.value)}
          className="cart-input cart-input-sm"
        />
      </div>

      <div className="cart-totals">
        <div className="cart-row">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="cart-row">
            <span>Discount</span>
            <span>-${discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="cart-row cart-total">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block cart-checkout"
        onClick={onCheckout}
        disabled={cart.length === 0 || checkingOut}
      >
        {checkingOut ? 'Processing...' : 'Checkout'}
      </button>
    </div>
  );
}
