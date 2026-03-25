import { supabaseAdmin } from '../utils/db.js';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const ADMIN_EMAIL = 'pharmacypilot@webdevv.io';

export async function completeOnboarding(req, res) {
  const { pharmacy_name, phone, address, tier = 'starter' } = req.body || {};

  if (!pharmacy_name) {
    return res.status(400).json({ error: 'Pharmacy name is required' });
  }

  if (!['starter', 'growth', 'pro'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier' });
  }

  try {
    // Check user hasn't already completed onboarding
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('pharmacy_id, full_name, email')
      .eq('id', req.user.id)
      .single();

    if (profile?.pharmacy_id) {
      return res.status(400).json({ error: 'Onboarding already completed' });
    }

    // Set trial end date — 30 days from now
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    // Create pharmacy
    const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
      .from('pharmacies')
      .insert({
        name:                pharmacy_name,
        phone:               phone || null,
        address:             address || null,
        tier,
        subscription_status: 'trial',
        trial_ends_at:       trialEndsAt.toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (pharmacyError) throw pharmacyError;

    // Assign user as ADMIN
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        pharmacy_id: pharmacy.id,
        role:        'ADMIN',
      })
      .eq('id', req.user.id);

    if (profileError) throw profileError;

    // Send welcome email to client
    if (resend) {
      await resend.emails.send({
        from:    'Pharmacy Pilot <noreply@pharmacypilot.webdevv.io>',
        to:      profile.email,
        subject: 'Welcome to Pharmacy Pilot 🎉',
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
            <h2>Welcome to Pharmacy Pilot, ${profile.full_name || 'there'}!</h2>
            <p>Your pharmacy <strong>${pharmacy_name}</strong> is now set up on: <strong>${tier.charAt(0).toUpperCase() + tier.slice(1)}</strong> plan.</p>
            <p>You have a <strong>30-day free trial</strong> — no payment needed until ${trialEndsAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
            <p>Here's what to do next:</p>
            <ol>
              <li>Add your drugs under <strong>Drugs</strong></li>
              <li>Add stock under <strong>Inventory</strong> with cost and selling prices</li>
              <li>Start processing sales at <strong>Point of Sale</strong></li>
            </ol>
            <p>Need help? WhatsApp us anytime.</p>
            <p>— The Pharmacy Pilot Team</p>
          </div>
        `,
      }).catch(err => console.error('[onboarding] Welcome email failed:', err));
    }

    // Notify you of new signup
    if (resend) {
      await resend.emails.send({
        from:    'Pharmacy Pilot <noreply@pharmacypilot.webdevv.io>',
        to:      ADMIN_EMAIL,
        subject: `New signup: ${pharmacy_name}`,
        html: `
          <div style="font-family: sans-serif;">
            <h3>New pharmacy signed up</h3>
            <p><strong>Pharmacy:</strong> ${pharmacy_name}</p>
            <p><strong>Contact:</strong> ${profile.email}</p>
            <p><strong>Phone:</strong> ${phone || '—'}</p>
            <p><strong>Tier:</strong> ${tier}</p>
            <p><strong>Trial ends:</strong> ${trialEndsAt.toLocaleDateString('en-GB')}</p>
          </div>
        `,
      }).catch(err => console.error('[onboarding] Admin notification failed:', err));
    }

    res.status(201).json({ pharmacy, message: 'Onboarding complete' });
  } catch (err) {
    console.error('[onboarding] completeOnboarding error:', err);
    res.status(500).json({ error: err.message || 'Failed to complete onboarding' });
  }
}
