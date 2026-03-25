import { supabaseAdmin } from '../utils/db.js';
import { verifyPaystackSignature } from '../utils/paystackSignature.js';
import { isDuplicateKeyError } from '../utils/supabaseErrors.js';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const TIER_AMOUNTS = {
  starter: 25000,
  growth: 55000,
  pro: 90000,
};

export async function initializePayment(req, res) {
  try {
    const pharmacyId = req.userPharmacyId;
    const { months = 1 } = req.body;
    const validMonths = [1, 3, 6, 12].includes(months) ? months : 1;

    const { data: pharmacy, error } = await supabaseAdmin
      .from('pharmacies')
      .select('id, name, tier')
      .eq('id', pharmacyId)
      .single();

    if (error || !pharmacy) {
      return res.status(404).json({ error: 'Pharmacy not found' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', req.user.id)
      .single();

    const amount = (TIER_AMOUNTS[pharmacy.tier] || TIER_AMOUNTS.starter) * validMonths;
    const callbackUrl = `${process.env.FRONTEND_URL}/payment-success`;

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: profile.email,
        amount,
        currency: 'GHS',
        callback_url: callbackUrl,
        metadata: {
          pharmacy_id: pharmacyId,
          pharmacy_name: pharmacy.name,
          tier: pharmacy.tier,
          months: validMonths,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.status) {
      console.error('[payments] Paystack init error', data);
      return res.status(502).json({ error: 'Failed to initialize payment' });
    }

    return res.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (err) {
    console.error('[payments] initializePayment error', err);
    return res.status(500).json({ error: 'Failed to initialize payment' });
  }
}

export async function verifyPayment(req, res) {
  const { reference } = req.params;
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ error: 'Payment provider not configured' });
    }
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const data = await response.json();

    if (!response.ok || !data.status || data.data.status !== 'success') {
      return res.status(400).json({ error: 'Payment not successful' });
    }

    const paystackRef = data?.data?.reference || reference;
    const { pharmacy_id, months = 1 } = data.data.metadata || {};
    const validMonths = [1, 3, 6, 12].includes(Number(months)) ? Number(months) : 1;

    // Idempotency: only process a reference once
    const { error: insertErr } = await supabaseAdmin
      .from('payment_events')
      .insert({
        reference: paystackRef,
        event_source: 'verify',
        event_type: data?.data?.gateway_response || 'verify.success',
        pharmacy_id: pharmacy_id || null,
        months: validMonths,
        payload: data,
      });

    // Duplicate reference: already applied
    if (insertErr && isDuplicateKeyError(insertErr)) {
      return res.json({ status: 'success', amount: data.data.amount / 100, reference: paystackRef, already_processed: true });
    }

    if (insertErr) {
      console.error('[payments] verifyPayment idempotency insert error', insertErr);
      return res.status(503).json({ error: 'Unable to confirm payment at this time' });
    }

    // Apply subscription update once
    if (pharmacy_id) {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + (validMonths * 30));
      await supabaseAdmin
        .from('pharmacies')
        .update({
          subscription_status: 'active',
          current_period_end: newExpiry.toISOString().slice(0, 10),
        })
        .eq('id', pharmacy_id);
    }

    return res.json({ status: 'success', amount: data.data.amount / 100, reference: paystackRef });
  } catch (err) {
    console.error('[payments] verifyPayment error', err);
    return res.status(500).json({ error: 'Failed to verify payment' });
  }
}

export async function paystackWebhook(req, res) {
  const secret = PAYSTACK_SECRET_KEY;
  if (!secret) return res.status(500).send('Payment provider not configured');

  const signature = req.headers['x-paystack-signature'];
  const rawBody = req.body; // Buffer (set by express.raw in server.js)
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    return res.status(400).send('Invalid payload');
  }

  if (!verifyPaystackSignature(rawBody, secret, signature)) {
    return res.status(401).send('Invalid signature');
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  if (event.event === 'charge.success') {
    const reference = event?.data?.reference || event?.data?.id || null;
    const { pharmacy_id } = event.data.metadata || {};
    const months = event.data.metadata?.months || 1;
    if (!pharmacy_id) return res.sendStatus(200);

    try {
      const validMonths = [1, 3, 6, 12].includes(Number(months)) ? Number(months) : 1;

      // Idempotency: only process a reference once
      if (reference) {
        const { error: insertErr } = await supabaseAdmin
          .from('payment_events')
          .insert({
            reference: String(reference),
            event_source: 'webhook',
            event_type: event.event,
            pharmacy_id,
            months: validMonths,
            payload: event,
          });

        if (insertErr && isDuplicateKeyError(insertErr)) {
          return res.sendStatus(200);
        }
        if (insertErr) {
          console.error('[payments] webhook idempotency insert error', insertErr);
          return res.sendStatus(200);
        }
      }

      // Extend subscription by the specified number of months
      const newPeriodEnd = new Date();
      newPeriodEnd.setDate(newPeriodEnd.getDate() + (validMonths * 30));

      await supabaseAdmin
        .from('pharmacies')
        .update({
          subscription_status: 'active',
          current_period_end: newPeriodEnd.toISOString().slice(0, 10),
        })
        .eq('id', pharmacy_id);

      console.log(`[payments] Subscription activated for pharmacy ${pharmacy_id} for ${validMonths} month(s)`);
    } catch (err) {
      console.error('[payments] Failed to update subscription', err);
    }
  }

  res.sendStatus(200);
}
