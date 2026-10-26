# Missing / adhoora data — listing

Ye files `scripts/missing_report.py` se bani hain. Har row mein kaaran aur aage kya karna hai likha hai.

## 1. AC-level (poori AC missing ya kamzor) — `missing_or_partial_ACs.csv`

| Election | DOWNLOADED_BUT_NOT_ON_DRIVE | FILE_UNREADABLE | NOT_ON_CEO_WEBSITE | NO_SOURCE_URL | PARTIAL (grade C) | PARTIAL (grade D) | SCAN_UNREADABLE | WRONG_FILE_ON_DRIVE |
|---|---|---|---|---|---|---|---|---|
| LS2014 | 4 | 8 | 112 | 0 | 10 | 3 | 0 | 0 |
| LS2019 | 0 | 0 | 1 | 0 | 4 | 1 | 0 | 1 |
| LS2024 | 2 | 0 | 0 | 73 | 40 | 0 | 27 | 0 |
| VS2012 | 0 | 1 | 0 | 0 | 17 | 1 | 0 | 0 |
| VS2017 | 19 | 1 | 0 | 0 | 6 | 4 | 0 | 0 |
| VS2022 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 1 |

Category ka matlab:

* **DOWNLOADED_BUT_NOT_ON_DRIVE** — Source par file thi (Drive banate waqt download hui), par Drive par upload nahi hui — URL maujood hai
* **NOT_ON_CEO_WEBSITE** — CEO UP website par us waqt 404 tha — source par hi nahi mili
* **NO_SOURCE_URL** — Na Drive par file, na download log mein URL — district DEO portal par dhoondhna hoga
* **FILE_UNREADABLE** — File hai par usme votes/table nahi (khaali ya tooti file)
* **SCAN_UNREADABLE** — Scanned/camera-photo PDF, OCR 50% se kam rows sahi — data withheld
* **WRONG_FILE_ON_DRIVE** — Drive par is AC ki jagah kisi aur AC ka data hai
* **PARTIAL (grade C)** — Data hai par adhoora/kamzor (50–90% booths ka jod total se milta hai, ya header mismatch)
* **PARTIAL (grade D)** — Data hai par bahut kamzor (<50% booths ka jod milta hai, ya duplicate data)

## 2. Booth-number gaps — `booth_number_gaps.csv`

185 ACs mein kuch booth numbers nahi mile (kul 15,375). Bahut bade, AC ke booth count se door ke numbers (zyadatar OCR misread) `suspicious_booth_numbers` mein alag likhe hain.

## 3. Candidates jinki party/naam file mein nahi — `candidates_missing_party_or_name.csv`

6,619 candidate entries (NOTA ke alawa). Inme LS2024 ke lagbhag saare hain kyunki 2024 ke Form-20 PDFs mein party nahi hoti.

## 4. Bye-elections jo Drive par hain hi nahi — `bye_elections_not_on_drive.csv`

42 bye-elections (2017–2024). Drive par sirf 2013–2018 ke 29 summary PDFs hain; kisi bhi bye-election ka booth-wise Form-20 Drive par nahi hai.

