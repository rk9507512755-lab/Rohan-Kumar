"""List everything missing from the dataset: whole ACs, withheld/partial ACs,
booth-number gaps, candidates without party, and bye-elections not on Drive.

Usage: python3 scripts/missing_report.py <data_dir>   (writes <data_dir>/missing/)
"""
import collections
import json
import os
import re
import sys

import pandas as pd

DATA = sys.argv[1] if len(sys.argv) > 1 else "data"
OUT = f"{DATA}/missing"
STATUS = "raw/00_MASTER/_download_status.json"
YEAR2E = {"2012": "VS2012", "2014": "LS2014", "2017": "VS2017", "2019": "LS2019", "2022": "VS2022", "2024": "LS2024"}
FOLDER = {"VS2012": "01_Vidhan_Sabha_2012", "LS2014": "02_Lok_Sabha_2014", "VS2017": "03_Vidhan_Sabha_2017",
          "LS2019": "04_Lok_Sabha_2019", "VS2022": "05_Vidhan_Sabha_2022", "LS2024": "06_Lok_Sabha_2024"}

# By-elections held in UP 2012-2024 that are not on the Drive (checked by web search, Oct 2026;
# sources in MISSING.md). Constituency numbers come from data/UP_assembly_constituencies.csv.
BYE_NOT_ON_DRIVE = [
    ("2017-12-21", "VS", "Sikandra"),
    ("2019-09-23", "VS", "Hamirpur"),
    *[("2019-10-21", "VS", n) for n in ["Gangoh", "Rampur", "Iglas", "Lucknow Cantt", "Govind Nagar", "Manikpur",
                                        "Pratapgarh", "Zaidpur", "Jalalpur", "Balha", "Ghosi"]],
    *[("2020-11-03", "VS", n) for n in ["Naugawan Sadat", "Bulandshahr", "Tundla", "Bangermau", "Ghatampur",
                                        "Deoria", "Malhani"]],
    ("2022-06-23", "LS", "Rampur"), ("2022-06-23", "LS", "Azamgarh"),
    ("2022-11-03", "VS", "Gola Gokrannath"),
    ("2022-12-05", "VS", "Rampur"), ("2022-12-05", "VS", "Khatauli"), ("2022-12-05", "LS", "Mainpuri"),
    ("2023-05-10", "VS", "Suar"), ("2023-05-10", "VS", "Chhanbey"), ("2023-09-05", "VS", "Ghosi"),
    *[("2024-05-13", "VS", n) for n in ["Dadraul", "Lucknow East", "Gainsari", "Duddhi"]],
    *[("2024-11-20", "VS", n) for n in ["Katehari", "Karhal", "Meerapur", "Ghaziabad", "Majhawan", "Sisamau",
                                        "Khair", "Phulpur", "Kundarki"]],
]


# AC numbers checked against the constituency headers in the 2017/2022 files
BYE_AC = {"Sikandra": 207, "Hamirpur": 228, "Gangoh": 7, "Rampur": 37, "Iglas": 77, "Lucknow Cantt": 175,
          "Govind Nagar": 212, "Manikpur": 237, "Pratapgarh": 248, "Zaidpur": 269, "Jalalpur": 280, "Balha": 282,
          "Ghosi": 354, "Naugawan Sadat": 40, "Bulandshahr": 65, "Tundla": 95, "Bangermau": 162, "Ghatampur": 218,
          "Deoria": 337, "Malhani": 367, "Gola Gokrannath": 139, "Khatauli": 15, "Suar": 34, "Chhanbey": 395,
          "Dadraul": 136, "Lucknow East": 173, "Gainsari": 292, "Duddhi": 403, "Katehari": 277, "Karhal": 110,
          "Meerapur": 16, "Ghaziabad": 56, "Majhawan": 397, "Sisamau": 213, "Khair": 71, "Phulpur": 256,
          "Kundarki": 29}


def ranges(nums):
    nums = sorted(nums)
    out, start, prev = [], None, None
    for n in nums:
        if start is None:
            start = prev = n
        elif n == prev + 1:
            prev = n
        else:
            out.append(f"{start}-{prev}" if prev > start else str(start))
            start = prev = n
    if start is not None:
        out.append(f"{start}-{prev}" if prev > start else str(start))
    return ", ".join(out)


