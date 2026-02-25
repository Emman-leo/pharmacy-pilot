const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'webdevv.info@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function submitContact(req, res) {
  const { pharmacy_name, contact_email, contact_phone, message } = req.body || {};

  if (!pharmacy_name || !contact_email) {
    return res.status(400).json({ error: 'Pharmacy name and contact email are required' });
  }

  const subject = `New pharmacy registration request: ${pharmacy_name}`;
  const textBody = [
    `Pharmacy: ${pharmacy_name}`,
    `Contact email: ${contact_email}`,
    contact_phone ? `Contact phone: ${contact_phone}` : null,
    '',
    message || '',
  ]
    .filter(Boolean)
    .join('\n');

  // If email provider is not configured yet, just log and return success
  if (!RESEND_API_KEY) {
    console.warn('[contact] RESEND_API_KEY not set; logging contact request instead of sending email.');
    console.info(textBody);
    return res.status(202).json({ message: 'Contact request received.' });
  }

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: CONTACT_EMAIL,
        to: CONTACT_EMAIL,
        subject,
        text: textBody,
        reply_to: contact_email,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error('[contact] Resend API error', resp.status, errText);
      return res.status(502).json({ error: 'Failed to send contact email' });
    }

    return res.json({ message: 'Contact request sent successfully.' });
  } catch (err) {
    console.error('[contact] Unexpected error', err);
    return res.status(500).json({ error: 'Failed to send contact email' });
  }
}

