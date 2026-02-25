import { Link } from 'react-router-dom';
import { useState } from 'react';
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
          <Link to="/login" className="landing-login-btn">Log in</Link>
        </div>
      </header>

      <section className="landing-hero">
        <h1>Smart pharmacy management, simplified</h1>
        <p className="landing-hero-sub">
          Inventory tracking, point of sale, prescriptions, and automated alerts — all in one place for your pharmacy.
        </p>
        <div className="landing-hero-actions">
          <Link to="/login" className="btn btn-primary">Log in</Link>
          <a href="#contact" className="btn btn-ghost">Register your pharmacy</a>
        </div>
      </section>

      <section className="landing-features">
        <h2>What Pharmacy Pilot offers</h2>
        <div className="landing-features-grid">
          <div className="landing-feature">
            <span className="landing-feature-icon">📦</span>
            <h3>Inventory & batch tracking</h3>
            <p>Manage drug master data, batch expiry, and FEFO (First Expiry, First Out). Get low-stock and expiry alerts.</p>
          </div>
          <div className="landing-feature">
            <span className="landing-feature-icon">🛒</span>
            <h3>Point of sale</h3>
            <p>Cart-based checkout with receipt generation for fast, accurate sales processing.</p>
          </div>
          <div className="landing-feature">
            <span className="landing-feature-icon">📋</span>
            <h3>Prescription workflow</h3>
            <p>Prescription creation and approval flow with dosage validation and drug interaction checks.</p>
          </div>
          <div className="landing-feature">
            <span className="landing-feature-icon">📊</span>
            <h3>Reports & analytics</h3>
            <p>Sales summaries, top-selling drugs, expiry reports, and role-based access control (ADMIN, STAFF).</p>
          </div>
        </div>
      </section>

      <section id="contact" className="landing-contact">
        <h2>Interested in joining?</h2>
        <p>
          Register your pharmacy and get started with Pharmacy Pilot. Fill out the form below and we&apos;ll reach out
          shortly, or email us directly at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
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
        <p>Pharmacy Pilot — smart pharmacy management</p>
        <Link to="/login" className="landing-footer-login">Log in for registered pharmacies</Link>
      </footer>
    </div>
  );
}
