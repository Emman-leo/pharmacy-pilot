import { supabaseAdmin } from '../utils/db.js';

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
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const data = await response.json();

    if (!response.ok || !data.status || data.data.status !== 'success') {
      return res.status(400).json({ error: 'Payment not successful' });
    }

    return res.json({ status: 'success', amount: data.data.amount / 100, reference });
  } catch (err) {
    console.error('[payments] verifyPayment error', err);
    return res.status(500).json({ error: 'Failed to verify payment' });
  }
}

export async function paystackWebhook(req, res) {
  const crypto = await import('crypto');
  const secret = PAYSTACK_SECRET_KEY;
  const hash = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const { pharmacy_id } = event.data.metadata || {};
    const months = event.data.metadata?.months || 1;
    if (!pharmacy_id) return res.sendStatus(200);

    try {
      // Extend subscription by the specified number of months
      const newPeriodEnd = new Date();
      newPeriodEnd.setDate(newPeriodEnd.getDate() + (months * 30));

      await supabaseAdmin
        .from('pharmacies')
        .update({
          subscription_status: 'active',
          current_period_end: newPeriodEnd.toISOString().slice(0, 10),
        })
        .eq('id', pharmacy_id);

      console.log(`[payments] Subscription activated for pharmacy ${pharmacy_id} for ${months} month(s)`);
    } catch (err) {
      console.error('[payments] Failed to update subscription', err);
    }
  }

  res.sendStatus(200);
}
