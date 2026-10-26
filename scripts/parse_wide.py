"""Parser for the standard Form-20 layout: one row per polling station,
one column block (S.No | Party | Votes) per candidate."""
import re
from statistics import median

VOTE_KW = re.compile(r"sec[uo]|votes? ?polled|प्राप्त|मत ?संख्या|प्राप्त ?मत|votes? ?obtain|votes$|^मत$|vote secu", re.I)
_NB = r"(?<![\u0900-\u097F])"
_NA = r"(?![\u0900-\u097F])"
TOTAL_KW = re.compile(r"total|" + _NB + r"(?:योग|कुल)" + _NA + r"|कुल योग|कुल मत", re.I)
NOTA_KW = re.compile(r"\bnota\b|none ?of ?the|उपरोक्त|नोटा|इनमें से कोई नहीं", re.I)
REJ_KW = re.compile(r"reject|निरस्त|अस्वीकृत|invalid", re.I)
TEND_KW = re.compile(r"\btender|निविदत्त|टेण्डर|टेंडर", re.I)
POSTAL_KW = re.compile(r"postal|डाक|पोस्टल|etpb", re.I)
HDR_JUNK = re.compile(r"^\W*(s\.?\s*n[o0]?\.?|so\.?\s*no\.?|sl\.?\s*n[o0]\.?|si\.?\s*no\.?|sr\.?\s*no\.?|srno|serial\b.*|क्र[0०.]?\s*सं.*|क्रम\b.*|party\b.*|पार्टि\s.*|पार्टी\s.*|दल\b.*|votes?\b.*|voters?\s+sec.*|name\b.*|.*\baffil.*|.*फीलि.*|.*संबद्ध.*|प्राप्त\s.*|मत\s.*|मत)\W*(\s*[-.:]?\s*\d+\.?)?\W*$", re.I)

NUM_RE = re.compile(r"^-?\d+(\.0+)?$")
BOOTH_RE = re.compile(r"^(\d{1,4})(?:\.0)?\s*[-/ ]?\s*([A-Za-zऀ-ॿ]{1,3}\d?|\(\w{1,3}\)|/\d{1,2})?$")


def to_int(s):
    if s is None:
        return None
    s = str(s).replace(",", "").strip()
    if not s or s in ("-", "--", "—"):
        return None
    if NUM_RE.match(s):
        return int(float(s))
    try:
        f = float(s)
        if f.is_integer():
            return int(f)
    except ValueError:
        pass
    return None


def is_num(s):
    return to_int(s) is not None


def booth_token(s):
    s = (s or "").strip()
    m = BOOTH_RE.match(s)
    if not m:
        return None
    num = int(m.group(1))
    suf = (m.group(2) or "").strip("()/ ")
    if num == 0:
        return None
    return num, suf


def _numbering_row(row):
    nums = [to_int(x) for x in row if x != ""]
    nums = [n for n in nums if n is not None]
    if len(nums) < 6:
        return False
    inc = sum(1 for a, b in zip(nums, nums[1:]) if b == a + 1)
    return inc >= 0.7 * (len(nums) - 1) and nums[0] <= 2


def is_vote_hdr(x):
    return bool(x and VOTE_KW.search(x) and not TOTAL_KW.search(x) and not REJ_KW.search(x)
                and not TEND_KW.search(x) and not POSTAL_KW.search(x))


CAND_PREFIX = re.compile(r"^(candidate'?s?\s*name|name\s*of\s*(the\s*)?candidate|अभ्यर्थी\s*का\s*नाम|प्रत्याशी\s*का\s*नाम)\s*[-:.]?\s*", re.I)


def clean_name(x):
    x = (x or "").strip()
    x = CAND_PREFIX.sub("", x)
    x = re.sub(r"^\(?\s*\d{1,2}\s*[).:&-]\s*", "", x)       # (1) / 1. / 1- / 1&
    x = re.sub(r"^\d{1,2}\s+(?=\D)", "", x)
    x = re.sub(r"\s+\d{1,2}$", "", x)                          # trailing serial
    x = re.sub(r"^(shri|sri|smt|श्री|श्रीमती)\.?\s+", "", x, flags=re.I)
    return x.strip(" -:.,")