def norm(s):
    return re.sub(r"[^a-z]", "", (s or "").lower())


CAT_HI = {
    "DOWNLOADED_BUT_NOT_ON_DRIVE": "Source par file thi (Drive banate waqt download hui), par Drive par upload nahi hui — URL maujood hai",
    "NOT_ON_CEO_WEBSITE": "CEO UP website par us waqt 404 tha — source par hi nahi mili",
    "NO_SOURCE_URL": "Na Drive par file, na download log mein URL — district DEO portal par dhoondhna hoga",
    "FILE_UNREADABLE": "File hai par usme votes/table nahi (khaali ya tooti file)",
    "SCAN_UNREADABLE": "Scanned/camera-photo PDF, OCR 50% se kam rows sahi — data withheld",
    "WRONG_FILE_ON_DRIVE": "Drive par is AC ki jagah kisi aur AC ka data hai",
    "PARTIAL (grade C)": "Data hai par adhoora/kamzor (50–90% booths ka jod total se milta hai, ya header mismatch)",
    "PARTIAL (grade D)": "Data hai par bahut kamzor (<50% booths ka jod milta hai, ya duplicate data)",
}


def write_md(acdf, gdf, cm, bye, summ):
    L = ["# Missing / adhoora data — listing", "",
         "Ye files `scripts/missing_report.py` se bani hain. Har row mein kaaran aur aage kya karna hai likha hai.", "",
         "## 1. AC-level (poori AC missing ya kamzor) — `missing_or_partial_ACs.csv`", "",
         "| Election | " + " | ".join(summ.columns) + " |", "|---|" + "---|" * len(summ.columns)]
    for e, r in summ.iterrows():
        L.append(f"| {e} | " + " | ".join(str(int(v)) for v in r.values) + " |")
    L += ["", "Category ka matlab:", ""]
    L += [f"* **{k}** — {v}" for k, v in CAT_HI.items() if k in summ.columns]
    L += ["", f"## 2. Booth-number gaps — `booth_number_gaps.csv`", "",
          f"{len(gdf)} ACs mein kuch booth numbers nahi mile (kul {int(gdf.booths_missing.sum()):,}). "
          "Bahut bade, AC ke booth count se door ke numbers (zyadatar OCR misread) `suspicious_booth_numbers` mein alag likhe hain.", "",
          "## 3. Candidates jinki party/naam file mein nahi — `candidates_missing_party_or_name.csv`", "",
          f"{len(cm):,} candidate entries (NOTA ke alawa). Inme LS2024 ke lagbhag saare hain kyunki 2024 ke Form-20 PDFs mein party nahi hoti.", "",
          "## 4. Bye-elections jo Drive par hain hi nahi — `bye_elections_not_on_drive.csv`", "",
          f"{len(bye)} bye-elections (2017–2024). Drive par sirf 2013–2018 ke 29 summary PDFs hain; kisi bhi bye-election ka booth-wise Form-20 Drive par nahi hai.", "",
          "| Poll date | House | Constituency | AC |", "|---|---|---|---|"]
    for r in bye.itertuples():
        L.append(f"| {r.poll_date} | {r.house} | {r.constituency} | {'' if pd.isna(r.ac_no) else int(r.ac_no)} |")
    L += ["", "Ye list web search se verify ki gayi (Oct 2026): "
          "[Wikipedia: List of by-elections to the UP Legislative Assembly](https://en.wikipedia.org/wiki/List_of_by-elections_to_the_Uttar_Pradesh_Legislative_Assembly), "
          "[2024 UP by-elections](https://en.wikipedia.org/wiki/2024_Uttar_Pradesh_Legislative_Assembly_by-elections), "
          "[Hitavada (2019)](https://www.thehitavada.com/Encyc/2019/10/25/BJP-wins-17-Cong-11-Assembly-by-polls-seats.html), "
          "[Deccan Herald (2020)](https://www.deccanherald.com/india/uttar-pradesh-bypolls-bjp-retains-6-seats-sp-bags-one-914084.html), "
          "[DailyO (2022)](https://dailyo.in/amp/news/mainpuri-goes-to-sps-bahu-dimple-bjp-ends-azam-khan-era-in-rampur-but-loses-khatauli-38185), "
          "[Deccan Herald (2023)](https://www.deccanherald.com/amp/story/india%2Fup-bypolls-suar-and-chhanbey-assembly-seats-to-see-voting-on-may-10-1204726.html). "
          "Isme 2012–2016 ke kuch bye-elections chhoot sakte hain jo search mein nahi aaye.", "",
          "## Internet se khud nikalne ki koshish", "",
          "Is cloud session ki network policy ne saare source sites block ki hui hain: `ceouttarpradesh.nic.in`, "
          "`cdn.s3waas.gov.in` (district portals ki files), `results.eci.gov.in`, `eci.gov.in`, district `*.nic.in` "
          "portals, `web.archive.org`, `lokdhaba.ashoka.edu.in`. Isliye in files ko is session se download nahi kiya ja saka "
          "(koi data andaaze se nahi bhara gaya).", "",
          "**Aage kaise:**", "",
          "1. Apne computer par (jahan ye sites khulti hain): `python3 scripts/fetch_missing.py` — "
          "`DOWNLOADED_BUT_NOT_ON_DRIVE` wali files unke original URL se `raw/` mein aa jaayengi; "
          "`--retry-404` se 404 wale URLs bhi dobara try honge. Phir pipeline dobara chalayein (README dekhein).",
          "2. Ya Claude cloud environment ki Network access settings mein `ceouttarpradesh.nic.in` aur `cdn.s3waas.gov.in` "
          "allow kar dein — phir agle session mein main ye khud download karke dataset update kar sakta hoon.",
          "3. `NO_SOURCE_URL` wali 2024 ACs ke Form-20 PDFs district DEO portals par hain (jaise `varanasi.nic.in/form-20/`).", ""]
    open(f"{OUT}/README.md", "w", encoding="utf-8").write("\n".join(L))