| Poll date | House | Constituency | AC |
|---|---|---|---|
| 2017-12-21 | Vidhan Sabha | Sikandra | 207 |
| 2019-09-23 | Vidhan Sabha | Hamirpur | 228 |
| 2019-10-21 | Vidhan Sabha | Gangoh | 7 |
| 2019-10-21 | Vidhan Sabha | Rampur | 37 |
| 2019-10-21 | Vidhan Sabha | Iglas | 77 |
| 2019-10-21 | Vidhan Sabha | Lucknow Cantt | 175 |
| 2019-10-21 | Vidhan Sabha | Govind Nagar | 212 |
| 2019-10-21 | Vidhan Sabha | Manikpur | 237 |
| 2019-10-21 | Vidhan Sabha | Pratapgarh | 248 |
| 2019-10-21 | Vidhan Sabha | Zaidpur | 269 |
| 2019-10-21 | Vidhan Sabha | Jalalpur | 280 |
| 2019-10-21 | Vidhan Sabha | Balha | 282 |
| 2019-10-21 | Vidhan Sabha | Ghosi | 354 |
| 2020-11-03 | Vidhan Sabha | Naugawan Sadat | 40 |
| 2020-11-03 | Vidhan Sabha | Bulandshahr | 65 |
| 2020-11-03 | Vidhan Sabha | Tundla | 95 |
| 2020-11-03 | Vidhan Sabha | Bangermau | 162 |
| 2020-11-03 | Vidhan Sabha | Ghatampur | 218 |
| 2020-11-03 | Vidhan Sabha | Deoria | 337 |
| 2020-11-03 | Vidhan Sabha | Malhani | 367 |
| 2022-06-23 | Lok Sabha | Rampur |  |
| 2022-06-23 | Lok Sabha | Azamgarh |  |
| 2022-11-03 | Vidhan Sabha | Gola Gokrannath | 139 |
| 2022-12-05 | Vidhan Sabha | Rampur | 37 |
| 2022-12-05 | Vidhan Sabha | Khatauli | 15 |
| 2022-12-05 | Lok Sabha | Mainpuri |  |
| 2023-05-10 | Vidhan Sabha | Suar | 34 |
| 2023-05-10 | Vidhan Sabha | Chhanbey | 395 |
| 2023-09-05 | Vidhan Sabha | Ghosi | 354 |
| 2024-05-13 | Vidhan Sabha | Dadraul | 136 |
| 2024-05-13 | Vidhan Sabha | Lucknow East | 173 |
| 2024-05-13 | Vidhan Sabha | Gainsari | 292 |
| 2024-05-13 | Vidhan Sabha | Duddhi | 403 |
| 2024-11-20 | Vidhan Sabha | Katehari | 277 |
| 2024-11-20 | Vidhan Sabha | Karhal | 110 |
| 2024-11-20 | Vidhan Sabha | Meerapur | 16 |
| 2024-11-20 | Vidhan Sabha | Ghaziabad | 56 |
| 2024-11-20 | Vidhan Sabha | Majhawan | 397 |
| 2024-11-20 | Vidhan Sabha | Sisamau | 213 |
| 2024-11-20 | Vidhan Sabha | Khair | 71 |
| 2024-11-20 | Vidhan Sabha | Phulpur | 256 |
| 2024-11-20 | Vidhan Sabha | Kundarki | 29 |

Ye list web search se verify ki gayi (Oct 2026): [Wikipedia: List of by-elections to the UP Legislative Assembly](https://en.wikipedia.org/wiki/List_of_by-elections_to_the_Uttar_Pradesh_Legislative_Assembly), [2024 UP by-elections](https://en.wikipedia.org/wiki/2024_Uttar_Pradesh_Legislative_Assembly_by-elections), [Hitavada (2019)](https://www.thehitavada.com/Encyc/2019/10/25/BJP-wins-17-Cong-11-Assembly-by-polls-seats.html), [Deccan Herald (2020)](https://www.deccanherald.com/india/uttar-pradesh-bypolls-bjp-retains-6-seats-sp-bags-one-914084.html), [DailyO (2022)](https://dailyo.in/amp/news/mainpuri-goes-to-sps-bahu-dimple-bjp-ends-azam-khan-era-in-rampur-but-loses-khatauli-38185), [Deccan Herald (2023)](https://www.deccanherald.com/amp/story/india%2Fup-bypolls-suar-and-chhanbey-assembly-seats-to-see-voting-on-may-10-1204726.html). Isme 2012–2016 ke kuch bye-elections chhoot sakte hain jo search mein nahi aaye.

## Internet se khud nikalne ki koshish

Network access badalne ke baad (Oct 2026): `cdn.s3waas.gov.in` (district portals ki files) se Lok Sabha 2024 ki 66 missing PDFs download ho gayi aur dataset mein jod di gayi (jo scans OCR mein kamzor rahe, wo withheld hain). 4 URLs ab source par bhi 404 hain. `ceouttarpradesh.nic.in` tak policy allow karti hai, par wo server is cloud se aane wala har connection TLS handshake par hi reset kar deta hai (shayad India ke bahar ke IP block) — isliye LS2014 ki 4 aur VS2017 ki 19 files (aur 404 wali 112) yahan se nahi aa sakti. `results.eci.gov.in` aur district `*.nic.in` portals abhi bhi blocked hain.

**Aage kaise:**

1. India ke kisi normal internet connection par: `python3 scripts/fetch_missing.py` (aur `--retry-404`), phir pipeline dobara chalayein (README dekhein).
2. Ya `results.eci.gov.in` aur zaroori district `*.nic.in` domains bhi allow karein.
3. `NO_SOURCE_URL` wali 2024 ACs ke Form-20 PDFs district DEO portals par hain (jaise `varanasi.nic.in/form-20/`).
