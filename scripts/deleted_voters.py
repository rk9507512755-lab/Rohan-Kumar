"""Digitise a booth-wise 'deleted voters' PDF (one booth block per page run) into
row-level and booth-level tables.

usage: python3 -I deleted_voters.py IN.pdf OUT_PREFIX
writes OUT_PREFIX.xlsx (README, booth_summary, voters) and OUT_PREFIX_voters.csv.gz
"""
import re
import sys
from collections import Counter, OrderedDict

import pandas as pd
import pymupdf

ID = re.compile(r"^(?:[A-Z]{3}\d{7}|[A-Z]{2,3}/\d+/\d+/\d+|UP\d{12})$")
INT = re.compile(r"^\d{1,4}$")


def gender(s):
    # the PDF font garbles these words; male always keeps "रुष/रष", female always has "ह"
    if re.search(r"रुष|रष|ुरुष", s):
        return "M"
    if "ह" in s or re.search(r"ला|लम|िा", s):
        return "F"
    if re.search(r"तृतीय|अन्य|other", s, re.I):
        return "O"
    return ""


def reason(s):
    if re.search(r"ड\S?च?्?ल|डु|डू|लकेट|लिकेट|प्लि", s):
        return "duplicate / डुप्लीकेट"
    if re.search(r"अयो", s):
        return "ineligible / अयोग्य"
    if re.search(r"मृ|मतृ|मतृ्यु", s):
        return "dead / मृत"
    if re.search(r"ंतर|ांतर|ंिर|ांिर|ांत|नमंत|गांत|ानाि", s):
        return "transferred / स्थानांतरित"
    if re.match(r"\s*अ", s) or re.search(r"स्स्थ|पस्", s):
        return "absent / अनुपस्थित"
    return "other / अन्य"


def relation(s):
    s = s.strip()
    if re.search(r"मात|मािा", s):
        return "mother / माता"
    if re.search(r"पत्नी|ित्नी", s):
        return "wife / पत्नी"
    if re.search(r"(ता|िा)$", s):
        return "father / पिता"
    if re.search(r"(त|ति|तत|नत)$", s):
        return "husband / पति"
    return "other / अन्य"


def header(lines):
    h = {}
    for i, ln in enumerate(lines):
        m = re.match(r"बूथ\s*:\s*(\d+)\s*-\s*(.+)", ln)
        if m:
            h["booth_no"], h["booth_name_raw"] = int(m.group(1)), m.group(2).strip()
            if i + 1 < len(lines) and INT.match(lines[i + 1].strip()):
                h["male_deleted"] = int(lines[i + 1])
        m = re.match(r"शक्ति\s*केंद्र\s*:\s*(.+)", ln)
        if m:
            h["shakti_kendra"] = m.group(1).strip()
        m = re.search(r"सभा\s*:\s*(\d+)\s*-\s*([^|]+)", ln)
        if m:
            h["ac_no"], h["ac_name_raw"] = int(m.group(1)), m.group(2).strip()
        m = re.search(r"लि\s*ा\s*:\s*(.+)|ल[जि]\s*ा\s*:\s*(.+)", ln)
        if m and "सभा" in ln:
            h["district_raw"] = (m.group(1) or m.group(2)).strip()
        m = re.match(r"म\S*ड\S*\s*:\s*(.+)", ln)
        if m:
            h["mandal_raw"] = m.group(1).strip()
        m = re.search(r"मतदाता\s*:\s*(\d+)", ln)
        if m and ln.startswith("कु"):
            h["total_deleted"] = int(m.group(1))
    if lines and INT.match(lines[0].strip()):
        h["female_deleted"] = int(lines[0])
    return h


MANDAL = {"बल या नगि": "Ballia Nagar / बलिया नगर", "बल र्ा नगि": "Ballia Nagar / बलिया नगर", "दुभड़": "Dubhad / दुभड़",
          "दुभड": "Dubhad / दुभड़", "हनुमानगिंि": "Hanumanganj / हनुमानगंज", "हनुमानगिंज": "Hanumanganj / हनुमानगंज",
          "छाता": "Chhata / छाता"}


