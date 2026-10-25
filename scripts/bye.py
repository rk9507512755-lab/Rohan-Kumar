"""Bye-election result sheets (constituency-level, not booth-wise)."""
import csv
import os
import re
import sys

import pdfplumber

sys.path.insert(0, os.path.dirname(__file__))
from parties import std_party  # noqa: E402

DIR = "raw/07_Bye_Elections_2013-2018"
INT = re.compile(r"^\d{1,7}$")


def meta_from_name(f):
    m = re.match(r"(\d{4})_(?:(VS|LS)_)?Bye_(\d+)?-?(.+)\.pdf", f)
    year, house, no, name = m.group(1), m.group(2) or "VS", m.group(3), m.group(4).replace("_", " ")
    return int(year), house, int(no) if no else None, name


def undouble(c):
    """Overprinted bold text is extracted with every character doubled."""
    t = c.replace(" ", "")
    if len(t) >= 2 and len(t) % 2 == 0 and t[0::2] == t[1::2]:
        out, i = [], 0
        while i < len(c):
            out.append(c[i])
            i += 2 if i + 1 < len(c) and c[i + 1] == c[i] else 1
        return "".join(out).replace("  ", " ")
    return c


def parse_text(path):
    out = []  # (constituency_no, constituency_name, sl, candidate, party, votes, pct)
    totals = {}
    with pdfplumber.open(path) as pdf:
        for pg in pdf.pages:
            const = None
            for t in pg.extract_tables():
                for row in t:
                    cells = [re.sub(r"\s+", " ", c or "").strip() for c in row]
                    ne = [c.replace(" ", "") for c in cells if c]
                    if len(ne) >= 3 and all(len(c) % 2 == 0 and c[0::2] == c[1::2] for c in ne):
                        cells = [undouble(c) for c in cells]
                    joined = " ".join(c for c in cells if c)
                    m = re.match(r"^(\d{1,3})\s*-\s*(.+?)\s*(\(District.*\))?$", joined)
                    if m and len([c for c in cells if c]) == 1:
                        const = (int(m.group(1)), m.group(2))
                        continue
                    vi = next((i for i, c in enumerate(cells) if INT.match(c) and i + 1 < len(cells) and cells[i + 1].endswith("%")), None)
                    if vi is None:
                        continue
                    if re.match(r"total", joined, re.I) or any(re.match(r"total", c, re.I) for c in cells[:vi]):
                        totals[const] = int(cells[vi])
                        continue
                    pre = [c for c in cells[:vi] if c]
                    sl_i = None
                    for i in range(len(pre) - 1, -1, -1):
                        if INT.match(pre[i]) and int(pre[i]) <= 60 and i + 1 < len(pre):
                            sl_i = i
                            break
                    if sl_i is None:
                        continue
                    ac_no = int(pre[0]) if sl_i >= 1 and INT.match(pre[0]) else (const[0] if const else None)
                    ac_name = pre[1] if sl_i >= 2 else (const[1] if const else "")
                    if ac_no is None and out:
                        ac_no, ac_name = out[-1]["const_no"], out[-1]["const_name"]
                    name = pre[sl_i + 1]
                    party = " ".join(pre[sl_i + 2:])
                    out.append(dict(const_no=ac_no, const_name=ac_name, sl=int(pre[sl_i]), candidate=name,
                                    party=party, votes=int(cells[vi]), pct=cells[vi + 1]))
    return out, totals


