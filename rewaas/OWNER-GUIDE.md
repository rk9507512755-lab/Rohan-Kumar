# REWAAS — Owner's Guide (Aapke liye poora process)

Ye guide aapke liye hai: website live karna, apni photos daalna aur roz ka kaam chalana.
Technical setup ki details `README.md` mein hain.

---

## Part 1 — Website live karna (ek baar)

### 1. Vercel account
1. **vercel.com** → **Sign Up** → **Continue with GitHub** (wahi account jismein `Rohan-Kumar` repo hai).
2. Plan: **Hobby (Free)**.

### 2. Project import
1. **Add New → Project** → `Rohan-Kumar` ke saamne **Import**.
2. **Root Directory → Edit → `rewaas`** chuniye. *(Ye step sabse zaroori hai.)*
3. **Environment Variables** mein ye daaliye:

| Name | Value |
|---|---|
| `AUTH_SECRET` | 50+ akshar ka random text (password generator se). Kisi ko na batayein. |
| `SEED_ADMIN_EMAIL` | Aapka admin email |
| `SEED_ADMIN_PASSWORD` | Mazboot admin password (kam se kam 10 akshar — isse kam hone par deploy ruk jayega) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp number, jaise `919876543210` |

4. **Deploy** dabaiye. Pehli baar fail hoga (database nahi juda) — ye normal hai.

### 3. Database aur photo storage
Usi project mein **Storage** tab:
1. **Create Database → Neon (Postgres)** → region **Singapore** → Create → **Connect**.
2. **Create → Blob** → Create → **Connect**. *(Isi mein aapki upload ki hui photos save hongi.)*

### 4. Branch
Code abhi `claude/inspiring-cerf-kvyrur` branch par hai.
**Settings → Environments → Production → Branch Tracking** mein ye branch naam likh kar Save kariye
*(ya Pull Request merge karke code `main` par le aaiye).*

### 5. Redeploy
**Deployments → ⋯ → Redeploy**. 3–5 minute mein link milega (jaise `rewaas.vercel.app`).
Pehli baar database apne aap ban jaata hai: 50 demo products, categories, banners aur aapka admin account. **Nakli reviews, testimonials, customers ya orders live site par nahi banaye jaate** — asli reviews customers khud likhenge, aur homepage ka reviews section tab dikhega jab aap Admin → Testimonials mein asli customer ki baat jodenge.
Phir **Settings → Environment Variables** mein `NEXT_PUBLIC_SITE_URL` = aapka link daal kar ek baar aur Redeploy.

### 6. Pehla login
- Admin panel: `aapka-link/admin` → Step 2 wala email/password.
- Password badalna: `aapka-link/account/profile` → **Change password** (admin account par bhi chalta hai).

---

## Part 2 — Apne products ki photos daalna

### Photo kaisi ho (best results ke liye)
- **Size:** portrait **4:5** (jaise 1200 × 1500 px). Square ya landscape bhi chalegi, par cards mein upar-neeche se kategi.
- **Format:** JPG / PNG / WebP, **10 MB se kam**.
- **Background:** saaf, halka (ivory / cream / safed deewar). Din ki roshni, khidki ke paas — flash nahi.
- **Har product ki 3–5 photos:** 1) pura look (front), 2) back ya side, 3) kapde / kadhai ka close-up, 4) pallu ya dupatta, 5) koi model ya styled shot.
- **Rang asli dikhna chahiye** — filter mat lagayein (returns kam honge).

### Kisi product ki photo badalna
1. **Admin → Products** → upar search mein product ka naam likhiye → product kholiye.
2. Neeche **Images** section mein **Upload images** → apni photos chuniye (ek saath kai photos chun sakte hain) → **Add images**.
3. Nayi photo ko sabse upar laane ke liye uske saamne **▲ (Move up)** dabaiye. **Sabse upar wali photo hi card aur product page par pehle dikhti hai.** Card par mouse le jaane par doosri photo dikhti hai.
4. Purani demo photo ke saamne **Delete** dabaiye.
5. Har photo ka **Alt text** likhiye (jaise "Red Banarasi saree with gold zari pallu") — Google search mein madad karta hai.
6. Store mein product page khol kar check kar lijiye.

