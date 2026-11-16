# REWAAS — Premium Indian Fashion & Gifting Store

*The Beauty of Being You.*

A production-ready e-commerce site for REWAAS: sarees, suits & sets, lehengas, kurtis, bridal wear and luxury gift hampers. It includes a **Create Your Own Hamper** builder, a customer account area and a full admin panel.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions), React 19, TypeScript |
| Styling | Tailwind CSS 3 with a small design system (`src/app/globals.css`, `tailwind.config.ts`) |
| Database | PostgreSQL via Prisma 6 (`prisma/schema.prisma`) |
| Auth | Email + password (bcrypt), signed JWT session cookie (`jose`), role-based admin |
| Payments | Razorpay Orders API + Checkout.js (UPI, cards, net banking, wallets, EMI), Cash on Delivery |
| Images | `next/image` (AVIF/WebP, responsive sizes); admin uploads stored on disk and served from `/api/media` |

## Quick start (local)

Requirements: Node 20+ and PostgreSQL 14+.

```bash
cd rewaas
cp .env.example .env          # then fill in DATABASE_URL and AUTH_SECRET
npm install
npx prisma db push            # creates the tables
npm run db:seed               # demo catalogue, content, coupons, demo orders, admin user
npm run dev                   # http://localhost:3000
```

Demo logins created by the seed:

- **Admin:** `admin@rewaas.com` / `ChangeMe@123` → http://localhost:3000/admin. **Change this password before going live.** Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before seeding production.
- **Customer:** `demo@rewaas.com` / `Demo@1234`

Demo coupons: `WELCOME10` (10% off above ₹1,999, max ₹1,500), `FESTIVE500` (₹500 off above ₹5,000), `BRIDAL15`.

> On a live deployment the first build seeds only the catalogue and the admin user (`prisma/ensure-seed.ts` sets `SEED_DEMO_DATA=false`): no demo reviews, testimonials, customers or orders are created. It requires `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (10+ characters).

> ⚠️ `npm run db:seed` **wipes** catalogue, orders and users before inserting demo data. Never run it against a live database with real orders.

## Environment variables

See `.env.example`. The important ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Long random string that signs session cookies (`openssl rand -base64 48`). Required in production. |
| `NEXT_PUBLIC_SITE_URL` | Public URL, used for canonical links, sitemap and structured data |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Enables online payment. Without them, checkout offers Cash on Delivery only. |
| `RAZORPAY_WEBHOOK_SECRET` | Verifies Razorpay webhooks |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Floating WhatsApp support button (country code + number, no `+`) |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 measurement ID |
| `NEXT_PUBLIC_GSC_VERIFICATION` | Google Search Console HTML-tag verification token |
| `UPLOAD_DIR` | Where admin image uploads are stored (default `./storage/uploads`) |

## Going live with Razorpay

1. Create a Razorpay account and complete KYC. Generate **Live** API keys (Settings → API Keys).
2. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
3. In Razorpay Dashboard → Webhooks, add `https://YOUR-DOMAIN/api/payments/razorpay/webhook` with the events `payment.captured`, `order.paid` and `payment.failed`. Put the webhook secret in `RAZORPAY_WEBHOOK_SECRET`.
4. Test with Razorpay **Test** keys first. Test-mode UPI and card details are in Razorpay's docs.

How a payment works:
1. Checkout re-prices the bag on the server, re-checks the coupon and reserves stock in one database transaction. It then creates the order (`PENDING_PAYMENT`) and a Razorpay order.
2. The customer pays in the Razorpay window.
3. `/api/payments/razorpay/verify` checks the HMAC signature and marks the order `PAID` / `CONFIRMED`. The webhook does the same if the browser closes early.
4. If the window is dismissed, or the order stays unpaid for 45 minutes, the reserved stock and coupon use are released.

## Deployment

Any Node host that can run `next start` works: Railway, Render, Fly.io, a VPS, or Vercel with an external Postgres such as Neon or Supabase.

```bash
npm ci
npx prisma migrate deploy   # or `npx prisma db push` for the first deploy
npm run build
npm start
```

**Image uploads:** uploads are written to `UPLOAD_DIR`. On serverless or multi-instance hosting, put that directory on a persistent volume, or swap `src/lib/storage.ts` for S3 or Cloudinary. The rest of the app only stores the returned URL.

## Project map

```
prisma/
  schema.prisma          data model (money is stored in paise)
  seed.ts, catalog-data.ts, art.ts   demo data
public/photos/           product & editorial photography
src/
  middleware.ts          route protection (/admin, /account) + guest visitor cookie
  lib/                   db, auth, cart, pricing (GST, shipping, coupons), hamper pricing,
                         orders (stock, status), razorpay, pincode delivery estimates, seo
  app/(store)/           storefront: home, collections, products, search, cart, checkout,
                         order confirmation, gift-studio, account, wishlist, track-order, pages
  app/admin/             admin panel
  app/actions/           server actions (cart, wishlist, checkout, reviews, account…)
  app/api/               search suggestions, Razorpay verify + webhook, media
  components/            UI components (header, product card, cart drawer, hamper builder…)
```

## Business rules (where to change them)

All of these can be edited in **Admin → Settings**. The defaults live in `src/lib/settings.ts`.

- **Prices include GST.** Apparel up to ₹2,500 is taxed at 5% and above that at 18%; hampers at 18%. A per-product override is available. Invoices show the GST breakup, with CGST/SGST for intra-state orders and IGST otherwise.
- Free shipping above ₹1,999, otherwise ₹99.
- COD fee ₹49, available on orders up to ₹25,000.
- Gift wrap ₹149.
- Delivery estimates by PIN zone are in `src/lib/pincode.ts`. Replace them with a courier serviceability API (Shiprocket or Delhivery) when you sign up with one.

## Photography

`public/photos/` holds AI-generated editorial and product images made for this demo. Before launch, replace product images with photos of your actual pieces through **Admin → Products**. Customers should see exactly what they will receive.

The hamper-builder boxes and items, and some category banners, still use illustrated placeholder art in `public/images/`. Replace them from **Admin → Gift Studio**.

## Not included yet (next steps)

- **Transactional email and SMS:** order confirmation, shipping updates and password reset. Plug in a provider such as Resend, SES or MSG91 where orders change status (`src/lib/orders.ts`) and in the forgot-password page.
- **Courier integration:** automatic AWB and live tracking (Shiprocket or Delhivery). Tracking numbers can be entered by hand in the admin.
