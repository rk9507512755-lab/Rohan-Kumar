# UP Form 20 – booth-wise election results (2012–2024) + bye-elections

Uttar Pradesh ke CEO ke **Form 20 (booth-wise final result sheets)** ko parse karke ek clean, ek-jaisa
dataset banaya gaya hai: Vidhan Sabha 2012, 2017, 2022 aur Lok Sabha 2014, 2019, 2024 – har polling station
(booth) par har candidate ke votes. Bye-elections (2013–2018) ke Drive par sirf constituency-level result
sheets hain (booth-wise nahi), unka alag table hai.

* Source: Google Drive folder `1j5W3SUa0RmzLpJaJbQSToTVXZTxo7KhI` (original CEO UP files – XLS/XLSX/PDF).
* Drive ke `00_MASTER/*.csv` aur master XLSX **use nahi kiye gaye** – sab kuch original per-AC files se dobara parse kiya gaya hai.
* Purani files ka **Kruti Dev** (legacy Hindi font) text Unicode Devanagari mein convert kiya gaya hai
  (font ke naam se, aur jahan font galat set tha wahan text-pattern se pehchaan kar).

## Coverage

| Election | Drive files | ACs in dataset | Booths | Votes (all candidates) | Grade A / B / C / D | ACs missing |
|---|---|---|---|---|---|---|
| Vidhan Sabha 2012 | 403 | 402 | 133,232 | 77,097,019 | 348 / 36 / 17 / 1 | 1 |
| Lok Sabha 2014 | 287 | 279 | 99,062 | 58,540,507 | 244 / 22 / 10 / 3 | 124 |
| Vidhan Sabha 2017 | 384 | 383 | 140,043 | 83,742,119 | 365 / 8 / 6 / 4 | 20 |
| Lok Sabha 2019 | 402 | 401 | 162,705 | 88,129,592 | 390 / 6 / 4 / 1 | 2 |
| Vidhan Sabha 2022 | 403 | 402 | 174,371 | 93,573,406 | 389 / 10 / 2 / 1 | 1 |
| Lok Sabha 2024 | 280 | 258 | 93,506 | 55,211,096 | 212 / 21 / 25 / 0 | 145 |

Total: **802,919 polling-station rows**; inme se 761,331 booths par candidate votes ka jod file ke apne
"Total" column se exact milta hai, 31,206 booths ki file mein total column hi nahi tha.

**Grade:** A = ≥98% booths ka jod file ke total se milta hai · B = ≥90%, ya file ke Total column mein
pehchani hui systematic galti (jaise S.No. column bhi jud gaya), ya file mein total column hi nahi par
total row se milaan theek · C = 50–90% match, ya header mein doosri AC ka naam · D = 50% se kam match, ya
do ACs ka data hubahu ek jaisa · F = data nahi nikal paya / withheld (neeche list).

## Sanity check: AC-wise jeetne wale (booth votes ke jod se)

Har AC mein sabse zyada votes wala candidate (dataset ke apne jod se). Ise asli nateejon se milaya ja sakta hai
(jaise VS2017: BJP 312, SP 47, BSP 19, ADAL 9, INC 7, SBSP 4); farq gayab/withheld ACs aur bina-party wale
candidates (`?`) ki wajah se hai. Lok Sabha mein ye AC-segment ke "leader" hain, seat ke winner nahi.

| Election | ACs | Winners by party |
|---|---|---|
| Vidhan Sabha 2012 | 402 | SP 191, BSP 63, ? 48, BJP 40, INC 24, RLD 8, IND 5, PECP 2 |
| Lok Sabha 2014 | 279 | BJP 220, ? 25, SP 20, BSP 6, INC 4, ADAL 4 |
| Vidhan Sabha 2017 | 383 | BJP 275, SP 42, ? 26, BSP 16, ADAL 9, INC 6, SBSP 4, RLD 1 |
| Lok Sabha 2019 | 401 | BJP 256, BSP 65, SP 40, ? 13, ADAL 9, INC 8, RLD 4, IND 2 |
| Vidhan Sabha 2022 | 402 | BJP 221, SP 102, ? 40, ADAL 11, RLD 8, SBSP 6, NISHAD 3, IND 2 |
| Lok Sabha 2024 | 258 | 2024 ke Form-20 PDFs mein party nahi likhi hoti, isliye ye tally sambhav nahi |