def find_sub_row(rows, limit=40):
    best, best_n = None, 1
    for r in range(min(limit, len(rows))):
        n = sum(1 for x in rows[r] if is_vote_hdr(x))
        if n > best_n:
            best, best_n = r, n
    return best


def parse_wide(sheet):
    rows = sheet.rows
    warn = []
    sub = find_sub_row(rows)
    if sub is None:
        return None
    ncols = sheet.ncols
    vote_cols = [c for c, x in enumerate(rows[sub]) if is_vote_hdr(x)]
    # header top: look upward for the row with 'polling' / 'elector'
    top = max(0, sub - 3)
    for r in range(sub, max(-1, sub - 6), -1):
        t = " ".join(rows[r]).lower()
        if "polling" in t or "elector" in t or "मतदेय" in t or "निर्वाचक" in t:
            top = r
            break
    hdr_rows = list(range(top, sub + 1))

    widths = [b - a for a, b in zip(vote_cols, vote_cols[1:])]
    w = int(median(widths)) if widths else 3
    w = max(1, min(w, 4))

    def col_header(c, rows_=hdr_rows):
        return " ".join(rows[r][c] for r in rows_ if rows[r][c]).strip()

    # data region
    first_data = sub + 1
    while first_data < len(rows) and (_numbering_row(rows[first_data]) or not any(rows[first_data])):
        first_data += 1
    data_rows = list(range(first_data, len(rows)))
    first_vote = vote_cols[0]

    # booth column: among early columns, the one with most distinct booth tokens
    best_c, best_score = None, 0
    for c in range(0, max(1, min(first_vote - w, 6))):
        toks = [booth_token(rows[r][c]) for r in data_rows]
        toks = [t for t in toks if t]
        distinct = len(set(toks))
        if distinct > best_score:
            best_c, best_score = c, distinct
    if best_c is None or best_score < 3:
        return None
    bc = best_c
    # optional suffix column right after booth column
    suf_c = None
    if bc + 1 < first_vote:
        vals = [rows[r][bc + 1] for r in data_rows if booth_token(rows[r][bc])]
        nonempty = [v for v in vals if v]
        if vals and nonempty and len(nonempty) < 0.6 * len(vals) and all(len(v) <= 3 and not is_num(v) for v in nonempty):
            suf_c = bc + 1
    # polling station name column: first mostly-text column after booth/suffix
    name_c = None
    for c in range((suf_c or bc) + 1, first_vote):
        vals = [rows[r][c] for r in data_rows[:200] if booth_token(rows[r][bc])]
        txt = [v for v in vals if v and not is_num(v)]
        if vals and len(txt) >= 0.5 * len(vals):
            name_c = c
            break

    # candidates
    cands = []
    prev = None
    for i, v in enumerate(vote_cols):
        b0 = (prev + 1) if prev is not None else v - w + 1
        block = list(range(b0, v + 1))
        name = ""
        for r in range(sub - 1, max(-1, min(top, sub - 1) - 3), -1):
            for c in block:
                x = rows[r][c]
                if x and not HDR_JUNK.match(x) and not VOTE_KW.search(x):
                    name = x
                    break
            if name:
                break
        hdr_party = ""
        for c in block[:-1]:
            x = rows[sub][c]
            if x and not HDR_JUNK.match(x) and not VOTE_KW.search(x) and not is_num(x):
                hdr_party = x
        if not name:
            name = hdr_party
            hdr_party = ""
        party_cols = [c for c in block[:-1]]
        name = clean_name(name)
        cands.append(dict(name=name, hdr_party=hdr_party, vote_col=v, party_cols=party_cols))
        prev = v
    last_vote = vote_cols[-1]

    # post-candidate columns
    post = {}
    for c in range(last_vote + 1, ncols):
        h = col_header(c, list(range(max(0, top - 1), sub + 1)))
        if not h:
            continue
        if NOTA_KW.search(h) and "nota" not in post:
            post["nota"] = c
        elif REJ_KW.search(h):
            post.setdefault("rejected", c)
        elif TEND_KW.search(h):
            post.setdefault("tendered", c)
        elif TOTAL_KW.search(h):
            post.setdefault("total", c)
    if "nota" in post:
        c0 = post.pop("nota")
        stop = min([c for c in post.values() if c > c0] + [c0 + 4, ncols])
        best_c, best_m = c0, None
        for c in range(c0, stop):
            if TOTAL_KW.search(col_header(c, list(range(max(0, top - 1), sub + 1)))):
                continue
            vals = [to_int(rows[r][c]) for r in data_rows[:300]]
            vals = [v for v in vals if v is not None]
            if len(vals) < 0.5 * max(1, min(300, len(data_rows))) or len(set(vals)) < 2:
                continue
            m = sum(vals) / len(vals)
            if best_m is None or m < best_m:
                best_c, best_m = c, m
        cands.append(dict(name="NOTA", hdr_party="", vote_col=best_c, party_cols=[]))

    # pre-candidate columns
    pre = {}
    group = ""
    for c in range(0, first_vote - w + 1):
        if c in (bc, suf_c, name_c):
            continue
        top_txt = " ".join(rows[r][c] for r in hdr_rows[:-1] if rows[r][c])
        own = rows[sub][c]
        if top_txt:
            group = top_txt
        h = (top_txt + " " + own).lower()
        g = (group + " " + own).lower()
        if "elector" in h or "निर्वाचक" in h or "मतदाताओं की कुल" in h:
            pre.setdefault("electors", c)
        elif TEND_KW.search(h):
            pre.setdefault("tendered", c)
        elif REJ_KW.search(h):
            pre.setdefault("rejected", c)
        elif re.search(r"\bfemale|महिला|स्त्री", own.lower()):
            pre.setdefault("voters_female", c)
        elif re.search(r"\bmale|पुरुष", own.lower()):
            pre.setdefault("voters_male", c)
        elif re.search(r"other|third|tg|अन्य", own.lower()):
            pre.setdefault("voters_other", c)
        elif TOTAL_KW.search(own) and ("turnout" in g or "voter" in g or "मतदान" in g):
            pre.setdefault("voters_total", c)
    if "tendered" in post:
        pre.setdefault("tendered", post["tendered"])

    # first data row parties
    party_seen = {}
    booths, totals = [], []
    seen_booth = False
    for r in data_rows:
        row = rows[r]
        if not any(row):
            continue
        votes = [to_int(row[cd["vote_col"]]) for cd in cands]
        nnum = sum(1 for x in votes if x is not None)
        label = " ".join(row[c] for c in range(0, min(first_vote - w + 1, ncols)) if row[c] and not is_num(row[c]))
        tok = booth_token(row[bc])
        if tok and suf_c is not None and row[suf_c]:
            tok = (tok[0], row[suf_c].strip())
        is_postal = bool(POSTAL_KW.search(label))
        if not tok and not is_postal:
            if TOTAL_KW.search(label) or (nnum >= 0.6 * len(cands) and seen_booth):
                if nnum >= 0.5 * len(cands):
                    totals.append(dict(row=r, label=label[:60], votes=votes,
                                       total=to_int(row[post["total"]]) if "total" in post else None))
            continue
        if nnum < 0.5 * len(cands):
            # repeated header line or blank page footer
            continue
        if _numbering_row(row):
            continue
        seen_booth = True
        for i, cd in enumerate(cands):
            for pc in cd["party_cols"]:
                x = row[pc]
                if x and not is_num(x) and i not in party_seen:
                    party_seen[i] = x
        b = dict(
            booth_no=tok[0] if tok else None,
            booth_suffix=tok[1] if tok else "",
            is_postal=is_postal and not tok,
            booth_name=row[name_c] if name_c is not None else "",
            votes=votes,
            src_row=r,
        )
        for k, c in list(pre.items()) + [(k, c) for k, c in post.items() if k != "tendered"]:
            b[k] = to_int(row[c])
        booths.append(b)
    if not booths:
        return None
    for i, cd in enumerate(cands):
        cd["party"] = cd["hdr_party"] or party_seen.get(i) or ""
        if cd["name"] == "NOTA" or NOTA_KW.search(cd["name"] or "") or NOTA_KW.search(cd["party"] or ""):
            cd["name"], cd["party"], cd["is_nota"] = "NOTA", "NOTA", True
        else:
            cd["is_nota"] = False
    return dict(layout="wide", candidates=cands, booths=booths, totals=totals,
                pre=pre, post=post, booth_col=bc, warnings=warn, sub_row=sub)
