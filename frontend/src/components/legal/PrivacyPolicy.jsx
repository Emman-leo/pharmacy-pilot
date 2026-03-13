import { Link } from 'react-router-dom';
import './LegalPages.css';

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-header">
          <Link to="/" className="back-link">← Back to Pharmacy Pilot</Link>
          <h1>Privacy Policy</h1>
        </div>
        
        <div className="legal-content">
          <section>
            <h2>What we collect</h2>
            <p>We collect the following information to provide the Pharmacy Pilot service:</p>
            <ul>
              <li>Pharmacy name and contact details</li>
              <li>Sales data and transaction records</li>
              <li>Inventory data and stock levels</li>
              <li>Staff accounts and user information</li>
            </ul>
          </section>

          <section>
            <h2>Why we collect it</h2>
            <p>We collect this information solely to provide the Pharmacy Pilot service to your pharmacy. This includes managing inventory, processing sales, generating reports, and maintaining user accounts.</p>
          </section>

          <section>
            <h2>How it's stored</h2>
            <p>Your data is stored securely on Supabase servers with encryption. We maintain automatic backups to ensure data integrity and availability.</p>
          </section>

          <section>
            <h2>Who has access</h2>
            <p>Only your pharmacy's authorized staff members and Pharmacy Pilot administrators have access to your data. We do not share your information with third parties.</p>
          </section>

          <section>
            <h2>Your rights</h2>
            <p>You have the right to request a copy of your data or request deletion of your data at any time. To exercise these rights, please email us at <a href="mailto:pharmacypilot@webdevv.io">pharmacypilot@webdevv.io</a>.</p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>If you have any questions about this privacy policy, please contact us at <a href="mailto:pharmacypilot@webdevv.io">pharmacypilot@webdevv.io</a>.</p>
          </section>

          <section className="legal-footer-note">
            <p>Pharmacy Pilot complies with the Ghana Data Protection Act 2012 (Act 843)</p>
          </section>
        </div>

        <div className="legal-footer">
          <p>Last updated: March 2026</p>
        </div>
      </div>
    </div>
  );
}