def main():
    os.makedirs(OUT, exist_ok=True)
    q = pd.read_csv(f"{DATA}/UP_Form20_quality_report.csv")
    acn = pd.read_csv(f"{DATA}/UP_assembly_constituencies.csv").set_index("ac_no")
    status = json.load(open(STATUS)) if os.path.exists(STATUS) else []
    st = {(YEAR2E.get(s["election"]), s["ac"]): s for s in status if s["election"] in YEAR2E}
    on_drive = {e: {int(m.group(1)) for f in os.listdir(f"raw/{d}") for m in [re.match(r"AC(\d+)", f)] if m}
                for e, d in FOLDER.items() if os.path.isdir(f"raw/{d}")}
    qi = {(r.election, r.ac_no): r for r in q.itertuples()}

    # 1. AC-level: missing or not usable
    rows = []
    for e in FOLDER:
        for ac in range(1, 404):
            name = acn.ac_name.get(ac, "")
            dist = acn.district.get(ac, "") if "district" in acn else ""
            r = qi.get((e, ac))
            s = st.get((e, ac))
            url = s["url"] if s else ""
            if r is not None and r.status == "OK" and r.grade in ("A", "B"):
                continue
            if r is not None and r.status == "OK":
                cat, why = f"PARTIAL (grade {r.grade})", str(r.flags)[:300]
                todo = "Use with care; see quality flags. Re-download/re-check the source file."
            elif r is not None:
                cat = {"NO_TABLE_FOUND": "FILE_UNREADABLE", "WRONG_FILE": "WRONG_FILE_ON_DRIVE",
                       "OCR_UNRELIABLE": "SCAN_UNREADABLE", "NEEDS_OCR": "SCAN_UNREADABLE"}.get(r.status, r.status)
                why = str(r.flags)[:300]
                todo = "Get a clean digital copy (XLS / text PDF) from the source URL or district portal."
            elif ac not in on_drive.get(e, set()):
                if s and s["status"].startswith("Not on website"):
                    cat, why = "NOT_ON_CEO_WEBSITE", "CEO UP returned 404 when the Drive was built"
                    todo = "Retry the URL; else district DEO portal / ECI Form-20 archive."
                elif s:
                    cat, why = "DOWNLOADED_BUT_NOT_ON_DRIVE", f"source file existed ({s.get('bytes', 0):,} bytes) but was not uploaded to Drive"
                    todo = "Run scripts/fetch_missing.py (downloads this URL)."
                else:
                    cat, why = "NO_SOURCE_URL", "no file and no URL in the Drive's download log"
                    todo = "Find the AC's Form-20 on the district DEO portal (<district>.nic.in, 'Form-20')."
            else:
                cat, why, todo = "NOT_PARSED", "file on Drive but no parsed record", "check file"
            rows.append(dict(election=e, ac_no=ac, ac_name=name, district=dist, category=cat, detail=why,
                             source_url=url, what_to_do=todo))
    acdf = pd.DataFrame(rows)
    acdf.to_csv(f"{OUT}/missing_or_partial_ACs.csv", index=False)

    # 2. booth-number gaps inside parsed ACs
    b = pd.read_csv(f"{DATA}/UP_Form20_booths.csv.gz", usecols=["election", "ac_no", "booth_no", "is_postal"],
                    low_memory=False)
    b = b[(b.is_postal == 0) & b.booth_no.notna()]
    gaps = []
    for (e, ac), g in b.groupby(["election", "ac_no"]):
        allnums = set(int(x) for x in g.booth_no)
        # booth numbers far beyond the AC's booth count are misreads (mostly OCR), not real booths
        cap = int(1.3 * len(allnums)) + 20
        nums = {n for n in allnums if n <= cap}
        odd = sorted(allnums - nums)
        mx = max(nums) if nums else 0
        miss = sorted(set(range(1, mx + 1)) - nums)
        if miss or odd:
            gaps.append(dict(election=e, ac_no=ac, ac_name=acn.ac_name.get(ac, ""), max_booth_no=mx,
                             booths_present=len(nums), booths_missing=len(miss), missing_booth_numbers=ranges(miss),
                             suspicious_booth_numbers=", ".join(map(str, odd[:30]))))
    gdf = pd.DataFrame(gaps).sort_values(["election", "booths_missing"], ascending=[True, False])
    gdf.to_csv(f"{OUT}/booth_number_gaps.csv", index=False)

    # 3. candidates without party / name
    c = pd.read_csv(f"{DATA}/UP_Form20_candidates_ac_totals.csv")
    cm = c[(c.is_nota == 0) & (c.party.isna() | c.candidate.isna())].copy()
    cm["missing"] = cm.apply(lambda r: "+".join(k for k, v in (("party", r.party), ("name", r.candidate))
                                                if not isinstance(v, str) or not v.strip()), axis=1)
    cm[["election", "ac_no", "ac_name", "candidate_sr", "candidate", "party", "total_votes", "rank", "missing"]] \
        .to_csv(f"{OUT}/candidates_missing_party_or_name.csv", index=False)

    # 4. bye-elections not on Drive
    bye = []
    for date, house, n in BYE_NOT_ON_DRIVE:
        ac = BYE_AC.get(n) if house == "VS" else None
        bye.append(dict(poll_date=date, house="Lok Sabha" if house == "LS" else "Vidhan Sabha",
                        constituency=n, ac_no=ac if house == "VS" else None,
                        status="not on Drive (no constituency summary, no booth-wise Form-20)"))
    pd.DataFrame(bye).to_csv(f"{OUT}/bye_elections_not_on_drive.csv", index=False)

    # summary for the markdown
    summ = acdf.groupby(["election", "category"]).size().unstack(fill_value=0)
    summ.to_csv(f"{OUT}/summary_by_election.csv")
    write_md(acdf, gdf, cm, pd.DataFrame(bye), summ)
    print(summ.to_string())
    print("booth gaps:", len(gdf), "ACs,", int(gdf.booths_missing.sum()), "booth numbers")
    print("candidates missing party/name:", len(cm))
    print("bye-elections not on drive:", len(bye), "unmatched:", [x["constituency"] for x in bye if x["ac_no"] is None and x["house"] == "Vidhan Sabha"])


if __name__ == "__main__":
    main()
