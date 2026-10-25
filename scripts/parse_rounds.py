"""Parser for round-wise counting sheets (one sheet per counting round,
polling stations across columns, candidates down the rows)."""
import re

from parse_wide import NOTA_KW, REJ_KW, TOTAL_KW, TEND_KW, POSTAL_KW, booth_token, clean_name, to_int

BOOTH_ROW_KW = re.compile(r"polling|booth|मतदेय|पोलिंग|बूथ|मतदान केन्द्र|मतदान स्थल", re.I)
CAND_HDR_KW = re.compile(r"name of cand|candidate|उम्मीदवार|अभ्यर्थी|प्रत्याशी", re.I)


def parse_round_sheet(sheet):
    rows = sheet.rows
    for r in range(min(25, sheet.nrows)):
        row = rows[r]
        label = " ".join(x for x in row[:3] if x)
        if not BOOTH_ROW_KW.search(label):
            continue
        cols = {}
        for c in range(1, sheet.ncols):
            t = booth_token(row[c])
            if t:
                cols[c] = t
        if len(cols) < 2:
            continue
        # candidate rows follow
        cands, extra = [], {}
        for rr in range(r + 1, min(sheet.nrows, r + 60)):
            rw = rows[rr]
            name = ""
            for c in range(0, min(c for c in cols)):
                x = rw[c]
                if x and to_int(x) is None:
                    name = x
            vals = {c: to_int(rw[c]) for c in cols}
            nnum = sum(1 for v in vals.values() if v is not None)
            if CAND_HDR_KW.search(name) and nnum == 0:
                continue
            if not name:
                if nnum == 0:
                    continue
                name = "?"
            if REJ_KW.search(name):
                extra["rejected"] = vals
                continue
            if TEND_KW.search(name):
                extra["tendered"] = vals
                continue
            if POSTAL_KW.search(name):
                continue
            if TOTAL_KW.search(name) or re.search(r"initial|हस्ताक्षर|signature", name, re.I):
                if TOTAL_KW.search(name):
                    extra["total"] = vals
                if cands:
                    break
                continue
            if nnum == 0:
                if cands:
                    break
                continue
            cands.append((clean_name(name), vals))
        if cands:
            return dict(booth_cols=cols, cands=cands, extra=extra)
    return None


def parse_rounds(sheets):
    parts = [p for p in (parse_round_sheet(s) for s in sheets) if p]
    if not parts:
        return None
    # candidate list from the most common candidate sequence
    names = max((tuple(n for n, _ in p["cands"]) for p in parts), key=lambda t: sum(
        1 for p in parts if tuple(n for n, _ in p["cands"]) == t))
    cands = [dict(name=n, party="", is_nota=bool(NOTA_KW.search(n))) for n in names]
    for cd in cands:
        if cd["is_nota"]:
            cd["name"] = cd["party"] = "NOTA"
    booths, seen, warn = [], set(), []
    for p in parts:
        if len(p["cands"]) != len(names):
            warn.append("round sheet with different candidate count skipped")
            continue
        for c, tok in p["booth_cols"].items():
            votes = [vals.get(c) for _, vals in p["cands"]]
            if all(v is None for v in votes):
                continue
            if tok in seen:
                warn.append(f"booth {tok} repeated in rounds")
                continue
            seen.add(tok)
            b = dict(booth_no=tok[0], booth_suffix=tok[1], is_postal=False, booth_name="", votes=votes)
            for k, vals in p["extra"].items():
                b[k] = vals.get(c)
            booths.append(b)
    if not booths:
        return None
    booths.sort(key=lambda b: (b["booth_no"], b["booth_suffix"]))
    return dict(layout="rounds", candidates=cands, booths=booths, totals=[], pre={}, post={},
                warnings=sorted(set(warn)))
