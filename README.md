# Bimari Mitao Herbs - E-commerce MVP

A full-stack MERN web shop for **Bimari Mitao Herbs** (Jonai, Dhemaji, Assam), selling **Cavi-Care Herbal Toothpaste**.
Customers can browse, register with email OTP, order (Razorpay or Cash on Delivery) and track orders.
The owner signs in through the **same `/login` page** and manages everything from `/admin/dashboard`.

---

## 0. Honest status (read this first)

| Area | Status |
|---|---|
| Backend code (models, auth, OTP, reset, products, orders, payments, admin, content) | Written. All files load; **15 automated tests pass** (validation, OTP hashing, CSRF, signature checks, auth gates, security headers). |
| Frontend (public site, auth, cart, checkout, account, admin) | Written. **Production build succeeds.** Layout was screenshot-checked on mobile and desktop for Home, Shop and Register (with the API intercepted, so this proved layout only). |
| **Anything that needs a real MongoDB** (register, login, orders, admin lists, etc.) | **NOT yet run end-to-end.** The build sandbox had no MongoDB server and could not download one. An integration test suite (`server/tests/integration`) is written for this; run it yourself (section 9) before trusting database behaviour. |
| Real emails (OTP, reset, order mails) | **Not tested** - needs your SMTP credentials. |
| Razorpay online payment | **Not tested** against Razorpay - needs your Test keys. Signature/webhook verification logic *is* unit-tested. |
| `.bat` scripts | Written carefully but **not executed** (built on Linux). If one misbehaves, the manual commands in section 6 do the same thing. |

Please do the "first run checklist" in section 9 and tell me about any failure.

---

## 1. Features

**Customers:** home, shop, product details (gallery, ingredients %, benefits, usage), cart (stored per account in MongoDB; guest cart remains local and clears on sign-out), checkout, Razorpay or COD, order confirmation, order history, order tracking timeline, profile, change password, saved addresses, email-OTP registration, forgot/reset password, contact form.

**Owner/admin:** dashboard (orders, products, customers, pending, delivered, **paid online revenue** and **COD collected shown separately**), product editor (name, descriptions, prices, MRP, ingredients, specs, activate/deactivate, **pick image from local library**), order management (search, filter, status workflow, cancel, mark COD collected, Razorpay refund), customer management (search, view, deactivate), website content editor (live, no redeploy), contact enquiries, store settings (name, phone, email, address, delivery charge, free-delivery threshold, COD on/off).

**Security:** bcrypt (12 rounds), JWT in HTTP-only cookie, roles read from MongoDB on every request, CSRF double-submit protection, Helmet, CORS allow-list, rate limiting, Zod validation, OTP stored only as an HMAC hash (5-min expiry, 5 attempts, 60 s resend cooldown, 5 sends/hour, single use), single-use hashed reset tokens that sign out old sessions, ownership checks, server-side pricing, Razorpay signature + webhook verification, idempotent payment processing.

## 2. Tech stack and prerequisites

React 18 + Vite 5 + Tailwind CSS 3 + React Router 6 + Axios + Context API / Node.js + Express 4 + MongoDB + Mongoose 8 + JWT + bcryptjs + Nodemailer + Razorpay.

You need:
1. **Node.js 18.17 or newer (LTS)** - https://nodejs.org
2. **MongoDB**: either MongoDB Community Server (local) **or** a free MongoDB Atlas cluster (cloud)
3. A Gmail (or other SMTP) account for OTP emails
4. *(Optional now)* a Razorpay account in **Test Mode**

> `bcryptjs` is used instead of native `bcrypt` so Windows needs **no C++ build tools**. It is the same algorithm.

## 3. Folder structure

