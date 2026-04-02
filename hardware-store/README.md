# 🏗️ HardwarePro KE — Hardware Store Management System

> Production-ready MERN stack · Next.js 14 · MongoDB · Safaricom Daraja (M-Pesa) · TailwindCSS · Zustand

---

## 📁 Complete File Structure

```
hardware-store/
├── backend/
│   ├── src/
│   │   ├── config/database.js          # MongoDB connection pool
│   │   ├── controllers/
│   │   │   ├── authController.js       # JWT login/register/refresh
│   │   │   ├── productController.js    # Products + inventory CRUD
│   │   │   ├── posController.js        # POS sales, void, daily summary
│   │   │   └── paymentController.js    # M-Pesa STK Push + callback
│   │   ├── middleware/
│   │   │   ├── auth.js                 # JWT verify, RBAC, branch guard
│   │   │   └── error.js                # Global error handler + async wrap
│   │   ├── models/
│   │   │   ├── User.js                 # Users: RBAC + loyalty + credit
│   │   │   ├── Product.js              # Products: variants, barcode, SEO
│   │   │   ├── Category.js             # Nested category tree
│   │   │   ├── Inventory.js            # Per-branch stock + movements log
│   │   │   ├── Order.js                # POS + online orders + payments
│   │   │   ├── Payment.js              # M-Pesa Daraja transaction records
│   │   │   └── Branch.js              # Branches + Suppliers + PurchaseOrders
│   │   ├── routes/index.js             # All API routes (auth/products/pos/payments)
│   │   ├── services/mpesa.js           # Full Daraja API: STK Push + B2C + query
│   │   ├── server.js                   # Express app: CORS, helmet, rate limit
│   │   └── utils/
│   │       ├── logger.js               # Winston file + console logger
│   │       └── seed.js                 # Demo data: branches, users, products
│   ├── .env.example
│   └── package.json
│
└── frontend/                           # Next.js 14 App Router + TypeScript
    ├── src/
    │   ├── app/
    │   │   ├── login/page.tsx          # Login with quick demo buttons
    │   │   └── dashboard/
    │   │       ├── layout.tsx          # Collapsible sidebar + dark mode
    │   │       ├── page.tsx            # KPI cards + revenue charts
    │   │       ├── pos/page.tsx        # ★ FULL POS: scan/search/cart/receipt
    │   │       ├── products/page.tsx   # Product CRUD with form modal
    │   │       ├── inventory/page.tsx  # Stock levels + low-stock alerts
    │   │       ├── payments/page.tsx   # M-Pesa transaction history
    │   │       ├── reports/page.tsx    # Area/bar charts + CSV export
    │   │       ├── customers/page.tsx  # Customer profiles + loyalty
    │   │       ├── suppliers/page.tsx  # Supplier cards + CRUD
    │   │       ├── purchase-orders/    # PO creation + tracking
    │   │       ├── categories/page.tsx # Category tree builder
    │   │       ├── users/page.tsx      # Staff management + permissions table
    │   │       └── settings/page.tsx   # Branches + M-Pesa config
    │   ├── components/Providers.tsx    # ReactQuery + react-hot-toast
    │   ├── lib/api.ts                  # Axios + auto token refresh + all endpoints
    │   └── store/index.ts              # Zustand: authStore + cartStore (POS)
    ├── tailwind.config.js
    └── package.json
```

---

## 🚀 Setup & Installation

### 1. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend  
cd ../frontend && npm install
```

### 2. Configure environment

```bash
# Backend
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hardware_store
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_REFRESH_SECRET=another_refresh_secret_key

# Safaricom Daraja — developer.safaricom.co.ke
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa/callback
MPESA_ENV=sandbox

FRONTEND_URL=http://localhost:3000
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Seed the database

```bash
cd backend && npm run seed
```

Creates: 2 branches · 4 users · 6 categories · 10 products · inventory records

### 4. Run development servers

```bash
# Terminal 1
cd backend && npm run dev      # → localhost:5000

# Terminal 2
cd frontend && npm run dev     # → localhost:3000
```

---

## 🔑 Demo Login Accounts

| Role     | Email                         | Password     |
|----------|-------------------------------|--------------|
| Admin    | admin@hardwarestore.co.ke     | Admin@1234   |
| Manager  | manager@hardwarestore.co.ke   | Manager@1234 |
| Cashier  | cashier@hardwarestore.co.ke   | Cashier@1234 |
| Customer | customer@example.com          | Customer@1234|

