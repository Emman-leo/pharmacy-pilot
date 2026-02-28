import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Package, Receipt, FileText, BarChart3, ArrowRight } from 'lucide-react';
import './LandingPage.css';

const CONTACT_EMAIL = 'webdevv.info@gmail.com';

export default function LandingPage() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const form = e.target;
    const fd = new FormData(form);
    const payload = {
      pharmacy_name: fd.get('pharmacy_name') || '',
      contact_email: fd.get('contact_email') || '',
      contact_phone: fd.get('contact_phone') || '',
      message: fd.get('body') || '',
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send request');
      }
      setFormSubmitted(true);
      form.reset();
    } catch (error) {
      setSubmitError(error.message || 'An error occurred. Please try again.');
    }
  };
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header-inner">
          <span className="landing-logo">Pharmacy Pilot</span>
          <button className="landing-demo-btn" onClick={() => document.getElementById('screenshots')?.scrollIntoView({ behavior: 'smooth' })}>
            View demo
          </button>
          <Link to="/login" className="landing-login-btn">Log in</Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-hero-left">
            <div className="landing-hero-badge">
              🇬🇭 Built for Ghanaian pharmacies
            </div>
            <h1>Run your pharmacy like you have a full-time accountant, stock manager, and cashier.</h1>
            <p className="landing-hero-sub">
              Pharmacy Pilot handles inventory, sales, expiry alerts, and reports — so you focus on your patients, not your spreadsheets.
            </p>
            <div className="landing-hero-actions">
              <a href="#contact" className="btn btn-primary">Register your pharmacy</a>
              <button className="btn btn-ghost" onClick={() => document.getElementById('screenshots')?.scrollIntoView({ behavior: 'smooth' })}>
                See how it works <ArrowRight size={16} style={{ marginLeft: '4px' }} />
              </button>
            </div>
            <div className="landing-hero-trust">
              <span>✓ No setup fee</span>
              <span>✓ Ghana-based support</span>
            </div>
          </div>
          <div className="landing-hero-right">
            <div className="landing-hero-screenshot">
              <div className="screenshot-frame">
                <div className="screenshot-header">
                  <div className="screenshot-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="screenshot-title">Pharmacy Pilot Dashboard</span>
                </div>
                <div className="screenshot-content">
                  <div className="screenshot-sidebar">
                    <div className="sidebar-item active">Dashboard</div>
                    <div className="sidebar-item">Inventory</div>
                    <div className="sidebar-item">Point of Sale</div>
                    <div className="sidebar-item">Prescriptions</div>
                    <div className="sidebar-item">Reports</div>
                  </div>
                  <div className="screenshot-main">
                    <div className="screenshot-metric-cards">
                      <div className="metric-card">
                        <div className="metric-value">GHS 2,450</div>
                        <div className="metric-label">Today's Sales</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value">24</div>
                        <div className="metric-label">Transactions</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value">8</div>
                        <div className="metric-label">Low Stock Alerts</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value">3</div>
                        <div className="metric-label">Expiring Soon</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-social-proof">
        <div className="landing-social-proof-content">
          <p>Designed for independent pharmacies across Ghana</p>
        </div>
      </section>

      <section id="screenshots" className="landing-features">
        <h2>Everything you need to run your pharmacy</h2>
        
        <div className="feature-row">
          <div className="feature-row-content">
            <div className="feature-row-text">
              <div className="feature-icon">
                <Package size={32} />
              </div>
              <h3>Never run out of stock again</h3>
              <p>Set minimum stock levels for every drug. Get instant alerts when stock runs low or batches are about to expire — before it becomes a problem.</p>
            </div>
            <div className="feature-row-screenshot">
              <div className="feature-screenshot-frame">
                <div className="feature-screenshot-header">
                  <div className="feature-screenshot-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="feature-screenshot-title">Stock Alerts</span>
                </div>
                <div className="feature-screenshot-content">
                  <div className="alert-list">
                    <div className="alert-item critical">
                      <span className="alert-drug">Amoxicillin 500mg</span>
                      <span className="alert-quantity">12 units left</span>
                      <span className="alert-status">Critical</span>
                    </div>
                    <div className="alert-item warning">
                      <span className="alert-drug">Paracetamol 1000mg</span>
                      <span className="alert-quantity">28 units left</span>
                      <span className="alert-status">Low Stock</span>
                    </div>
                    <div className="alert-item expiring">
                      <span className="alert-drug">Ciprofloxacin 500mg</span>
                      <span className="alert-quantity">45 units</span>
                      <span className="alert-status">Expires in 15 days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="feature-row reverse">
          <div className="feature-row-content">
            <div className="feature-row-text">
              <div className="feature-icon">
                <Receipt size={32} />
              </div>
              <h3>Faster checkouts, zero calculation errors</h3>
              <p>Search drugs, add to cart, apply discounts, and print receipts in seconds. Every sale is recorded automatically — no manual entry needed.</p>
            </div>
            <div className="feature-row-screenshot">
              <div className="feature-screenshot-frame">
                <div className="feature-screenshot-header">
                  <div className="feature-screenshot-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="feature-screenshot-title">Point of Sale</span>
                </div>
                <div className="feature-screenshot-content">
                  <div className="pos-interface">
                    <div className="pos-cart">
                      <div className="cart-item">
                        <span className="cart-drug">Augmentin 625mg</span>
                        <span className="cart-qty">2x</span>
                        <span className="cart-price">GHS 45.00</span>
                      </div>
                      <div className="cart-item">
                        <span className="cart-drug">Ibuprofen 400mg</span>
                        <span className="cart-qty">1x</span>
                        <span className="cart-price">GHS 8.50</span>
                      </div>
                      <div className="cart-total">
                        <span>Total</span>
                        <span>GHS 53.50</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="feature-row">
          <div className="feature-row-content">
            <div className="feature-row-text">
              <div className="feature-icon">
                <BarChart3 size={32} />
              </div>
              <h3>Know your numbers without touching Excel</h3>
              <p>Daily revenue, top selling drugs, profit margins, slow moving stock — all generated automatically. Export to CSV for your accountant.</p>
            </div>
            <div className="feature-row-screenshot">
              <div className="feature-screenshot-frame">
                <div className="feature-screenshot-header">
                  <div className="feature-screenshot-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="feature-screenshot-title">Sales Reports</span>
                </div>
                <div className="feature-screenshot-content">
                  <div className="reports-dashboard">
                    <div className="report-summary">
                      <div className="summary-item">
                        <span className="summary-label">Today's Revenue</span>
                        <span className="summary-value">GHS 1,245</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Top Drug</span>
                        <span className="summary-value">Amoxicillin</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </section>

      <section className="landing-pricing">
        <div className="landing-pricing-content">
          <h2>Simple pricing, no surprises</h2>
          <p className="landing-pricing-sub">One plan that covers everything. Pay monthly via mobile money.</p>
          <div className="pricing-card">
            <div className="pricing-header">
              <h3>Pharmacy Pilot</h3>
              <div className="pricing-price">
                <span className="price-currency">GHS</span>
                <span className="price-amount">500</span>
                <span className="price-period">/ month</span>
              </div>
            </div>
            <div className="pricing-features">
              <div className="pricing-feature">
                <span className="pricing-check">✓</span>
                <span>Unlimited users</span>
              </div>
              <div className="pricing-feature">
                <span className="pricing-check">✓</span>
                <span>Inventory & batch tracking</span>
              </div>
              <div className="pricing-feature">
                <span className="pricing-check">✓</span>
                <span>Point of sale & receipts</span>
              </div>
              <div className="pricing-feature">
                <span className="pricing-check">✓</span>
                <span>Prescription management</span>
              </div>
              <div className="pricing-feature">
                <span className="pricing-check">✓</span>
                <span>Sales reports & analytics</span>
              </div>
              <div className="pricing-feature">
                <span className="pricing-check">✓</span>
                <span>Low stock & expiry alerts</span>
              </div>
              <div className="pricing-feature">
                <span className="pricing-check">✓</span>
                <span>Audit log</span>
              </div>
              <div className="pricing-feature">
                <span className="pricing-check">✓</span>
                <span>WhatsApp support</span>
              </div>
            </div>
            <button className="btn btn-primary btn-large btn-block" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
              Register your pharmacy →
            </button>
            <div className="pricing-footer">
              <p>First month free.</p>
              <p className="pricing-note">Have more than one branch? Contact us for multi-location pricing.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-how-it-works">
        <div className="landing-how-it-works-content">
          <h2>Getting started is simple</h2>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Register</h3>
                <p>Fill out the form below. We'll contact you within 24 hours to set up your pharmacy on the platform.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Onboarding</h3>
                <p>We sit with your team for a few hours and set everything up — drugs, stock levels, user accounts. You don't touch a line of code.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Go live</h3>
                <p>Your pharmacy is live. Process sales, track stock, and view reports from day one.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="landing-contact">
        <div className="landing-contact-header">
          <h2>Ready to get started?</h2>
          <p>We'll reach out within 24 hours.</p>
        </div>
        <p>
          Fill out the form below and we&apos;ll reach out shortly, or email us directly at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
        <form className="landing-contact-form" onSubmit={handleContactSubmit}>
          {submitError && <div className="form-error">{submitError}</div>}
          {formSubmitted && <div className="form-success">✓ Request received! We&apos;ll contact you shortly.</div>}
          <input
            type="text"
            name="pharmacy_name"
            placeholder="Pharmacy name"
            className="landing-input"
            required
          />
          <input
            type="email"
            name="contact_email"
            placeholder="Contact email"
            className="landing-input"
            required
            disabled={formSubmitted}
          />
          <input
            type="tel"
            name="contact_phone"
            placeholder="Contact phone"
            className="landing-input"
            disabled={formSubmitted}
          />
          <textarea
            name="body"
            placeholder="Tell us a bit about your pharmacy and what you need (optional)"
            className="landing-textarea"
            rows={3}
            disabled={formSubmitted}
          />
          <button type="submit" className="btn btn-primary btn-block" disabled={formSubmitted}>
            {formSubmitted ? 'Request sent' : 'Request registration'}
          </button>
        </form>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="footer-brand">
            <p>Pharmacy Pilot · Built in Ghana 🇬🇭</p>
          </div>
          <div className="footer-links">
            <a href="#privacy" className="footer-link">Privacy Policy</a>
            <a href="#terms" className="footer-link">Terms of Service</a>
            <a href="#contact" className="footer-link">Contact</a>
          </div>
          <div className="footer-copyright">
            <p>© 2026 Pharmacy Pilot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
