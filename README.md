# LuxuryStay Hospitality — Hotel Management System (MERN)

Aptech 5th semester eProject. React 19 + Vite + Tailwind 4 + Three.js (client), Express 5 + Mongoose (server), MongoDB.

## Run on your laptop

1. Copy your old `server/.env` and `client/.env` into this new folder (or copy `.env.example` → `.env`).
2. Server (terminal 1):
   ```
   cd server
   npm install
   npm run seed      # fresh demo data: 3 hotels, 54 rooms, photos, 3D models, 2 months of bookings
   npm run dev       # http://localhost:5000/api/v1
   ```
3. Client (terminal 2):
   ```
   cd client
   npm install
   npm run dev       # http://localhost:5173
   ```

## Logins (password: Password@123)

| Role | Email |
| --- | --- |
| Admin (owner, only one) | admin@luxurystay.pk |
| Manager | manager@luxurystay.pk |
| Receptionist | reception@luxurystay.pk |
| Housekeeping | housekeeping@luxurystay.pk |
| Guest | guest@luxurystay.pk |

## Stripe online payments

1. In `server/.env` add your **test** secret key (from dashboard.stripe.com → Developers → API keys, Sandbox):
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_CURRENCY=pkr
   ```
   Restart the server. Guests now pay on Stripe's secure Checkout page. If your Stripe account does not accept PKR, the server charges the same amount in USD automatically (rate `STRIPE_USD_RATE`, default 280).
2. Test card: `4242 4242 4242 4242`, any future date, any CVC, any postal code.
3. Optional (recommended): webhooks, so a payment is saved even if the guest closes the browser.
   Install the Stripe CLI, then:
   ```
   stripe login
   stripe listen --forward-to localhost:5000/api/v1/payments/stripe/webhook
   ```
   Copy the `whsec_...` it prints into `server/.env` as `STRIPE_WEBHOOK_SECRET=whsec_...` and restart.
Never put secret keys in code or on GitHub. `.env` is already ignored by git.

## Gemini AI assistant

1. Get a free key at **aistudio.google.com** → Get API key → Create API key (no card needed).
2. Add to `server/.env` and restart the server:
   ```
   GEMINI_API_KEY=your_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```
3. The Concierge button (website) and "Ask AI" button (dashboards) now use Gemini. It answers in English, Urdu or Roman Urdu.
- Safe by design: the AI never receives the whole database. It can only call small "tools", and each role gets its own tools — visitors see rooms/prices/policies, a guest sees only their own bookings and bill, staff see today's hotel data, managers see reports. Passwords and card data are never sent.
- No key, or Gemini is down? The built-in concierge answers automatically, so the demo never breaks.
- Free tier: Google may use free-tier prompts to improve its products, so use demo data only.

## Real photos

Put photos from Unsplash or Pexels into `client/public/images/real/` with the names listed in the README.txt inside that folder (for example `deluxe-1.jpg`, `hero.jpg`, `restaurant.jpg`, `deluxe-360.jpg`), then run `npm run seed` in the server folder. Missing photos fall back to the built-in ones automatically.

## Promo codes (demo)

`WELCOME10` (10% off) · `STAY3` (15% off, 3+ nights) · `APTECH20` (20% off). Admin/manager can add more in Promo codes.

## Main features

- Website: intro animation, 3D hotel, rooms with **360° view**, photos, **3D + AR**, availability calendar with daily prices, room reviews, saved rooms (♥), dining, spa, offers, gallery, about, contact, FAQ, privacy, booking with promo codes, Stripe payment, **Concierge chat** (answers from live hotel data), **dark mode**, **English / اردو**, installable as an app (PWA).
- Guest: my stay, QR digital key, services, issue reports, pay online, bookings, ratings, invoices (view, print, PDF), my account, password, login history, log out all devices, GDPR export/delete.
- Staff: 3D animated dashboard, live 3D/2D room map, **live activity feed**, front desk, reservations, **drag-and-drop booking calendar**, guests, housekeeping, maintenance, services, messages, invoices, reports, forecast, smart pricing, **night audit** (automatic every night 23:55 + PDF), promo codes, feedback, rooms with photo / 360° / 3D upload, staff, settings, audit log, Ctrl+K page search.
- Rules: exactly one admin (cannot be created, changed or deactivated); every role can change own details and password.
