# LuxuryStay — Free Live Hosting Guide (Render + MongoDB Atlas)

Ek hi free Render web service API aur website dono chalaati hai (same link). Total time: ~20 minute.

## 1. MongoDB Atlas (database) — already bana hua hai
1. Atlas → **Network Access** → **Add IP Address** → `0.0.0.0/0` (Allow access from anywhere). Render ka IP fixed nahi hota, is liye ye zaroori hai.
2. **Database → Connect → Drivers** se connection string copy karo (`mongodb+srv://...`). Password sahi dalna.

## 2. Code GitHub pe daalo
```bash
cd luxurystay
git init
git add .
git commit -m "LuxuryStay HMS"
git branch -M main
git remote add origin https://github.com/<your-username>/luxurystay.git
git push -u origin main
```
`.gitignore` already `.env`, `node_modules`, `dist`, `uploads` ko bahar rakhta hai — keys GitHub pe nahi jayengi.

## 3. Render pe deploy
1. https://render.com → GitHub se sign up.
2. **New → Blueprint** → apni `luxurystay` repo choose karo. Render `render.yaml` khud parh lega.
3. Ye values maangega — paste karo:
   - `MONGO_URI` = Atlas wali string
   - `STRIPE_SECRET_KEY` = `sk_test_...` (Stripe dashboard se)
   - `GEMINI_API_KEY` = Google AI Studio key
   - `CLIENT_URL` = pehle khali chhor do, deploy ke baad apna link (e.g. `https://luxurystay-xxxx.onrender.com`) daal ke **Save** karo.
   - JWT secrets Render khud bana deta hai.
4. **Apply** → 5–8 minute build. Link milega: `https://luxurystay-xxxx.onrender.com`.

## 4. Demo data (seed)
Apne laptop pe (server/.env mein wahi Atlas `MONGO_URI` ho):
```bash
cd server
npm run seed
```
Live site ab usi database ko use karegi. Login credentials documentation mein hain.

## 5. Database backup (Aptech ZIP ke liye)
```bash
cd server
npm run backup      # server/backup/<date>/*.json ban jayegi
npm run restore     # backup wapas daalne ke liye
```
`server/backup` folder ko final ZIP mein zaroor daalna.

## 6. Yaad rakho
- Free Render 15 minute idle ke baad so jata hai — presentation se 1–2 minute pehle link khol lo.
- Stripe test card: `4242 4242 4242 4242`, koi bhi future date, koi bhi CVC.
- Uploads (naye room photos) free plan pe restart ke baad mit sakte hain; seed wali images `client/public` mein hain to woh hamesha rahengi.
- Kabhi bhi koi secret key code ya ZIP mein mat daalna.

## 7. Final Aptech ZIP
Naam: `[BATCH]_[GROUP]_LuxuryStay_HMS.zip`, andar:
- `source/` — ye project (node_modules ke baghair)
- `documentation/` — doc ka PDF export (login credentials ke saath)
- `database/` — `server/backup` wala folder
- `presentation/` — slides ka PPTX/PDF export
- `video/` — demo video