```
bimari-mitao/
  setup.bat                  one-time install (project-local caches)
  start-dev.bat              starts API + website
  start-mongo.bat            optional: local MongoDB, data kept in .local\data\db
  build-and-run-production.bat
  scripts/env-local.bat      pins npm/temp/log paths to this folder
  original-assets/           your 5 original images (untouched)
  client/                    React app
    public/assets/           optimised images served as /assets/...
    src/{components,pages,layouts,context,hooks,services,routes,utils}
    vite.config.js           cacheDir -> ../.local/vite-cache
  server/                    Express API
    config/ controllers/ middleware/ models/ routes/ services/ utils/
    scripts/createAdmin.js  scripts/seedProducts.js
    tests/unit  tests/integration
    server.js  app.js
  .local/                    created at runtime: npm cache, temp, logs, vite cache, local DB files
```

## 4. Configure MongoDB (choose one)

`MONGODB_URI` in `server/.env` is the only switch - the code is identical for both.

**A. Local MongoDB (data stays on your project drive)**
1. Install MongoDB Community Server. In the installer choose **Complete** and **untick "Install MongoDB as a Service"** (the service would store data on C:).
2. Run `start-mongo.bat`. It starts `mongod` with `--dbpath <project>\.local\data\db`. Keep the window open.
3. `.env`: `MONGODB_URI=mongodb://127.0.0.1:27017/bimari_mitao`

**B. MongoDB Atlas (cloud)**
1. Create a free cluster at https://cloud.mongodb.com, add a database user, and under *Network Access* add your IP.
2. Click *Connect > Drivers* and copy the `mongodb+srv://...` string; add the database name: `.../bimari_mitao?retryWrites=true&w=majority`
3. `.env`: `MONGODB_URI=<that string>`
Atlas data lives in Atlas's cloud, **not** on your computer.

## 5. Configure `server/.env`

`setup.bat` creates it from `server/.env.example` (every variable is documented there).

| Variable | What to put |
|---|---|
| `MONGODB_URI` | from section 4 |
| `JWT_SECRET` | 32+ random characters. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the owner's first login (password: 10+ chars, upper, lower, number) |
| `SMTP_*`, `EMAIL_FROM` | **Gmail:** turn on 2-Step Verification -> Google Account > Security > *App passwords* -> create one. `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=<your gmail>`, `SMTP_PASS=<16-char app password>` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay Dashboard -> switch to **Test Mode** -> Account & Settings -> API Keys. Test keys start `rzp_test_`. |
| `RAZORPAY_WEBHOOK_SECRET` | any secret you choose; enter the same one when creating a webhook (needs a public URL - see below) |
| `CLIENT_URL` | `http://localhost:5173` in development |

**If SMTP is not configured**, registration and password reset return a clear "email not configured" error (no fake success). **If Razorpay keys are empty**, the checkout hides/disables online payment and COD still works. Payments are never simulated.

**Webhooks locally:** Razorpay cannot reach `localhost`. The normal browser flow (`/api/payments/verify`) works without a webhook. To test webhooks use a tunnel (e.g. ngrok) and point Razorpay to `https://<tunnel>/api/payments/webhook` with events `payment.captured`, `order.paid`, `payment.failed`.

`client/.env` normally needs no changes in development (the Vite dev server proxies `/api` to port 5000).

## 6. Install and run on Windows (exact commands)

Put the extracted folder on D: or E: (example uses `D:\bimari-mitao`). Open **Command Prompt**:

```bat
D:
cd \bimari-mitao
setup.bat
```
Edit `server\.env` (Notepad is fine), then:

```bat
REM only if using local MongoDB - leave this window open:
start-mongo.bat

REM in a second Command Prompt:
D:
cd \bimari-mitao\server
call ..\scripts\env-local.bat
npm run seed:products
npm run create-admin
cd ..
start-dev.bat
```
Open **http://localhost:5173**. Sign in as the admin at **/login** (you are sent to `/admin/dashboard`).

Manual equivalent of `start-dev.bat` (two windows): `cd server && npm run dev` and `cd client && npm run dev`.

| Thing | Port / URL |
|---|---|
| Website (Vite) | http://localhost:5173 |
| API (Express) | http://localhost:5000/api/health |
| Local MongoDB | 127.0.0.1:27017 |

## 7. Keeping everything off C:

`scripts\env-local.bat` (called by every `.bat`) sets, for that session only:

