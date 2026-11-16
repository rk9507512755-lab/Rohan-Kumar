# Product Photo Folders — apni photos kaise lagayein

Har product ka ek **folder naam** hai (neeche list). Apni photos us folder mein daal kar GitHub par upload kariye — agli deploy par photos apne aap us product par lag jayengi.

## Tareeka (GitHub website se, bina kisi software ke)

1. GitHub par repo kholiye → branch **`claude/inspiring-cerf-kvyrur`** chuniye (ya jo branch Vercel par live hai).
2. `rewaas` → `public` → `products` folder mein jaiye.
3. **Add file → Upload files** dabaiye.
4. Photos ko is tarah naam dekar upload kariye — **folder naam / photo naam**. GitHub par folder banane ke liye, upload karne se pehle apne computer par folder bana lijiye (jaise `zohra-embroidered-anarkali-set`) aur poora folder hi drag-and-drop kar dijiye.
   - `1.jpg` = main photo (card aur product page par pehle dikhegi)
   - `2.jpg`, `3.jpg`, … = baaki photos (pichhe se, close-up, pallu, model…)
5. Neeche **Commit changes** dabaiye.
6. Vercel apne aap nayi deploy shuru karega (3–5 minute). Photos lag jayengi, aur us product ki purani demo photos hat jayengi.

**Dhyan rakhein:**
- Folder ka naam **bilkul list jaisa** hona chahiye (chhote akshar, beech mein `-`). Galat naam hone par deploy log mein chetavni aati hai aur photos nahi lagti.
- Photo: portrait 4:5 (jaise 1200 × 1500 px), JPG/PNG/WebP, 10 MB se kam.
- Admin panel se upload ki hui photos bhi rakhi rehti hain — folder wali photos unse pehle dikhti hain.
- Photo badalni ho to folder mein us naam ki file replace kar dijiye; hatani ho to file delete karke commit kariye.
- Naya product pehle Admin → Products → New product se banaiye; uska folder naam product ke link (URL) ka aakhri hissa hota hai.

Photos sirf bhej deni hon to bhi chalega — mujhe bata dijiye, main lagwa dunga.

## Folder naam list


### Sarees

| Product | Folder naam |
|---|---|
| Gulnaar Banarasi Katan Silk Saree | `gulnaar-banarasi-katan-silk-saree` |
| Noor Tissue Banarasi Saree | `noor-tissue-banarasi-saree` |
| Meenakshi Kanjeevaram Silk Saree | `meenakshi-kanjeevaram-silk-saree` |
| Mehr Kanjeevaram Saree | `mehr-kanjeevaram-saree` |
| Aab Floral Organza Saree | `aab-floral-organza-saree` |
| Sitara Hand-Embroidered Organza Saree | `sitara-hand-embroidered-organza-saree` |
| Rangrez Bandhani Georgette Saree | `rangrez-bandhani-georgette-saree` |
| Saanjh Chiffon Saree | `saanjh-chiffon-saree` |
| Kesar Chanderi Cotton Saree | `kesar-chanderi-cotton-saree` |
| Neel Handloom Linen Saree | `neel-handloom-linen-saree` |

### Suits & Sets

| Product | Folder naam |
|---|---|
| Gulbahar Chanderi Anarkali Set | `gulbahar-chanderi-anarkali-set` |
| Zohra Embroidered Anarkali Set | `zohra-embroidered-anarkali-set` |
| Afreen Chikankari Suit Set | `afreen-chikankari-suit-set` |
| Ruhani Silk Straight Suit Set | `ruhani-silk-straight-suit-set` |
| Gulmohar Palazzo Set | `gulmohar-palazzo-set` |
| Mehfil Sharara Set | `mehfil-sharara-set` |
| Ira Linen Co-ord Set | `ira-linen-co-ord-set` |
| Tara Satin Co-ord Set | `tara-satin-co-ord-set` |

### Lehengas

| Product | Folder naam |
|---|---|
| Rajkumari Bridal Lehenga | `rajkumari-bridal-lehenga` |
| Shehzaadi Bridal Velvet Lehenga | `shehzaadi-bridal-velvet-lehenga` |
| Chandni Mirror Work Lehenga | `chandni-mirror-work-lehenga` |
| Gulabo Festive Lehenga | `gulabo-festive-lehenga` |
| Mahira Sequin Lehenga | `mahira-sequin-lehenga` |
| Inayat Silk Lehenga | `inayat-silk-lehenga` |
| Saba Organza Lehenga | `saba-organza-lehenga` |

### Kurtis

| Product | Folder naam |
|---|---|
| Ada Chikankari Kurti | `ada-chikankari-kurti` |
| Rooh Mirror Yoke Kurti | `rooh-mirror-yoke-kurti` |
| Leher Printed A-line Kurti | `leher-printed-a-line-kurti` |
| Sanganeri Block Print Kurti | `sanganeri-block-print-kurti` |
| Aangan Kurta Set | `aangan-kurta-set` |
| Kaveri Silk Kurta Set | `kaveri-silk-kurta-set` |

### Bridal Wear

| Product | Folder naam |
|---|---|
| Kundan Bridal Necklace Set | `kundan-bridal-necklace-set` |
| Noori Zardozi Potli Bag | `noori-zardozi-potli-bag` |
| Banarasi Brocade Dupatta | `banarasi-brocade-dupatta` |
| Bridal Net Head Dupatta | `bridal-net-head-dupatta` |

### Gift Hampers

| Product | Folder naam |
|---|---|
| Anarkali Suit & Kundan Jewellery Combo | `anarkali-suit-kundan-combo` |
| Banarasi Bridal Trousseau Box | `banarasi-bridal-trousseau-box` |
| Chikankari Suit Gift Combo | `chikankari-suit-gift-combo` |
| Festive Chanderi Saree & Mithai Combo | `festive-chanderi-saree-combo` |
| Kanjeevaram Shagun Gift Combo | `kanjeevaram-shagun-gift-combo` |
| Organza Saree & Jewellery Celebration Combo | `organza-saree-celebration-combo` |
| Silk Suit Festive Combo | `silk-suit-festive-combo` |
| The Grand Trousseau — Saree, Suit & Jewellery | `grand-trousseau-combo` |
| Bride-to-Be Luxe Hamper | `bride-to-be-luxe-hamper` |
| Bridesmaid Edit Hamper | `bridesmaid-edit-hamper` |
| Diwali Diya & Mithai Hamper | `diwali-diya-and-mithai-hamper` |
| Anniversary Keepsake Hamper | `anniversary-keepsake-hamper` |
| Birthday Blossom Hamper | `birthday-blossom-hamper` |
| Corporate Signature Hamper | `corporate-signature-hamper` |
| Shagun Return Gift Potli (Set of 10) | `shagun-return-gift-potli-set-of-10` |