---

## 📡 API Endpoints

### Auth
```
POST /api/auth/login          # → { user, accessToken }
POST /api/auth/register       # Create customer (or staff with admin token)
POST /api/auth/refresh        # Refresh access token via cookie
POST /api/auth/logout
GET  /api/auth/me
PUT  /api/auth/profile
PUT  /api/auth/password
```

### Products
```
GET    /api/products                      # search, category, page, limit
GET    /api/products/barcode/:barcode     # POS barcode lookup
GET    /api/products/:id
POST   /api/products                      # [manager+]
PUT    /api/products/:id                  # [manager+]
DELETE /api/products/:id                  # [manager+] soft delete
```

### Inventory
```
GET  /api/inventory                 # ?branchId&lowStock=true
POST /api/inventory/adjust          # { productId, branchId, quantity, type, note }
GET  /api/inventory/movements       # Audit trail
```

### POS
```
POST /api/pos/sale               # { items, paymentMethod, cashReceived, mpesaPhone }
GET  /api/pos/orders             # Branch orders with date filter
GET  /api/pos/daily-summary      # Revenue, cash, M-Pesa, top products
PUT  /api/pos/orders/:id/void    # Void + restore inventory [manager+]
```

### Payments
```
POST /api/payments/mpesa/initiate           # { phone, amount, orderId }
POST /api/payments/mpesa/callback           # Safaricom webhook — no auth
GET  /api/payments/mpesa/:paymentId/status  # Poll payment result
GET  /api/payments                          # [manager+]
```

### Reports
```
GET /api/reports/sales          # ?from&to&groupBy=day|month|year
GET /api/reports/top-products   # ?from&to&limit
```

---

## 💳 M-Pesa STK Push Flow

```
Cashier → Enter phone → POST /api/payments/mpesa/initiate
  ↓
Backend generates password, calls Safaricom STK Push API
  ↓
Customer receives prompt → enters M-Pesa PIN
  ↓
Safaricom → POST /api/payments/mpesa/callback (your server)
  ↓
Backend: updates MpesaPayment + Order.paymentStatus = "paid"
         deducts inventory
  ↓
Frontend polls /api/payments/mpesa/:id/status every 5s
  ↓
POS shows ✅ "Payment Received!" → print receipt
```

---

## 🔐 Security

- JWT access token (7d) + httpOnly refresh token (30d)
- Auto token refresh with queued retries on 401
- bcrypt 12-round password hashing
- Helmet security headers
- CORS whitelist
- Rate limiting: 100 req/15min (Safaricom callback bypassed)
- Role + branch access guards on every protected route

---

## 🚢 Deployment

### Backend → Render.com
```
Build: npm install
Start: npm start
Environment: all .env keys
```

### Frontend → Vercel
```bash
cd frontend && npx vercel --prod
# Add NEXT_PUBLIC_API_URL in Vercel dashboard
```

### Database → MongoDB Atlas
```
Free tier M0 cluster → Create user → Whitelist 0.0.0.0/0 → Copy URI
```

### M-Pesa Production
```
1. developer.safaricom.co.ke → Go Live
2. Set MPESA_ENV=production
3. Set MPESA_CALLBACK_URL to HTTPS production URL
4. Update MPESA_SHORTCODE to your registered paybill/till
```

---

## 🔧 Extending the System

### Add Africa's Talking SMS
```bash
npm install africastalking
```
```js
const at = AfricasTalking({ apiKey, username });
await at.SMS.send({ to: ['+254712345678'], message: 'Order ready!', from: 'HWStore' });
```

### Add WhatsApp (Twilio)
```bash
npm install twilio
```
```js
const twilio = require('twilio')(ACCOUNT_SID, AUTH_TOKEN);
await twilio.messages.create({ from: 'whatsapp:+14155238886', to: `whatsapp:${phone}`, body: msg });
```

### Offline POS (PWA)
Add `frontend/public/manifest.json` + `next-pwa` package for service worker.
Cache product list and queue sales in IndexedDB for sync when back online.

---

*Built for Kenya's hardware trade — supports multi-branch, M-Pesa, barcode scanning & full RBAC*