| Setting | Points to |
|---|---|
| `npm_config_cache` (also in `.npmrc` files) | `<project>\.local\npm-cache` |
| `TEMP`, `TMP`, `TMPDIR`, `npm_config_tmp` | `<project>\.local\tmp` |
| `LOG_DIR` | `<project>\.local\logs` |
| Vite cache | `<project>\.local\vite-cache` (`client/vite.config.js`) |
| `node_modules` | inside `server\` and `client\` |
| Local MongoDB data | `<project>\.local\data\db` (`start-mongo.bat`) |

**Verified (on Linux):** npm resolves its cache to `.local/npm-cache` from the root, `server/` and `client/` via the `.npmrc` files, and Vite's dev cache is created in `.local/vite-cache` (nothing in `node_modules/.vite`).

**Cannot be controlled - will still use C:**
- Installing **Node.js** and **MongoDB** themselves (choose another install folder in their installers if offered).
- Windows' own system temp/prefetch/crash-dump handling and your **web browser's cache**.
- Anything you run *outside* the provided `.bat` files in a plain terminal: `.npmrc` still keeps the npm cache local, but `TEMP` would fall back to the Windows default. Use the `.bat` files, or run `scripts\env-local.bat` first in that terminal.
- Installing anything with `npm -g` (not needed for this project).
- MongoDB **Atlas** data and Razorpay/SMTP data live on those services, not on your drive.

## 8. Build and deploy

Single-host deployment (Express serves the built site):
1. `server/.env`: `NODE_ENV=production`, `SERVE_CLIENT=true`, `CLIENT_URL=https://your-domain`, real keys.
2. `cd client && npm run build` then `cd ../server && npm start` (or `build-and-run-production.bat`).
3. Put it behind HTTPS (e.g. Nginx/Caddy or a platform like Render/Railway/VPS). **In production cookies are `Secure`, so HTTPS is required** or login will not stick.
4. Use MongoDB Atlas, live Razorpay keys (after KYC), your SMTP, and set the webhook URL to `https://your-domain/api/payments/webhook`.
5. Run `npm run seed:products` and `npm run create-admin` once against the production database.
Static images are in `client/public/assets`; the build copies them to `client/dist/assets`.

## 9. First-run checklist and tests

After setup, verify in this order and note anything that fails:
1. `http://localhost:5000/api/health` returns `{"success":true,"status":"ok"}`; server window shows "MongoDB connected".
2. Home and Shop show Cavi-Care with images.
3. Register a new account -> receive the OTP email -> verify -> you are signed in.
4. Place a **COD** order -> see it under Account > Orders.
5. Sign in as admin -> Orders -> open it -> Confirmed -> Processing -> Shipped -> Delivered; "Mark COD collected".
6. With Razorpay test keys: choose online payment and use Razorpay's documented test card/UPI; the order must become **Paid/Confirmed** only after server verification.
7. Admin -> Products -> edit price, change image from the library; Website content -> edit heading; confirm the public site updates.

Automated tests (from `server/`):
```bat
npm test                      REM 15 database-free tests (these pass)
set MONGODB_URI_TEST=mongodb://127.0.0.1:27017/bimari_mitao_test
npm run test:integration      REM full API flow tests - DROPS that test database; not yet run by the author
```

## 10. Business rules and assumptions (all editable)

- **Price:** MRP and selling price are both **Rs. 99** (label MRP; no discount was supplied). Change in Admin > Products.
- **Delivery charge:** default **Rs. 0** because no policy was provided. Set it in Admin > Store settings.
- **Refunds:** only for verified-paid online orders, via Razorpay, before shipping.
- **Order flow:** Pending -> Confirmed -> Processing -> Shipped -> Delivered (forward only); cancel allowed until shipped. Online orders cannot be confirmed until paid. Unpaid online orders auto-cancel after 24 h; never-verified accounts are removed after 24 h.
- **Content/claims:** only text from your PDF and pack label is used. No certifications, reviews or clinical claims were added. Note: your promotional images contain statements ("Use 3 times a day", "Not harmful if swallowed", before/after dental photos). They are shown as supplied; the label says "pea-sized amount, supervised brushing". **Please have the owner confirm these claims are acceptable under Indian Ayurvedic advertising rules before going live.**
- The pack photos contain the typo "YEASR" (as supplied). They were not altered.

