# Jira Enterprises – Juice & Water Distribution Management

Web app for a distribution business: buy water / juice **in cases** from suppliers,
sell the cases to shops, collect payment by **cash or UPI** (or later, on credit),
and see stock, credit and profit at a glance.

| Part | Folder | Stack |
|------|--------|-------|
| Frontend | `/` (`src/`) | React 19 · TypeScript · Vite · React Router · Recharts |
| Backend | `/backend` | Node · Express 5 · TypeScript · Supabase (PostgreSQL) |
| Database scripts | `/database` | `fixes.sql` (run after your original schema) |

## Roles

| | Owner | Viewer |
|---|---|---|
| Create PIN / first account | ✅ (one-time setup screen) | – |
| See every screen | ✅ | ✅ |
| Add / edit / delete anything | ✅ | ❌ (buttons hidden, API also blocks it) |
| Add viewers, reset PINs | ✅ | ❌ (Users page hidden) |

Login = **mobile number + 6-digit PIN**.

## Screens

Dashboard · Sales (+ New sale, invoice print) · Customers · Inventory (stock, products & prices,
categories, stock history) · Purchases · Payments & Credit (collect from shops, payment history) ·
Expenses · Reports (charts, CSV export) · Notes & reminders · Settings · Users

## One-time setup

1. **Database** – in the Supabase SQL editor run your original schema/migration scripts, then run
   [`database/fixes.sql`](database/fixes.sql). *(It fixes `create_sale` / `create_purchase`, which insert
   into generated `subtotal` columns, and adds automatic invoice numbers `JE-YYYYMMDD-00001`.)*
2. **Backend env** – copy `backend/.env.example` to `backend/.env` and fill:
   `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (server-only key), `INITIAL_SETUP_SECRET` (any long secret you
   choose – you type it once on the setup screen).
3. **Frontend env** – root `.env` already contains `VITE_API_BASE_URL=http://localhost:5000/api`.
4. Install & run (two terminals):

```bash
# terminal 1 – backend  (http://localhost:5000)
cd backend
npm install
npm run dev

# terminal 2 – frontend (http://localhost:5173)
npm install
npm run dev
```

Open <http://localhost:5173>. Production build: `npm run build` (frontend) / `npm run build` in `backend`.

## Testing guide (end-to-end)

### 0. Health
* <http://localhost:5000/api/health> → `"status":"UP"`
* <http://localhost:5000/api/auth/setup-status> → `{"needsSetup":true}` on a fresh database

### 1. Owner setup
1. Open `/login` → click **Create the owner account** (or go to `/setup`).
2. Enter name, mobile (e.g. `9876543210`), a 6-digit PIN twice, and the `INITIAL_SETUP_SECRET`.
3. ✅ You land on the Dashboard signed in as **Owner**. Visiting `/setup` again says setup is already done.
4. Log out (top-right) and log in again with mobile + PIN. A wrong PIN shows an error (5 failed tries / 15 min are rate-limited).

### 2. Master data (Inventory)
1. **Inventory → Categories → Add category**: `Water`, `Juice`.
2. **Products & prices → Add product**: category *Water*, name *Aqua Fresh*, one variant
   `1 L`, pieces/case `12`, landing `₹150`, MRP `₹200`, opening stock `0`. Add a second size with **+ Variant**.
3. ✅ Product shows landing / MRP / margin per case. Edit a price with the pencil icon; disable with the power icon.

### 3. Purchase (stock in)
1. **Purchases → Record purchase**: supplier *ABC Distributors*, product *Aqua Fresh 1 L*, `50` cases at `₹150`.
2. ✅ Inventory → Current stock shows **50** cases; Stock history shows `+50 Purchase`.

### 4. Customers
1. **Customers → Add customer**: *Ravi Stores* / mobile / address. Add a second shop.

### 5. Sales – all three payment cases
Use **Sales → New sale**:

| Case | How | Expected |
|------|-----|----------|
| Paid in full (cash) | 10 cases @ ₹200, **Paid in full**, Cash | Badge **Paid**, stock 40 |
| Paid by UPI | 5 cases, Paid in full, UPI + reference | UPI badge in payment list |
| Credit (pay later) | 8 cases, **Credit – pay later**, customer required | Badge **Credit**, pending = total |
| Part payment | 10 cases, **Part payment** ₹500 | Badge **Part paid**, pending = rest |
| Over-sell | 100 cases | Error: not enough stock |
| Discount | enter a discount | Total reduces, profit reflects it |

Open a sale → **Details** → **Print invoice** (shows the company logo) and **Collect payment**.

### 6. Collect credit (Payments & Credit)
1. **Customers who owe** lists *Ravi Stores* with the outstanding balance.
2. **Collect** → enter a partial amount (e.g. ₹300) → preview shows it applied to the oldest invoice first.
3. ✅ Balance drops; entry appears under **Payment history** (Cash/UPI totals update).
   Paying more than the balance is rejected.

### 7. Stock adjustments
**Inventory → Current stock → Adjust**: record *Damaged cases* (stock goes down), *Returned cases* (up),
or a correction. ✅ Visible in Stock history; stock can never go below zero.

### 8. Expenses, Notes, Reports
* **Expenses → Add expense** (Transport ₹500, UPI) → appears in list and category bars.
* **Notes → Add note** with a reminder time in the past → bell icon shows a red dot, note shows *due*;
  tick it to complete.
* **Reports**: pick *This month* → Sales / Purchases / Expenses / Net profit cards, daily chart,
  top-selling products. **Export CSV** downloads the active tab.
  Net profit = sales − cost of goods (landing price saved at sale time) − expenses.
* **Dashboard**: today’s sales, received, credit outstanding, low-stock (≤ 5 cases), recent sales, pending notes.

### 9. Viewer access
1. As owner: **Users → Add viewer** (name, a *different* mobile, 6-digit PIN).
2. Log out, log in as the viewer.
3. ✅ Every page opens, but there is **no** *New sale / Add / Edit / Delete / Collect* button, no **Users** menu,
   and Settings is read-only. Opening `/users` redirects to the dashboard.
4. (Optional) call a write API as viewer, e.g. `POST /api/sales` → **403 Only the business owner can perform this action.**
5. Back as owner: **Users → ⏻** deactivates the viewer (they are signed out immediately) and **🔑** resets their PIN.

### 10. Build checks

```bash
npm run lint        # frontend lint
npm run build       # frontend type-check + production build
cd backend && npx tsc --noEmit
```

## What was added / fixed in this pass

* **Frontend completed**: Customers, Inventory, Purchases, Payments & Credit, Expenses, Reports, Notes,
  Settings, Users, New Sale, first-time Owner Setup – with owner/viewer permission handling.
* **Company logo** (`public/logo.jpg`) on login, setup, sidebar, settings, invoice print and as the browser icon.
* **Login fixed** – frontend sent only a PIN while the backend requires mobile + PIN.
* **Backend fixes**: stock calculation counted sales as additions; real error messages now reach the UI
  (e.g. “Insufficient stock…”); report/expense *to-date* is now inclusive; global auth rate-limit no longer
  locks you out after a few page refreshes; new `GET /auth/setup-status`.
* **Backend additions**: edit product / edit variant (`PUT /products/:id`, `PUT /products/variants/:id`),
  create product with opening stock (`POST /products/with-variants`).
* **Database**: `database/fixes.sql` (see step 1 of setup).
