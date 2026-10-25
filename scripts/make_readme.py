"""Write README.md for the dataset repo from the built outputs."""
import os
import sys

import pandas as pd

REPO = sys.argv[1] if len(sys.argv) > 1 else "/home/user/rohan-kumar"
DATA = f"{REPO}/data"
NAMES = {"VS2012": "Vidhan Sabha 2012", "LS2014": "Lok Sabha 2014", "VS2017": "Vidhan Sabha 2017",
         "LS2019": "Lok Sabha 2019", "VS2022": "Vidhan Sabha 2022", "LS2024": "Lok Sabha 2024"}
DRIVE_FILES = {"VS2012": 403, "LS2014": 287, "VS2017": 384, "LS2019": 402, "VS2022": 403, "LS2024": 280}


def fmt(n):
    return f"{int(n):,}"


def main():
    q = pd.read_csv(f"{DATA}/UP_Form20_quality_report.csv")
    b = pd.read_csv(f"{DATA}/UP_Form20_booths.csv.gz", usecols=["election", "ac_no", "is_postal", "sum_check"])
    c = pd.read_csv(f"{DATA}/UP_Form20_candidates_ac_totals.csv", usecols=["election", "ac_no", "total_votes"])
    rows = []
    for e, name in NAMES.items():
        qe = q[q.election == e]
        ok = qe[qe.status == "OK"]
        be = b[(b.election == e) & (b.is_postal == 0)]
        g = ok.grade.value_counts()
        rows.append(f"| {name} | {DRIVE_FILES[e]} | {len(ok)} | {fmt(len(be))} | {fmt(c[c.election == e].total_votes.sum())} | "
                    f"{g.get('A', 0)} / {g.get('B', 0)} / {g.get('C', 0)} / {g.get('D', 0)} | {403 - len(ok)} |")
    cover = "\n".join(rows)
    notok = q[q.status != "OK"][["election", "ac_no", "ac_name", "status", "flags"]]
    notok_md = "\n".join(f"| {r.election} | {r.ac_no} | {r.ac_name if isinstance(r.ac_name, str) else ''} | {r.status} | "
                         f"{str(r.flags)[:140] if isinstance(r.flags, str) else ''} |" for r in notok.itertuples())
    sizes = {f: os.path.getsize(os.path.join(DATA, f)) for f in os.listdir(DATA) if os.path.isfile(os.path.join(DATA, f))}
    nb = len(b[b.is_postal == 0])
    match = (b.sum_check == "match").sum()
    nocheck = (b.sum_check == "no_total_in_file").sum()
    text = f"""# UP Form 20 – booth-wise election results (2012–2024) + bye-elections

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
{cover}

Total: **{fmt(nb)} polling-station rows**; inme se {fmt(match)} booths par candidate votes ka jod file ke apne
"Total" column se exact milta hai, {fmt(nocheck)} booths ki file mein total column hi nahi tha.

**Grade:** A = ≥98% booths ka jod file ke total se milta hai · B = ≥90%, ya file ke Total column mein
pehchani hui systematic galti (jaise S.No. column bhi jud gaya), ya file mein total column hi nahi par
total row se milaan theek · C = 50–90% match, ya header mein doosri AC ka naam · D = 50% se kam match, ya
do ACs ka data hubahu ek jaisa · F = data nahi nikal paya / withheld (neeche list).

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
* **2024 PDFs**: ~100 digital PDFs text layer se; baaki scanned/camera-photo PDFs ko OCR (tesseract) se padha gaya –
  har row ka jod "Total valid votes" se check hota hai, fail rows ko cell-by-cell dobara padha jata hai, aur sirf
  ek unreadable cell bachne par hi use row total se nikala jata hai (`data_note` mein likha hai). Jis AC mein 50%
  se kam rows check pass karein, uska OCR data shamil nahi kiya gaya.
* Drive par Lok Sabha 2014 ki 112 ACs, Vidhan Sabha 2017 ki 19 ACs aur Lok Sabha 2024 ki ~120 ACs ki files hi nahi hain.

## Jo ACs dataset mein nahi hain / data withheld

| Election | AC | Naam | Status | Kaaran |
|---|---|---|---|---|
{notok_md}

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
"""
    open(f"{REPO}/README.md", "w").write(text)


if __name__ == "__main__":
    main()
