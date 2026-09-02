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
   DB_PORT=3306
   JWT_SECRET=your_jwt_secret
   ```

3. Set up the database schema:
   ```
   mysql -u root -p < schema.sql
   ```

4. Seed the database:
   ```
   node src/utils/seed.js
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

## Staff accounts

Seed script also registers staff accounts (see `scripts/seed-staff.js`):

| Employee ID | Email                    | Password  |
|-------------|--------------------------|-----------|
| EMP-001     | aisha.d@reprint.co.za    | staff123  |
| EMP-002     | thabo.m@reprint.co.za    | staff123  |
| EMP-003     | chantelle.a@reprint.co.za| staff123  |

## API routes

- `POST /api/auth/login` — customer/admin login
- `POST /api/auth/staff-login` — staff login (employee ID or work email + password)
- `GET /api/materials` — materials list (public)
- `GET /api/orders` — orders (auth)
- `GET/POST/PUT /api/hr/employees` — HR employees (admin)
- `GET/POST/PUT /api/hr/shifts` — shifts (admin)
- `GET /api/hr/reports/overview` — HR dashboard overview (admin)