## Files (`data/`)

| File | Kya hai |
|---|---|
| `long/UP_Form20_<ELECTION>_long.csv.gz` | **Long format**: election, ac_no, ac_name, booth_id, candidate_sr, candidate, party, party_std, votes – har booth × candidate ek row |
| `UP_Form20_booths.csv.gz` | **Booth-level table**: electors, turnout (male/female/other/total), sabhi candidates ka jod, NOTA, rejected, tendered, file ke apne totals, sum-check, booth winner / runner-up / margin |
| `UP_Form20_candidates_ac_totals.csv` | AC-level candidate totals (booths + postal) aur rank |
| `excel/UP_Form20_<ELECTION>.xlsx` | Har election ki Excel: README, booths, booth_votes_wide (har candidate ka column), candidates, quality |
| `UP_Form20.sqlite.xz` | SQLite database (xz-compressed): `elections`, `constituencies`, `candidates`, `booths`, `votes`, `quality`, `bye_elections` + view `long` |
| `UP_Form20_quality_report.csv` / `.xlsx` | **Har AC ki quality report** – grade, booth count, booth number gaps/duplicates, sum-check rate, file ke total row se milaan, Kruti Dev cells, flags |
| `UP_assembly_constituencies.csv` | AC number → naam, district |
| `UP_bye_elections_2013_2018_constituency_results.csv` | Bye-elections ke candidate-wise results (constituency level) |

`booth_id` = booth number + suffix (jaise `12`, `12अ`, `12A`); `POSTAL` = postal ballot row. Duplicate booth
rows `#2` suffix ke saath rakhi gayi hain. `party` = file mein jaisa likha tha; `party_std` = standard short code
(BJP, SP, BSP, INC, RLD, IND, NOTA …). Candidate naam file ki bhasha mein hain (English ya Hindi Unicode).

```sql
-- SQLite example: 2022 mein har AC ka booth-wise BJP vote share
SELECT b.ac_no, b.booth_id, 1.0*v.votes/b.candidate_votes_total AS bjp_share
FROM votes v JOIN candidates c USING(election, ac_no, candidate_sr)
JOIN booths b USING(election, ac_no, booth_id)
WHERE v.election='VS2022' AND c.party_std='BJP' AND b.is_postal=0;
```

## Source files ki khaas dikkatein (quality report mein flag ki gayi hain)

* **District workbooks**: kai XLS/XLSX files mein poore district ki ACs alag-alag sheets mein hain – har AC ke liye
  uske number wali sheet chuni gayi.
* **Galat file**: kuch ACs ki file mein kisi doosri AC ka data hai (header aur booth rows hubahu same). Jahan header se
  asli AC pakki hui, data sirf usi AC ke naam rakha gaya; baaki ko `WRONG_FILE` maan kar data se bahar rakha gaya.
* **Total column ki galti**: kai files ka "Total" formula candidate S.No. columns ko bhi jod deta hai
  (har booth par +n(n+1)/2−1) – candidate votes sahi hain, flag kiya gaya hai.
* **NOTA column gayab** (2014 ki kuch files) – total aur candidate-jod mein chhota farq.
* **Khaali files**: Lok Sabha 2014 ki kuch files (jaise Agra AC 87–94) mein votes bhare hi nahi hain.
* **2024 PDFs**: ~100 digital PDFs text layer se padhe gaye. Baaki scanned/camera-photo PDFs ke liye OCR pipeline:
  rotation/perspective correction → table grid (ruled lines) → har column ka tesseract OCR → **self-trained digit
  reader** (jo rows "candidate votes ka jod = Total valid" check pass karti hain, unke digits se usi document ke
  font par kNN model banta hai aur baaki cells dobara padhe jaate hain) → fail rows ka cell-by-cell re-OCR → agar
  sirf ek cell unreadable bache to use row total se nikala jata hai. Har aisi row `data_note` mein marked hai.
  Jis AC mein 50% se kam rows check pass karein, uska OCR data shamil nahi kiya gaya (`OCR_UNRELIABLE`).
  OCR wale ACs ke candidate naam/party, usi PC ke digital AC se liye gaye jahan ballot same hai (vote-share
  correlation se pehchaan); ye quality report mein likha hai.
