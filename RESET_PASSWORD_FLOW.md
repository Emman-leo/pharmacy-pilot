# Password Reset Flow (Supabase)

This document explains how the **“Forgot password”** feature works in Pharmacy Pilot, and what you / your client need to configure.

## Overview

- Users click **“Forgot password?”** on the login screen and enter their email.
- The backend asks Supabase to send a **password reset email** with a magic link.
- The link redirects the user back to the app at **`/reset-password`**.
- The Reset Password page lets them set a **new password**, and then they sign in again normally.

## 1. Backend configuration

File: `backend/.env` (copy from `.env.example` if needed)

Required values:

- `SUPABASE_URL` – your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` – Service role key (keep this secret)
- `FRONTEND_URL` – URL of the frontend, for example:
  - Local: `http://localhost:5173`
  - Production: `https://pharmacy-pilot.vercel.app`

How it works:

- `authController.forgotPassword` calls:

  ```js
  supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${FRONTEND_URL}/reset-password`,
  });
  ```

- Supabase sends an email with a magic link that, when clicked, logs the user in (temporary session) and redirects to `/reset-password`.

## 2. Frontend configuration

File: `frontend/.env` (create it if it doesn’t exist)

Add:

```bash
VITE_SUPABASE_URL=<your Supabase URL>
VITE_SUPABASE_ANON_KEY=<your Supabase anon key>
```

These are used **only** for the reset-password page.

## 3. User flow

1. On the **Login** page:
   - User types their email.
   - Clicks **“Forgot password?”**.
   - App calls `POST /api/auth/forgot-password`.

2. Supabase sends an email:
   - Subject and content come from Supabase Auth settings.
   - Link target: `FRONTEND_URL/reset-password` with a short-lived access token.

3. On `/reset-password`:
   - The app uses Supabase JS (`supabase.auth.getSession()`) to verify there is a valid reset session.
   - User enters new password + confirmation.
   - App calls `supabase.auth.updateUser({ password: <newPassword> })`.
   - On success:
     - Local app token (`pharmacy_token`) is cleared.
     - User sees a confirmation message and a **“Back to login”** button.

4. User signs in again with their **new password** on the normal Login page.

## 4. Notes for production

- Make sure `FRONTEND_URL` in **backend** matches the actual deployed frontend URL.
- In Supabase Dashboard → **Authentication → URL Configuration**:
  - You can optionally set **Site URL** to the same `FRONTEND_URL`. This helps ensure reset links point back to your app.
- If the user opens an old / invalid reset link:
  - The app will not find a valid session and will redirect them back to `/login`.

If you change the frontend domain later, remember to update:

- `FRONTEND_URL` in `backend/.env`
- Any environment variables in your hosting (Render, Vercel, etc.) that mirror these values.

