# Contact Form Setup Guide

## Overview
The contact form is currently non-functional because the Resend API email service is not configured. Follow these steps to enable pharmacy registration requests.

## Prerequisites
- Resend account (https://resend.com)
- Existing email address (Gmail, Outlook, etc.)

## Step 1: Create Resend Account
1. Sign up at https://resend.com
2. Verify your email address
3. Add a payment method (Resend has a free tier with limits)

## Step 2: Configure Email (Using Gmail/Outlook)
1. In Resend dashboard, go to "Domains"
2. Skip domain verification (not needed for Gmail/Outlook)
3. You can use any existing email address as the sender
4. No DNS configuration required for basic email sending

## Step 3: Get API Key
1. In Resend dashboard, go to "API Keys"
2. Create a new API key
3. Copy the API key (starts with `re_`)

## Step 4: Set Environment Variables
Add these to your backend environment (`.env` file or hosting platform):

```bash
# Email configuration
CONTACT_EMAIL=your-personal-email@gmail.com
RESEND_API_KEY=re_your_api_key_here
```

**Important**: `CONTACT_EMAIL` can be any existing email address (Gmail, Outlook, etc.). No domain verification required.

## Step 5: Test the Configuration
1. Restart your backend server
2. Go to the landing page
3. Fill out the contact form with test data
4. Check the email inbox for `CONTACT_EMAIL`

## Step 6: Monitor Usage
- Check Resend dashboard for email delivery status
- Monitor backend logs for any errors
- Free tier limits: 100 emails/day, 3,000 emails/month

## Troubleshooting

### Common Issues
- **Email not sending**: Check API key is correct and has proper permissions
- **Spam folder**: Check spam/junk folder and whitelist the sender
- **Gmail/Outlook limits**: Be aware of daily sending limits for personal accounts

### Error Codes
- `400`: Missing required fields (pharmacy_name, contact_email)
- `502`: Resend API error (check API key and email configuration)
- `500`: Server error (check backend logs)
- `202`: API key not configured (email logged to console instead)

### Testing Without Email
If you want to test without configuring email:
1. Remove `RESEND_API_KEY` from environment
2. Form submissions will be logged to console
3. You'll see the submission data in backend logs

## Production Considerations
- Consider upgrading to a custom domain for better deliverability
- Set up email monitoring and alerts
- Consider implementing rate limiting
- Add spam protection (reCAPTCHA, etc.)
- Set up email templates for better formatting
- Monitor Gmail/Outlook sending limits for high volume

## Security Notes
- Never commit API keys to version control
- Use environment-specific configuration
- Consider implementing additional validation
- Monitor for abuse/spam submissions