### Naya product jodna
1. **Admin → Products → New product**.
2. Naam (link apne aap banega), short + full description, fabric, kaam (zari, chikankari…), wash care.
3. **Price** (bechne ka daam) aur **Compare-at price** (MRP — isse "% off" badge banta hai), rupees mein.
4. Category chuniye, occasions tick kariye (wedding, festive…), collections mein `festive` / `bridal` / `gift-combo` likhne se product un pages par bhi aa jaata hai.
5. **New Arrival / Bestseller / Featured** tick karne se homepage par dikhega.
6. Save → phir photos upload kariye (upar wala tareeka).
7. **Variants** table mein har size + colour ki line banaiye: SKU (unique code), stock. Saree / hamper ke liye size `Free Size` rakhiye.
8. Status **Active** hote hi product store par dikhne lagta hai. Taiyaari ke dauran **Draft** rakhiye.

### Bahut saari photos ek saath (folder tareeka)
Har product ke liye `rewaas/public/products/<folder-naam>/` mein `1.jpg`, `2.jpg`… GitHub par upload kariye — agli deploy par apne aap lag jayengi. Poora tareeka aur har product ka folder naam: **`PRODUCT-PHOTO-FOLDERS.md`**.

### Category, banner aur hamper ki photos
- **Category photo:** Admin → Categories → category → image upload.
- **Homepage ke bade banner:** Admin → Banners → desktop (landscape) aur mobile (portrait) dono photos.
- **Hamper builder ke box / items:** Admin → Gift Studio.

---

## Part 3 — Roz ka kaam

| Kaam | Kahan |
|---|---|
| Naye orders dekhna | Admin → **Orders** (sidebar par naye orders ki ginti dikhti hai) |
| Order pack hone par | Order kholiye → status **Processing** |
| Courier ko dene par | Courier naam + tracking number daaliye → status **Shipped** (customer apne account / Track Order mein dekh sakta hai) |
| Delivery ke baad | Status **Delivered**; COD ho to **Mark COD paid** |
| GST invoice | Order → **Invoice** → Print / PDF save |
| Order cancel | Order → Cancel (reason ke saath) — stock apne aap wapas jud jaata hai |
| Return / exchange | Admin → **Returns** → Approve → Picked up → Complete |
| Stock khatam hone ki chetavni | Admin **Dashboard** → low-stock list |
| Coupon banana | Admin → **Coupons** (percent ya flat, minimum order, expiry) |
| Upar ki patti ka message | Admin → **Announcements** |
| Customer reviews homepage par | Admin → **Testimonials** |
| Policy pages, FAQ, About | Admin → **Pages** |
| Shipping charge, COD fee, GST rate, WhatsApp number | Admin → **Settings** |
| Newsletter emails ki list | Admin → **Newsletter** → CSV download |

---

## Part 4 — Online payment (Razorpay)
1. **razorpay.com** par account banaiye, KYC (PAN, bank, GST) poora kariye. Approval mein 1–3 din.
2. Pehle **Test mode** keys: Settings → API Keys → Generate.
3. Vercel → Settings → Environment Variables: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` → Redeploy. Checkout par "Pay online" chalu ho jayega (UPI, card, net banking, wallets).
4. Razorpay → Webhooks → URL `aapka-link/api/payments/razorpay/webhook`, events: `payment.captured`, `order.paid`, `payment.failed`. Secret ko `RAZORPAY_WEBHOOK_SECRET` mein daaliye.
5. Test payment karke dekhiye → sab theek ho to **Live mode** keys se badal dijiye.

---

## Part 5 — Apna domain (jaise rewaas.com)
1. GoDaddy / Hostinger / Namecheap se domain khareediye.
2. Vercel → Settings → **Domains** → domain daaliye → Vercel jo DNS records bataye, wo domain provider ki DNS settings mein daaliye.
3. Kuch ghanton mein chalu. Phir `NEXT_PUBLIC_SITE_URL` = `https://www.aapka-domain.com` → Redeploy.
4. **Google Search Console** mein site add karke verification code `NEXT_PUBLIC_GSC_VERIFICATION` mein daaliye, aur `aapka-domain/sitemap.xml` submit kariye.

---

## Launch se pehle checklist
- [ ] Admin password badla
- [ ] Demo products ki jagah apni photos / apne products (demo products Delete ya Draft karein)
- [ ] Settings mein apna phone, email, address, GSTIN, Instagram link
- [ ] Policy pages (shipping, returns, privacy, terms) apne hisaab se padh kar edit
- [ ] Demo coupons (WELCOME10 etc.) rakhne hain ya hatane hain — decide karein
- [ ] Product descriptions apne asli products ke hisaab se likhiye (fabric, kaam, kahan bana). Pakke na hon aise daave (jaise "Silk Mark certified", "X ghante ka kaam") demo copy se hata diye gaye hain — sach ho to hi jodiye
- [ ] Ek test order (COD) khud place karke poora flow check
- [ ] Razorpay live keys
