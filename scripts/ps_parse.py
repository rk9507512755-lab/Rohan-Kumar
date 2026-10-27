"""Parse polling-station-list PDFs (ruled tables) into rows:
ac_no, ps_no, location, building, area, voters_for, electors, group (tehsil/zone label), page.

Words are read once per page and assigned to table cells by position; Kruti Dev
text is converted to Unicode and broken-font Unicode gets the i-matra / reph
order fixed. Column roles are inferred from the cell values (not the headers,
which differ district to district).
"""
import json
import re
import sys
from collections import Counter

import pymupdf

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from krutidev import kd2uni  # noqa: E402
from loader import kd_score  # noqa: E402

DEV = re.compile(r"[ऀ-ॿ]")
CONS = "क-हक़-य़"
ENGLISH = re.compile(r"\b(school|primary|junior|inter|college|room|govt|government|building|ward|part|all|voters|"
                     r"men|women|only|polling|station|vidyalaya|madhyamik|the|of|and|road|nagar|km|yes|no|sq)\b", re.I)


def fix_uni(s):
    # pre-base i-matra written before its consonant (visual order) -> logical order
    s = re.sub(rf"ि([{CONS}](?:्[{CONS}])*)", r"\1" + "ि", s)
    # reph glyphs left after the consonant: ª / ê  -> र् before that consonant
    s = re.sub(rf"([{CONS}])([ा-ौ]?)[ªê]", "र्\\1\\2", s)
    s = re.sub(r"\s+([ा-्ंँ])", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()


def is_kd_doc(doc):
    lines = [ln for p in list(doc)[:3] for ln in p.get_text("text").splitlines()
             if re.search("[a-z]", ln) and not DEV.search(ln) and len(ln.strip()) > 3]
    return bool(lines) and sum(kd_score(ln) > 0.5 for ln in lines) >= 0.3 * len(lines)


def conv(s, kd_doc=False):
    if not s:
        return ""
    s = re.sub(r"\s*\n\s*", " ", s).strip()
    if DEV.search(s):
        return fix_uni(s)
    if kd_score(s) > 0.5 or (kd_doc and re.search("[a-z]", s) and not ENGLISH.search(s)):
        return re.sub(r"\s+", " ", kd2uni(s)).strip()
    return s


def cell_words(words, bbox):
    x0, y0, x1, y1 = bbox
    inside = [w for w in words if x0 - 1 <= (w[0] + w[2]) / 2 <= x1 + 1 and y0 - 1 <= (w[1] + w[3]) / 2 <= y1 + 1]
    inside.sort(key=lambda w: (round(w[1] / 4), w[0]))
    return " ".join(w[4] for w in inside)


# ---- value-based column roles -------------------------------------------
PAT = {
    "voters_for": re.compile(r"सभी|समस्त|सबके|पुरु?ू?ष|महिला|\ball\b|\bmale\b|female|general", re.I),
    "yes_no": re.compile(r"^(हा[ँं]?|हां|नहीं|yes|no|हॉ)\.?$", re.I),
    "distance": re.compile(r"कि\.?0?\s*मी|किमी|किलो|\bkm\b", re.I),
    "room": re.compile(r"वर्ग|sq\.?|स्क्वायर", re.I),
}


def infer_roles(table_rows, ncol):
    """table_rows: list of cell-value lists (data rows only)."""
    roles = [None] * ncol
    col = lambda i: [r[i] for r in table_rows if i < len(r) and r[i]]  # noqa: E731
    for i in range(ncol):
        v = col(i)
        if not v:
            continue
        frac = lambda p: sum(bool(p.search(x)) for x in v) / len(v)  # noqa: E731
        ints = [int(x) for x in v if re.fullmatch(r"\d{1,4}", x)]
        if frac(PAT["voters_for"]) > 0.6 and "voters_for" not in roles:
            roles[i] = "voters_for"
        elif frac(PAT["yes_no"]) > 0.6:
            roles[i] = "yes_no"
        elif frac(PAT["distance"]) > 0.5:
            roles[i] = "distance"
        elif frac(PAT["room"]) > 0.5:
            roles[i] = "room_size"
        elif len(ints) > 0.7 * len(v):
            inc = sum(b == a + 1 for a, b in zip(ints, ints[1:]))
            if i == 0 or (inc > 0.6 * len(ints) and "ps_no" not in roles):
                roles[i] = "ps_no" if "ps_no" not in roles else "num"
            elif "electors" not in roles and sorted(ints)[len(ints) // 2] >= 50:
                roles[i] = "electors"
            else:
                roles[i] = "num"
    text_cols = [i for i in range(ncol) if roles[i] is None and col(i)]
    for i, name in zip(text_cols, ["location", "building", "area", "remarks"]):
        roles[i] = name
    if len(text_cols) == 2:  # building + area only
        roles[text_cols[0]], roles[text_cols[1]] = "building", "area"
    return roles


AC_RE = re.compile(r"(\d{1,3})\s*[-–&—:.]?\s*([^\d\s,()]{2,}(?:\s*\(\s*(?:अ0?\s*जा0?|एस0?\s*सी0?|SC|ST)\s*\))?)\s*"
                   r"(?:विधान\s*सभा|विधानसभा|Assembly|A\.?\s*C\.?\b)", re.I)
AC_RE2 = re.compile(r"(?:विधान\s*सभा|विधानसभा|Assembly\s*Constituency|A\.?\s*C\.?)\s*(?:निर्वाचन\s*क्षेत्र|क्षेत्र|No\.?|संख्या)?"
                    r"\s*\)?\s*(?:सं0|संख्या|no\.?)?\s*[-–&—:.]?\s*(\d{1,3})\b", re.I)
GROUP_RE = re.compile(r"तहसील|ब्लाक|ब्लॉक|विकास\s*खण्ड|विकासखण्ड|नगर\s*(?:पालिका|पंचायत|निगम)|सेक्टर|जोन|Tehsil|Block|Zone|Ward", re.I)


def page_ac(text):
    head = text
    for rx in (AC_RE, AC_RE2):
        m = rx.search(head)
        if m and 1 <= int(m.group(1)) <= 403:
            return int(m.group(1))
    return None


def parse(path):
    doc = pymupdf.open(path)
    if sum(len(p.get_text("text").strip()) for p in doc) < 200 * max(1, min(doc.page_count, 3)) * 0.1:
        return dict(status="SCANNED", rows=[], pages=doc.page_count)
    kd_doc = is_kd_doc(doc)
    raw_rows = []
    acs = Counter()
    group = None
    for pno, page in enumerate(doc):
        words = page.get_text("words")
        if not words:
            continue
        cand = [ln for ln in page.get_text("text").splitlines()
                if re.search(r"\d", ln) and re.search(r"fo/kku|fo/kkulHkk|विधान|Assembly|A\.?\s*C\b", ln, re.I)]
        ac = page_ac("\n".join(conv(ln, kd_doc) for ln in cand[:6]))
        if ac:
            acs[ac] += 1
        tables = page.find_tables().tables
        if not tables or sum(len(t.rows) for t in tables) < 3:
            tables = page.find_tables(strategy="lines_strict").tables
        for t in tables:
            for r in t.rows:
                cells = [conv(cell_words(words, c), kd_doc) if c else None for c in r.cells]
                vals = [c for c in cells if c]
                if not vals:
                    continue
                if len(vals) == 1 and not re.fullmatch(r"\d+", vals[0]):
                    if len(vals[0]) < 80 and GROUP_RE.search(vals[0]):
                        group = vals[0].strip(" -–&")
                    continue
                if all(re.fullmatch(r"\d{1,2}", v) for v in vals) and len(vals) >= 3:
                    continue  # column-number row
                raw_rows.append(dict(cells=[c or "" for c in cells], page=pno + 1, group=group, ac=ac))
    if not raw_rows:
        return dict(status="NO_TABLE", rows=[], pages=doc.page_count, ac_no=acs.most_common(1)[0][0] if acs else None)
    # data rows: the most common column count among rows with a numeric cell
    ncol = Counter(len(r["cells"]) for r in raw_rows if any(re.fullmatch(r"\d+", c) for c in r["cells"])).most_common(1)
    ncol = ncol[0][0] if ncol else Counter(len(r["cells"]) for r in raw_rows).most_common(1)[0][0]
    data = [r for r in raw_rows if len(r["cells"]) == ncol and not re.search(
        r"मतदेय\s*स्थल\s*(?:की|का)\s*(?:संख्या|स्थिति|नाम)|Polling\s*Station\s*(?:No|Name)|भवन\s*जिसमें|Building\s*in\s*which",
        " ".join(r["cells"]), re.I)]
    roles = infer_roles([r["cells"] for r in data], ncol)
    rows = []
    for r in data:
        rec = dict(page=r["page"], group=r["group"], ac_page=r["ac"])
        for role, v in zip(roles, r["cells"]):
            if role and role not in rec:
                rec[role] = v
        if "ps_no" in rec:
            m = re.match(r"\d+", rec["ps_no"])
            rec["ps_no"] = int(m.group()) if m else None
        if rec.get("electors"):
            m = re.match(r"\d+", rec["electors"])
            rec["electors"] = int(m.group()) if m else None
        if rec.get("ps_no") is None and "ps_no" in roles:
            continue
        rows.append(rec)
    if rows and "ps_no" not in roles:
        for i, rec in enumerate(rows, 1):
            rec["ps_no"], rec["ps_no_inferred"] = i, True
    return dict(status="OK" if rows else "NO_TABLE", ac_no=acs.most_common(1)[0][0] if acs else None,
                ac_counts=dict(acs), roles=roles, rows=rows, pages=doc.page_count, kruti=kd_doc)


if __name__ == "__main__":
    out = parse(sys.argv[1])
    print(json.dumps(dict(out, rows=out["rows"][:4]), ensure_ascii=False, indent=1))
    print(len(out["rows"]), "rows")