def rows_of(lines):
    """Rows anchored on the voter-ID line: sr, name, relative, relation | ID | gender, reason."""
    out = []
    idx = [i for i, ln in enumerate(lines) if ID.match(ln.strip())]
    for k, i in enumerate(idx):
        j = i - 1
        back = []
        while j >= 0 and not INT.match(lines[j].strip()) and len(back) < 6:
            back.insert(0, lines[j].strip())
            j -= 1
        sr = int(lines[j]) if j >= 0 and INT.match(lines[j].strip()) else None
        rel = back[-1] if back else ""
        names = back[:-1]
        name = names[0] if names else ""
        relative = " ".join(names[1:]) if len(names) > 1 else ""
        g = lines[i + 1].strip() if i + 1 < len(lines) else ""
        rs = lines[i + 2].strip() if i + 2 < len(lines) else ""
        out.append(dict(sr=sr, name_raw=name, relative_raw=relative, relation_raw=rel, relation=relation(rel),
                        voter_id=lines[i].strip(), gender_raw=g, gender=gender(g), reason_raw=rs, reason=reason(rs)))
    return out


def main():
    src, prefix = sys.argv[1], sys.argv[2]
    doc = pymupdf.open(src)
    booths = OrderedDict()
    voters = []
    for pno, page in enumerate(doc, 1):
        lines = [ln for ln in page.get_text().splitlines() if ln.strip()]
        h = header(lines)
        b = h.get("booth_no")
        if b not in booths:
            booths[b] = dict(h, first_page=pno, last_page=pno)
        else:
            booths[b]["last_page"] = pno
        for r in rows_of(lines):
            voters.append(dict(ac_no=h.get("ac_no"), booth_no=b, page=pno, **r))
    v = pd.DataFrame(voters).drop_duplicates(subset=["booth_no", "sr", "voter_id"])
    bs = pd.DataFrame(booths.values())
    bs["mandal"] = bs.mandal_raw.map(MANDAL).fillna(bs.mandal_raw)
    v = v.merge(bs[["booth_no", "booth_name_raw", "shakti_kendra", "mandal"]], on="booth_no", how="left")
    cnt = v.groupby("booth_no").agg(rows_found=("voter_id", "size"), male_found=("gender", lambda s: (s == "M").sum()),
                                    female_found=("gender", lambda s: (s == "F").sum()))
    rc = v.pivot_table(index="booth_no", columns="reason", values="voter_id", aggfunc="size", fill_value=0)
    bs = bs.merge(cnt, on="booth_no", how="left").merge(rc, on="booth_no", how="left")
    bs["check"] = (bs.rows_found == bs.total_deleted).map({True: "OK", False: "MISMATCH"})
    bs["max_sr_found"] = bs.booth_no.map(v.groupby("booth_no").sr.max())
    cols = ["ac_no", "booth_no", "booth_name_raw", "shakti_kendra", "mandal", "total_deleted", "male_deleted", "female_deleted",
            "rows_found", "male_found", "female_found", "max_sr_found", "check"] + list(rc.columns) + ["first_page", "last_page"]
    bs = bs[[c for c in cols if c in bs.columns]].sort_values("booth_no")
    vcols = ["ac_no", "booth_no", "booth_name_raw", "shakti_kendra", "mandal", "sr", "name_raw", "relative_raw", "relation",
             "voter_id", "gender", "reason", "relation_raw", "gender_raw", "reason_raw", "page"]
    v = v[vcols].sort_values(["booth_no", "sr"])
    tot = dict(booths=len(bs), stated=int(bs.total_deleted.sum()), found=len(v), ok=int((bs.check == "OK").sum()))
    readme = pd.DataFrame({"README": [
        "AC 361 Ballia Nagar — deleted voters list (booth-wise), digitised from the 4,897-page PDF shared on Google Drive.",
        f"Booths: {tot['booths']}; deleted voters stated in booth headers: {tot['stated']}; rows extracted: {tot['found']}; booths where rows = stated total: {tot['ok']}.",
        "booth_summary: one row per booth — stated totals (male/female/total from the page header) vs rows found, reasons.",
        "voters: one row per deleted voter. *_raw columns keep the PDF text as is; the PDF font is partly broken, so some Hindi names show wrong letters (e.g. 'िुरुष' for 'पुरुष'). voter_id, booth_no, gender and reason are reliable.",
        "Private data (names, voter IDs). Do not publish.",
    ]})
    with pd.ExcelWriter(prefix + ".xlsx") as xw:
        readme.to_excel(xw, sheet_name="README", index=False)
        bs.to_excel(xw, sheet_name="booth_summary", index=False)
        v.to_excel(xw, sheet_name="voters", index=False)
    v.to_csv(prefix + "_voters.csv.gz", index=False)
    bs.to_csv(prefix + "_booth_summary.csv", index=False)
    print(tot)
    print(v.reason.value_counts().to_string())
    print(v.gender.value_counts().to_string())
    print(bs[bs.check != "OK"][["booth_no", "total_deleted", "rows_found"]].head(20).to_string())


if __name__ == "__main__":
    main()