* **Party**: 2024 ke Form-20 PDFs mein sirf candidate ka naam hota hai, party nahi – isliye LS2024 mein `party`
  zyadatar khaali hai (bahar ke kisi source se andaaze se nahi bhari gayi). Purane saalon mein jahan party column
  khaali/galat tha, wahan naam ke saath likhi party alag ki gayi; phir bhi kuch candidates bina party ke hain (`?`).
* **Bye-elections**: Drive ki files Form-21E / result summary hain (booth-wise nahi). 24 text PDFs parse hue; 6
  scanned sheets ko image dekh kar manually transcribe kiya gaya aur har ek ka jod sheet ke "Total valid votes"
  se exact milaya gaya (`method` column).
* Drive par Lok Sabha 2014 ki 112 ACs, Vidhan Sabha 2017 ki 19 ACs aur Lok Sabha 2024 ki ~120 ACs ki files hi nahi hain.

## Jo ACs dataset mein nahi hain / data withheld

| Election | AC | Naam | Status | Kaaran |
|---|---|---|---|---|
| LS2014 | 87 | Agra | NO_TABLE_FOUND | NO_TABLE_FOUND |
| LS2014 | 88 | Agra | NO_TABLE_FOUND | NO_TABLE_FOUND |
| LS2014 | 89 | Agra | NO_TABLE_FOUND | NO_TABLE_FOUND |
| LS2014 | 90 | Agra | NO_TABLE_FOUND | NO_TABLE_FOUND |
| LS2014 | 91 | Fatehpur | NO_TABLE_FOUND | NO_TABLE_FOUND |
| LS2014 | 92 | Kheragarh | NO_TABLE_FOUND | NO_TABLE_FOUND |
| LS2014 | 93 | Fatehabad | NO_TABLE_FOUND | NO_TABLE_FOUND |
| LS2014 | 94 | Bah | NO_TABLE_FOUND | NO_TABLE_FOUND |
| LS2019 | 334 | Hata | WRONG_FILE | WRONG_FILE: file holds the booth data of AC 364 (identical rows); data withheld for this AC |
| LS2024 | 82 | Mant | NEEDS_OCR | NEEDS_OCR |
| LS2024 | 83 | Goverdhan | NEEDS_OCR | NEEDS_OCR |
| LS2024 | 103 | Aliganj | NEEDS_OCR | NEEDS_OCR |
| LS2024 | 104 | Etah | NEEDS_OCR | NEEDS_OCR |
| LS2024 | 105 | Marhara | NEEDS_OCR | NEEDS_OCR |
| LS2024 | 154 | Sawayajpur | NEEDS_OCR | NEEDS_OCR |
| LS2024 | 155 | Shahabad | NEEDS_OCR | NEEDS_OCR |
| LS2024 | 166 | Bhagwantnagar | NEEDS_OCR | NEEDS_OCR |
| LS2024 | 179 | Harchandpur | NEEDS_OCR | NEEDS_OCR |
| VS2012 | 323 | Gorakhpur | NO_TABLE_FOUND | NO_TABLE_FOUND |
| VS2017 | 57 | Modinagar | NO_TABLE_FOUND | NO_TABLE_FOUND |
| VS2022 | 53 | Loni | WRONG_FILE | WRONG_FILE: file holds the booth data of AC 240 (identical rows); data withheld for this AC |

## Dobara banana (reproduce)

```bash
python3 scripts/download_drive.py            # Drive se raw files (drive.usercontent.google.com)
python3 -I scripts/extract.py               # 2012–2022 XLS/XLSX
python3 -I scripts/pdf_extract.py           # 2024 digital PDFs
python3 -I scripts/ocr_extract.py           # 2024 scanned PDFs (tesseract eng+hin, opencv)
python3 -I scripts/bye.py work/bye.csv      # bye-elections
python3 -I scripts/build.py data            # saare outputs + quality report
```

Main modules: `krutidev.py` (Kruti Dev → Unicode), `loader.py` (XLS/XLSX + font-aware conversion),
`parse_wide.py` / `parse_simple.py` / `parse_triplet.py` / `parse_rounds.py` (Excel layouts),
`pdf_table.py` (word-position tables), `pdf_ocr.py` + `ocr.py` (grid OCR), `build.py` (outputs + quality).
