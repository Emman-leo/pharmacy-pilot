# Pharmacy Pilot

Smart pharmacy management system for inventory, sales, prescriptions, and automated alerts.

## Features

- **Inventory**: Drug master data, batch tracking with FEFO (First Expiry, First Out)
- **Point of Sale**: Cart-based checkout with receipt generation
- **Prescriptions**: Prescription workflow with validation (dosage limits, drug interactions)
- **Alerts**: Low stock and expiry warnings
- **Reports**: Sales summary, top-selling drugs, expiry alerts
- **Security**: Supabase Auth, RLS policies, role-based access (ADMIN, STAFF)

## Tech Stack

- **Backend**: Node.js, Express, Supabase
- **Frontend**: React, Vite
- **Database**: PostgreSQL (Supabase)

## Prerequisites

- Node.js 18+
- Supabase account

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/schema.sql`
3. Copy **Project URL** and **anon key** from Settings → API
4. Copy **service_role key** from Settings → API (keep secret)

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## First User

1. Register at `/login` – first user gets STAFF role
2. To make a user ADMIN, run in Supabase SQL Editor:
   ```sql
   UPDATE profiles SET role = 'ADMIN' WHERE email = 'your@email.com';
   ```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register |
| GET | /api/auth/user | Current user (auth) |
| GET | /api/inventory/drugs | List drugs |
| POST | /api/inventory/drugs | Add drug (ADMIN) |
| GET | /api/inventory/batches | List batches |
| POST | /api/inventory/batches | Add batch |
| GET | /api/inventory/alerts | Low stock / expiry alerts |
| POST | /api/sales/estimate | Estimate cart total |
| POST | /api/sales/checkout | Checkout |
| GET | /api/sales/receipt/:id | Get receipt |
| POST | /api/prescriptions | Create prescription |
| GET | /api/prescriptions/pending | Pending prescriptions (ADMIN) |
| PUT | /api/prescriptions/:id/approve | Approve (ADMIN) |
| PUT | /api/prescriptions/:id/reject | Reject (ADMIN) |
| GET | /api/reports/sales-summary | Sales summary |
| GET | /api/reports/top-selling | Top selling drugs |
| GET | /api/reports/expiry-alerts | Expiry alerts |

## Project Structure

```
pharmacy-pilot/
├── supabase/
│   └── schema.sql          # Database schema + RLS
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── utils/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## License

MIT