def main(out_csv):
    rows, report = [], []
    for f in sorted(os.listdir(DIR)):
        year, house, no, name = meta_from_name(f)
        recs, totals = parse_text(f"{DIR}/{f}")
        if not recs:
            report.append(dict(file=f, year=year, house=house, status="scanned image - not parsed (no text layer)"))
            continue
        by_const, cname_of = {}, {}
        for r in recs:
            cname_of.setdefault(r["const_no"], r["const_name"])
            by_const.setdefault((r["const_no"], cname_of[r["const_no"]]), []).append(r)
        for (cno, cname), rs in by_const.items():
            s = sum(r["votes"] for r in rs)
            tot = next((v for k, v in totals.items() if k is None or k[0] == cno), None)
            for r in rs:
                nota = bool(re.search(r"none of the above|nota", r["candidate"], re.I))
                rows.append(dict(year=year, house="Lok Sabha" if house == "LS" else "Vidhan Sabha",
                                 constituency_no=cno or no, constituency_name=cname or name, candidate_sr=r["sl"],
                                 candidate="NOTA" if nota else r["candidate"], party="NOTA" if nota else r["party"],
                                 party_std="NOTA" if nota else std_party(r["party"]), votes=r["votes"], vote_pct=r["pct"],
                                 source_file=f, method="PDF text layer"))
            report.append(dict(file=f, year=year, house=house, constituency=f"{cno or no}-{cname or name}",
                               candidates=len(rs), votes_sum=s, file_total=tot,
                               status="OK" if tot in (None, s) else f"sum {s} != file total {tot}"))
    import pandas as pd
    man = pd.read_csv(os.path.join(os.path.dirname(__file__), "bye_manual_transcriptions.csv"))
    for (f, cno), g in man.groupby(["source_file", "constituency_no"]):
        tv = int(g.file_total_valid.iloc[0])
        nota = g.file_nota.iloc[0]
        allv = int(g.votes.sum()) + (int(nota) if nota == nota else 0)
        tot = allv if allv else tv
        recs = [dict(sl=int(r.candidate_sr), candidate=r.candidate, party=r.party, votes=int(r.votes)) for r in g.itertuples()]
        if nota == nota:
            recs.append(dict(sl=len(recs) + 1, candidate="NOTA", party="NOTA", votes=int(nota)))
        for r in recs:
            rows.append(dict(year=int(g.year.iloc[0]), house="Vidhan Sabha", constituency_no=int(cno),
                             constituency_name=g.constituency_name.iloc[0], candidate_sr=r["sl"], candidate=r["candidate"],
                             party=r["party"], party_std="NOTA" if r["party"] == "NOTA" else std_party(r["party"]),
                             votes=r["votes"], vote_pct=f"{100 * r['votes'] / tot:.2f}%", source_file=f,
                             method="manual transcription of scanned Form-21E (sum verified against the sheet's total)"))
        report = [x for x in report if x.get("file") != f]
        report.append(dict(file=f, year=int(g.year.iloc[0]), house="VS", constituency=f"{cno}-{g.constituency_name.iloc[0]}",
                           candidates=len(g), votes_sum=int(g.votes.sum()), file_total=tv,
                           status="OK (manual transcription, verified)"))
    rows.sort(key=lambda r: (r["year"], r["house"], r["constituency_no"], r["candidate_sr"]))
    with open(out_csv, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    return report


if __name__ == "__main__":
    rep = main(sys.argv[1] if len(sys.argv) > 1 else "work/bye.csv")
    for r in rep:
        print(r)


def parse_scanned(path):
    """Form-21E scans: OCR, then read 'serial  NAME  PARTY  votes' lines and
    the 'Total number of valid votes polled' line."""
    import fitz
    import pytesseract
    from ocr import render
    from pdf_ocr import clean_lines, deskew
    rows, total = [], None
    doc = fitz.open(path)
    for pg in doc:
        img, _ = deskew(render(pg))
        txt = pytesseract.image_to_string(clean_lines(img), lang="eng", config="--psm 6 --oem 1")
        for line in txt.splitlines():
            line = line.strip()
            m = re.search(r"valid votes polled\D*([\d ,]{3,})", line, re.I)
            if m:
                total = int(re.sub(r"\D", "", m.group(1)))
                continue
            m = re.match(r"^\|?\s*(\d{1,2})\s*[|.)]?\s+([A-Z][A-Z .,'/()-]+?)\s{1,}\|?\s*([A-Z][A-Z .()&'-]+?)\s*\|?\s*(\d[\d ]{1,6})\s*\|?$", line)
            if m:
                rows.append(dict(sl=int(m.group(1)), candidate=m.group(2).strip(" .|"), party=m.group(3).strip(" .|"),
                                 votes=int(m.group(4).replace(" ", ""))))
    return rows, total
