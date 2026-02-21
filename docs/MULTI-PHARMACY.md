# Multi-Pharmacy Support

## Different pharmacy businesses (separate companies)

The system supports **different pharmacy businesses** (separate companies with different names), not only branches of the same business. Each business can have its own drug catalog and optional settings.

### What’s in place

- **Database**
  - `pharmacies` table: id, name, address, phone.
  - `profiles.pharmacy_id`: links a user to one pharmacy (NULL = unassigned).
  - **`drugs.pharmacy_id`** (nullable): each drug belongs to one pharmacy or is shared (NULL). So each business can have its own product list.
  - **`pharmacy_settings`** table: per-pharmacy options (currency_code, logo_url, timezone). Optional; used for branding and display.
  - Tenant columns: `inventory_batches.pharmacy_id`, `sales.pharmacy_id`, `prescriptions.pharmacy_id`.

- **Row Level Security (RLS)**
  - `user_pharmacy_id()` returns the current user’s pharmacy.
  - **Drugs:** users see only drugs where `pharmacy_id IS NULL` (shared) or `pharmacy_id = user_pharmacy_id()`. Inserts/updates are restricted the same way; ADMIN can insert/delete any.
  - Inventory, sales, prescriptions: unchanged (already scoped by pharmacy).

- **Backend**
  - **Create drug:** sets `pharmacy_id` from the user’s profile (or from request body for ADMIN). New drugs are tied to the current user’s pharmacy when they have one.
  - **Get drugs:** RLS limits results to shared + current pharmacy’s drugs.
  - **GET /pharmacies:** list pharmacies (authenticated).
  - **GET /pharmacies/my-settings:** current user’s pharmacy settings (currency, logo, timezone) if they have a pharmacy.

- **Frontend**
  - `GET /auth/user` returns profile and **pharmacy** (id, name, address, phone).
  - Header shows the **current pharmacy name** when the user is assigned to a pharmacy.

- **Audit logs**
  - `audit_logs.pharmacy_id` stores which pharmacy the event belonged to.
  - Pharmacy admins see only their pharmacy’s logs; super admins (no pharmacy) see all.
  - Pharmacy column shows which pharmacy each event belongs to.

- **Pharmacy isolation**
  - `GET /pharmacies`: pharmacy users get only their pharmacy; super admins get all.
  - `pharmacies` table RLS: pharmacy users can only read their own pharmacy row; super admins can read all.

### Migration (run once in Supabase SQL Editor)

Run the migration so each business can have its own catalog and settings:

```text
supabase/migrations/multi_pharmacy_business.sql
```

It:

- Adds `pharmacy_id` to `drugs` (nullable; existing rows stay shared).
- Creates `pharmacy_settings` (pharmacy_id, currency_code, logo_url, timezone).
- Replaces drugs RLS so drugs are scoped by pharmacy (shared + own pharmacy).

### Turning on multiple businesses

1. **Create pharmacies**  
   Insert rows into `pharmacies` (Supabase Table Editor or future admin API).

2. **Assign users**  
   Set `profiles.pharmacy_id` to the correct `pharmacies.id`. Users then see only that pharmacy’s drugs (and shared drugs) and data.

3. **Optional: pharmacy settings**  
   Insert/update `pharmacy_settings` per pharmacy for currency (e.g. GHS, USD), logo_url, timezone. Use **GET /pharmacies/my-settings** in the app to drive display.

4. **Optional: admin UI**  
   - List: **GET /pharmacies** already available.
   - Create pharmacy / assign user to pharmacy: add admin-only APIs and UI as needed.

### Summary

- **Different pharmacy businesses** are supported: each can have its own **drug catalog** (`drugs.pharmacy_id`) and **settings** (`pharmacy_settings`).
- Run `multi_pharmacy_business.sql`, then create pharmacies and set `profiles.pharmacy_id`. New drugs created by staff are assigned to their pharmacy; ADMIN can set `pharmacy_id` explicitly when creating drugs.
