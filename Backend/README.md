# RePrint-API

Backend API for the RePrint 3D printing e-commerce platform.

- **Stack:** Express, MySQL
- **Port:** 5000
- **Database:** `reprint_api` (MySQL)

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Configure environment in `.env`:

   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=reprint_api
   DB_PORT=3307
   JWT_SECRET=your_jwt_secret
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_smtp_username
   SMTP_PASSWORD=your_smtp_password
   MAIL_FROM=RePrint <noreply@example.com>
   ```

3. Set up the database schema:

   ```
   mysql -u root -p < schema.sql
   ```

4. Seed the database (idempotent, safe to re-run):

   ```
   node src/seeds/seed.js
   node src/seeds/seed-staff.js
   ```

5. Start the server:
   ```
   npm run dev
   ```

## Running as one website

This API also serves the built RePrint frontend, so a single server hosts the whole site:

1. Build the frontend (`npm run build` inside `../RePrint`) so `../RePrint/dist` exists.
2. Start this server (`npm run dev`). It serves:
   - the API under `http://localhost:5000/api`
   - product images under `http://localhost:5000/images`
   - the frontend app at `http://localhost:5000`

For development, the Vite dev server in `../RePrint` proxies `/api` and `/images` to this server on `http://localhost:5000`.

## Customer email preferences

Customers can subscribe to advertisements, reviews, and deals with `POST /api/marketing/subscribe`:

```json
{
  "email": "customer@example.com",
  "preferences": { "advertisements": true, "reviews": true, "deals": true }
}
```

Administrators can send a campaign with `POST /api/marketing/send` after configuring the SMTP variables above. No messages are sent until a customer explicitly selects at least one preference.

## Staff accounts

`node src/seeds/seed-staff.js` registers a login for every employee (see `src/seeds/seed-staff.js`):

| Employee ID | Email                     | Password |
| ----------- | ------------------------- | -------- |
| EMP-001     | aisha.d@reprint.co.za     | staff123 |
| EMP-002     | thabo.m@reprint.co.za     | staff123 |
| EMP-003     | chantelle.a@reprint.co.za | staff123 |
| EMP-004     | kyle.b@reprint.co.za      | staff123 |
| EMP-005     | naledi.d@reprint.co.za    | staff123 |
| EMP-006     | pieter.v@reprint.co.za    | staff123 |
| EMP-007     | zanele.n@reprint.co.za    | staff123 |
| EMP-008     | tyler.j@reprint.co.za     | staff123 |
| EMP-009     | megan.f@reprint.co.za     | staff123 |
| EMP-010     | gift.m@reprint.co.za      | staff123 |

> Or run `npm run seed:all` to run the base seed, staff accounts and everything in one go.

## API routes

- `POST /api/auth/login` — customer/admin login
- `POST /api/auth/staff-login` — staff login (employee ID or work email + password)
- `GET /api/materials` — materials list (public)
- `GET /api/orders` — orders (auth)
- `GET/POST/PUT /api/hr/employees` — HR employees (admin)
- `GET/POST/PUT /api/hr/shifts` — shifts (admin)
- `GET /api/hr/reports/overview` — HR dashboard overview (admin)
