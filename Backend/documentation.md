# RePrint API Documentation

## Overview

This project is a Node.js + Express backend for the RePrint 3D printing business API. It is structured around route modules, controllers, middleware, and a MySQL database connection.

The server is initialized in `src/server.js` and mounts the following route groups:

- `/api/orders`
- `/api/payments`
- `/api/invoices`
- `/api/consultations`
- `/api/employees`
- `/api/shifts`
- `/api/users`
- `/api/auth`

> Important: the authentication flow and user access checks are implemented, while several resource endpoints currently return placeholder responses and are not yet backed by full CRUD logic.

---

## Tech Stack

- Node.js
- Express.js
- MySQL via `mysql2/promise`
- JWT for authentication
- `bcrypt` for password hashing
- `dotenv` for environment configuration

---

## Project Structure

- `src/server.js` — starts the Express app and registers all route modules.
- `src/config/db.js` — MySQL connection pool.
- `src/controllers/` — business logic handlers.
- `src/routes/` — endpoint definitions.
- `src/middleware/` — auth and validation middleware.
- `src/models/` — database query helpers.

---

## Setup and Run

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

Run in development mode with nodemon:

```bash
npm run dev
```

The app listens on:

```text
http://localhost:3000
```

---

## Authentication and Authorization

### JWT authentication

JWT verification is handled in `src/middleware/authMiddleware.js`.

- The request must include an `Authorization` header in the format:

```http
Authorization: Bearer <token>
```

- If the header is missing or not prefixed with `Bearer`, the API returns:

```json
{ "message": "Access denied. No token provided." }
```

- If the token is invalid or expired, the API returns:

```json
{ "message": "Invalid token" }
```

### Role-based access control

The `requireRole` middleware checks whether the logged-in user has an allowed role:

```js
requireRole(['admin'])
```

If the user does not match the allowed roles, the server returns:

```json
{ "message": "Access forbidden: Insufficient permissions" }
```

### User ownership checks

The user profile and orders routes enforce ownership rules.

- Admin can access any user profile or order list.
- A normal user can only access their own profile and their own orders.
- If access is denied, the API returns:

```json
{ "message": "Access forbidden: Cannot view another profile" }
```

or

```json
{ "message": "Access forbidden: Cannot view another user's orders" }
```

---

## Validation

### Login validation

`src/middleware/validateMiddelware.js` contains `validateLogin`, which validates incoming login requests.

It checks:

- `email` exists
- `password` exists
- `email` matches a standard email format using regex:

```js
/^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

If validation fails, the API responds with status `400` and a message such as:

```json
{ "message": "Email and password are required" }
```

or

```json
{ "message": "Invalid email format" }
```

---

## Password Security

Password security is handled in the auth controller:

- `bcrypt` is used to hash passwords with a salt round of `10`.
- Passwords are compared during login with `bcrypt.compare()`.
- The app checks whether a user already exists before creating a new account.

Example registration flow:

1. Check if email already exists
2. Hash the password
3. Insert the user record
4. Create a signed JWT token
5. Return the user payload and redirect path

---

## JWT Payload and Token Behavior

The login and registration logic signs a JWT using `jsonwebtoken`.

JWT payload includes:

- `id`6
- `email`
- `role`
- `isEmployee`

Default secret used if no environment variable is set:

```text
secretkey
```

Token expiration:

- Registration token: `1d`
- Login token: `1d`

---

## API Endpoints

### Authentication Routes

Base URL: `/api/auth`

#### `POST /api/auth/register`

Creates a user account.

Request body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123",
  "role": "customer"
}
```

Behavior:

- checks for duplicate email
- hashes password
- inserts user into DB
- returns a JWT and user details

#### `POST /api/auth/login`

Logs in a user.

Request body:

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

Behavior:

- validates login input
- finds user by email
- verifies password with bcrypt
- determines employee status
- signs JWT and responds with redirect info

---

### User Routes

Base URL: `/api/users`

#### `GET /api/users/:id/orders`

Returns orders for a specific user.

Security:

- Requires valid JWT
- Allows admin or the same user
- Otherwise returns a `403` forbidden response

---

### Orders Routes

Base URL: `/api/orders`

#### `GET /api/orders/`
Returns all orders.

#### `GET /api/orders/:id`
Returns a single order by ID.

#### `POST /api/orders/`
Creates an order.

#### `PUT /api/orders/:id/status`
Updates an order status.

#### `GET /api/orders/:id/invoice`
Returns the invoice associated with an order.

> These routes are currently defined in the server and route files, but many are implemented as placeholder responses and need full controller logic to replace `res.send(...)` stubs.

---

### Payments Routes

Base URL: `/api/payments`

#### `POST /api/payments/`
Creates a payment.

#### `GET /api/payments/:id`
Gets a payment by ID.

#### `PUT /api/payments/:id/status`
Updates a payment status.

---

### Invoices Routes

Base URL: `/api/invoices`

#### `GET /api/invoices/:id`
Gets invoice by ID.

#### `POST /api/invoices/`
Creates an invoice.

---

### Consultation Routes

Base URL: `/api/consultations`

#### `GET /api/consultations/`
Gets all consultations.

#### `POST /api/consultations/`
Creates a consultation.

#### `PUT /api/consultations/:id`
Updates a consultation.

---

### Employee Routes

Base URL: `/api/employees`

#### `GET /api/employees/`
Gets all employees.

#### `POST /api/employees/`
Creates an employee.

#### `PUT /api/employees/:id`
Updates an employee.

#### `GET /api/employees/:id/shifts`
Gets shifts for a specific employee.

---

### Shift Routes

Base URL: `/api/shifts`

#### `POST /api/shifts/`
Creates a shift.

#### `PUT /api/shifts/:id`
Updates a shift.

---

## Database Configuration

The project connects to MySQL using the connection pool in `src/config/db.js`.

Current connection details:

```js
host: 'localhost'
user: 'root'
password: 'Kirsten.L1404'
database: 'reprint_api'
```

This is configured for a local MySQL instance on the developer machine.

---

## Security Notes

The current implementation includes the main security practices used in the app:

- JWT-based authentication and authorization
- Bearer token validation
- Role-based access control
- Password hashing with bcrypt
- Email format validation on login
- Protected route checks for user-specific data

The project still needs additional hardening for production use, including:

- environment variable management for sensitive credentials
- stronger input validation across all endpoints
- rate limiting and CORS configuration
- full implementation of the remaining business endpoints
- centralized error handling

---

## Summary

The RePrint API currently includes a working authentication flow and secure access layer, with route definitions registered for all major domains. The most complete implementation is in authentication and user access control, while the remaining business routes are scaffolded and will need controller logic to fully drive the application.