## 11. API summary

All state-changing requests need the `X-CSRF-Token` header (the web app does this automatically; `GET /api/csrf-token` sets the cookie). Errors: `{ success:false, code, message, fields? }`.

| Method & path | Access | Purpose |
|---|---|---|
| POST `/api/auth/register` | public | validate, create CUSTOMER, email OTP |
| POST `/api/auth/verify-otp` | public | verify OTP, activate, sign in |
| POST `/api/auth/resend-otp` | public | new OTP (60 s cooldown) |
| POST `/api/auth/login` / `logout` | public | sign in/out (cookie) |
| GET `/api/auth/me` | user | validate session |
| GET/PUT `/api/cart` | user | retrieve or save the signed-in user's cart |
| POST `/api/auth/forgot-password` / `reset-password` | public | email reset flow |
| PUT `/api/account/profile`, `/password` | user | edit profile, change password |
| GET/POST/PUT/DELETE `/api/account/addresses[/:id]` | user | saved addresses |
| GET `/api/products`, `/api/products/:id` | public | active products (id or slug) |
| POST/PUT/DELETE `/api/products[/:id]` | admin | manage (DELETE = deactivate) |
| POST `/api/orders` | verified user | create order (server prices) |
| GET `/api/orders/my-orders`, `/api/orders/:orderId` | owner/admin | history, detail |
| POST `/api/payments/create-order`, `/verify` | verified user | Razorpay order, signature verify |
| POST `/api/payments/webhook` | Razorpay | HMAC-verified webhook |
| GET `/api/content`, `/api/contact` POST | public | site content + settings, contact form |
| PUT `/api/admin/content`, `/settings` | admin | edit content/settings |
| GET `/api/admin/dashboard`, `/orders[/:id]`, `/customers[/:id]`, `/contact`, `/images` | admin | management lists |
| PATCH `/api/admin/orders/:id/status`, `/cod-collected`; POST `/refund` | admin | order actions |
| PATCH `/api/admin/customers/:id/active`, `/contact/:id/resolve` | admin | deactivate, resolve |

## 12. Cloudinary image uploads

Admin product forms now provide both the bundled image library and a **Upload to Cloudinary** control. Uploads are sent through the authenticated admin API and stored as secure Cloudinary HTTPS URLs in MongoDB.

1. Create a Cloudinary account and obtain Cloud Name, API Key and API Secret.
2. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `server/.env`.
3. Restart the Express server.
4. Open Admin > Products, choose **Add product** or edit an existing product, and upload JPEG, PNG, WebP or GIF images.

## 13. Troubleshooting

| Symptom | Fix |
|---|---|
| Server: "Could not reach MongoDB" | Start `start-mongo.bat`, or check Atlas IP allow-list / password (URL-encode special characters). |
| "Invalid server configuration: JWT_SECRET..." | Set a 32+ character `JWT_SECRET`. |
| Register says email not configured / "could not send" | Fill `SMTP_*`; for Gmail use an **App password**, not your normal password. |
| Online payment option disabled | Razorpay keys missing in `server/.env`; restart the server after editing. |
| Login works then immediately logs out (production) | You are on plain http with `NODE_ENV=production`; use HTTPS. |
| "Security check failed" (403) | Refresh the page; the CSRF cookie was cleared. |
| Port in use | Change `PORT` in `server/.env` and `VITE_DEV_API_TARGET` in `client/.env`. |
| `EPERM`/long path errors | Extract close to the drive root, e.g. `D:\bimari-mitao`. |

## 14. Image credits / assets

Your five originals are kept in `original-assets/`. Web-optimised copies (logo cropped; others resized/compressed) are in `client/public/assets/`:
`brand-logo.png`, `cavi-care-front.jpg`, `cavi-care-back.jpg`, `product-advertisement.jpg`, `promo-usage-collage.jpg`.
#   k u s e r e  
 