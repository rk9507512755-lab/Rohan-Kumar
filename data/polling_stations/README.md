# UP polling station lists (2025–26)

District DEO portals (`<district>.nic.in`) par chhapi **matdey sthal suchi** (polling station list), Vidhan Sabha-wise.
Har district ki sabse nayi list li gayi (Oct 2026 draft / Jan 2026 final). Jahan nayi list scan (photo) thi, wahan
usi site ki purani text-wali list (2024–2025) li gayi – `list_upload` column me mahina likha hai.

| File | Kya hai |
|---|---|
| `UP_polling_stations_2026.csv.gz` | Har booth ki ek row: district, ac_no, ac_name, ps_no, location (gaon/mohalla), building, area (shamil mohalle/purve), voters_for (sabhi / mahila / purush), electors (jahan list me diya), tehsil_block_zone (jahan list me diya), list_title, list_upload, source_url, source_page |
| `coverage_by_ac.csv` | Har AC: OK / PARTIAL / MISSING, booth sankhya, number gaps/duplicates, AC kaise pehchani gayi, source URLs |
| `files_not_used.csv` | Jo PDF use nahi hui aur kyun (SCANNED = sirf photo, NO_TABLE, NOT_ONE_AC = poore district ki list, download fail) |

**Dhyan dein**
* Ye 2026 ki numbering hai. 2022/2024 ke Form-20 booth number isse alag hain; inko milane ke liye naam ka milaan (location/building) karna hoga.
* AC ki pehchaan: PDF ke header se, link ke text se, ya (jahan dono nahi) gaon ke naamon ka Form-20 booth naamon se phonetic milaan (`ac_identified_by = name_match`).
* Kruti Dev text Unicode me badla gaya; kuch PDFs ka font tuta hua hai – jo akshar pehchane ja sake theek kiye, baaki naamon me ajeeb akshar reh sakte hain.
* `ps_no_inferred = True`: list me booth number chhapa hi nahi tha, row ke kram se diya gaya.
* MISSING ACs: un districts ki saari lists scan (photo) hain. OCR try kiya – scan ki quality kam hone se gaon ke naam galat padhe ja rahe hain, isliye shamil nahi kiya.
  `ceouttarpradesh.nic.in` (sabhi ACs ki list) yahan se nahi khulta.

Banane ka tareeka: `scripts/ps_crawl.py` → `ps_select.py` → `ps_fetch.py [--fallback]` → `ps_build.py`.
