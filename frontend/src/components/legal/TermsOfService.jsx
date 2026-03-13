import { Link } from 'react-router-dom';
import './LegalPages.css';

export default function TermsOfService() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-header">
          <Link to="/" className="back-link">← Back to Pharmacy Pilot</Link>
          <h1>Terms of Service</h1>
        </div>
        
        <div className="legal-content">
          <section>
            <h2>Service</h2>
            <p>Pharmacy Pilot provides pharmacy management software on a subscription basis. Our service includes inventory management, point of sale, reporting, and other pharmacy management features.</p>
          </section>

          <section>
            <h2>Payment</h2>
            <p>Payment is charged monthly via mobile money or bank transfer. Pricing plans:</p>
            <ul>
              <li>Starter: GHS 250 per month</li>
              <li>Growth: GHS 550 per month</li>
              <li>Pro: GHS 900 per month</li>
            </ul>
            <p>The first month is free on any plan.</p>
          </section>

          <section>
            <h2>Cancellation</h2>
            <p>You can cancel your subscription at any time. No refunds are provided for partial months. Service access continues until the end of your current billing period.</p>
          </section>

          <section>
            <h2>Data</h2>
            <p>Your pharmacy data belongs to you. We do not sell your data to third parties. You can request your data or account deletion at any time by contacting us.</p>
          </section>

          <section>
            <h2>Liability</h2>
            <p>Pharmacy Pilot is not liable for business losses resulting from use of the service. We recommend maintaining appropriate business insurance and backup procedures.</p>
          </section>

          <section>
            <h2>Changes</h2>
            <p>We may update these terms of service with 30 days notice via email. Continued use of the service after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>If you have any questions about these terms, please contact us at <a href="mailto:pharmacypilot@webdevv.io">pharmacypilot@webdevv.io</a>.</p>
          </section>
        </div>

        <div className="legal-footer">
          <p>Last updated: March 2026</p>
        </div>
      </div>
    </div>
  );
}
