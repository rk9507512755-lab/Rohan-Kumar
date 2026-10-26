"""Rebuild a Form-20 table from positioned words (PDF text layer or OCR).

words: list of (x0, y0, x1, y1, text). Rows are y-clusters, columns are
x-clusters of the numeric cells in data rows; header words above the first
data row name the columns.
"""
import re
from statistics import median

from krutidev import kd2uni
from parse_wide import _numbering_row
from parse_wide import NOTA_KW, POSTAL_KW, REJ_KW, TEND_KW, TOTAL_KW, booth_token, clean_name

VALID_KW = re.compile(r"valid|विधिमान|वैध|वैद्य", re.I)
SERIAL_KW = re.compile(r"serial|sl\.?|s\.? ?no|क्रम|polling|station|मतदेय|स्थल", re.I)
INT_RE = re.compile(r"^\d{1,6}$")


def _int(t):
    t = t.replace(",", "").replace("|", "").strip(".:;'\"")
    t = t.translate(str.maketrans("०१२३४५६७८९OoIlS", "0123456789001l5")).replace("l", "1")
    return int(t) if INT_RE.match(t) else None


def cluster_rows(words, tol):
    words = sorted(words, key=lambda w: (w[1] + w[3]) / 2)
    rows, cur, cy = [], [], None
    for w in words:
        yc = (w[1] + w[3]) / 2
        if cur and yc - cy > tol:
            rows.append(cur)
            cur = []
        cur.append(w)
        cy = median([(x[1] + x[3]) / 2 for x in cur])
    if cur:
        rows.append(cur)
    return [sorted(r, key=lambda w: w[0]) for r in rows]


def cluster_x(xs, gap):
    xs = sorted(xs)
    groups, cur = [], [xs[0]]
    for x in xs[1:]:
        if x - cur[-1] > gap:
            groups.append(cur)
            cur = []
        cur.append(x)
    groups.append(cur)
    return groups


GROUP_HDR = re.compile(r"favou?r|पक्ष|^cast$|डाले|गये|दिये|निम्नलिखित|अभ्यर्थियों|निर्वाचकों|संख्या|विधानसभा|निर्वाचन|क्षेत्र", re.I)


def drop_footer(words):
    """Remove 'Page N (of M)' tokens that share a line with table rows."""
    out, skip = [], set()
    ws = sorted(words, key=lambda w: (round(w[1]), w[0]))
    for i, w in enumerate(ws):
        if re.fullmatch(r"page\d*", w[4], re.I):
            skip.add(i)
            for j in range(i + 1, min(i + 4, len(ws))):
                if abs(ws[j][1] - w[1]) < 3 and re.fullmatch(r"\d+|of", ws[j][4], re.I):
                    skip.add(j)
                else:
                    break
    return [w for i, w in enumerate(ws) if i not in skip]


def words_from_fitz(page):
    """Words from character boxes, split on spaces and on wide gaps (some
    PDFs glue neighbouring header cells into one 'word')."""
    out = []
    d = page.get_text("rawdict")
    for b in d["blocks"]:
        for line in b.get("lines", []):
            for span in line["spans"]:
                size = span["size"]
                kruti = bool(re.search(r"kruti|devlys", span.get("font", ""), re.I))
                cur, box, chars = "", None, []
                last_x1 = None
                for ch in span["chars"]:
                    c = ch["c"]
                    x0, y0, x1, y1 = ch["bbox"]
                    gap = (x0 - last_x1) if last_x1 is not None else 0
                    if c.isspace() or (cur and gap > 0.3 * size):
                        if cur:
                            out.append((*box, kd2uni(cur) if kruti else cur, chars))
                        cur, box, chars = "", None, []
                        if c.isspace():
                            last_x1 = x1
                            continue
                    cur += c
                    chars.append((x0, x1, c))
                    box = [x0, y0, x1, y1] if box is None else [min(box[0], x0), min(box[1], y0), max(box[2], x1), max(box[3], y1)]
                    last_x1 = x1
                if cur:
                    out.append((*box, kd2uni(cur) if kruti else cur, chars))
    # Kruti Dev text under an unrecognisable (subset) font name
    from loader import kd_score
    alpha = [w for w in out if sum(ch.isascii() and ch.isalpha() for ch in w[4]) >= 3]
    if alpha and sum(1 for w in alpha if kd_score(w[4]) >= 0.3) >= max(5, 0.3 * len(alpha)):
        keep_en = re.compile(r"^(page|of|form|nota|total|no\.?|serial|votes?|valid|rejected|tendered|polling|station)$", re.I)

        def conv(t):
            if keep_en.match(t) or t.upper() == t or not re.search(r"[a-z]", t):
                return t
            return kd2uni(t)
        out = [(*w[:4], conv(w[4]), w[5]) for w in out]
    return out


def split_wide(w, centers):
    """Split a glued header word covering several column centres at its
    widest character gaps."""
    if len(w) < 6 or not w[5]:
        return [w]
    inside = [c for c in centers if w[0] < c < w[2]]
    k = len(inside)
    if k < 2 or (w[2] - w[0]) < 1.3 * min(b - a for a, b in zip(centers, centers[1:])):
        return [w]
    chars = w[5]
    gaps = sorted(range(1, len(chars)), key=lambda i: chars[i][0] - chars[i - 1][1], reverse=True)[:k - 1]
    cuts = sorted(gaps)
    out, start = [], 0
    for cpos in cuts + [len(chars)]:
        part = chars[start:cpos]
        if part:
            out.append((part[0][0], w[1], part[-1][1], w[3], "".join(c[2] for c in part), part))
        start = cpos
    return out


def parse_page(words, min_numeric=5):
    """Return dict(columns=[{x, header, kind}], rows=[{y, cells:{ci: text}, label}])."""
    words = drop_footer([w for w in words if w[4].strip()])
    words = [w if len(w) > 5 else (*w, None) for w in words]
    if len(words) < 20:
        return None
    hs = [w[3] - w[1] for w in words if _int(w[4]) is not None]
    if not hs:
        return None
    h = median(hs)
    rows = cluster_rows(words, tol=0.55 * h)
    data = []
    for r in rows:
        nums = [w for w in r if _int(w[4]) is not None]
        if len(nums) >= min_numeric and _int(r[0][4]) is not None:
            data.append(r)
    if len(data) < 2:
        return None
    centers = [(w[0] + w[2]) / 2 for r in data for w in r if _int(w[4]) is not None]
    groups = cluster_x(centers, gap=max(1.2 * h, 4))
    groups = [g for g in groups if len(g) >= max(2, 0.15 * len(data))]
    cols = [dict(x=median(g), lo=min(g), hi=max(g), header=[], kind="") for g in groups]
    if len(cols) < 4:
        return None

    def col_of_hdr(xc):
        i = min(range(len(cols)), key=lambda k: abs(cols[k]["x"] - xc))
        nb = [abs(cols[j]["x"] - cols[i]["x"]) for j in (i - 1, i + 1) if 0 <= j < len(cols)]
        return i if abs(cols[i]["x"] - xc) <= 0.6 * min(nb) else None

    def col_of(xc):
        best, bd = None, None
        for i, c in enumerate(cols):
            d = 0 if c["lo"] - 0.6 * h <= xc <= c["hi"] + 0.6 * h else min(abs(xc - c["lo"]), abs(xc - c["hi"]))
            if bd is None or d < bd:
                best, bd = i, d
        return best if bd is not None and bd <= 1.5 * h else None

    # header: words above the first data row, starting at the first line touching col 0
    y_first = min((w[1] for w in data[0]))
    above = [w for w in words if w[3] <= y_first + 0.2 * h]
    c0 = cols[0]
    tops = [w[1] for w in above if w[0] <= c0["hi"] + 2 * h and SERIAL_KW.search(w[4])]
    y_top = min(tops) - 0.5 * h if tops else y_first - 12 * h
    spacing = median([b["x"] - a["x"] for a, b in zip(cols, cols[1:])])
    centers_x = [c["x"] for c in cols]
    hdr_words = [p for w in above if w[1] >= y_top for p in split_wide(w, centers_x)]
    drop = set()
    for line in cluster_rows(hdr_words, tol=0.5 * h):
        idx = [i for i, w in enumerate(line) if GROUP_HDR.search(w[4])]
        if not idx:
            continue
        lo, hi = min(idx), max(idx)
        while lo > 0 and line[lo][0] - line[lo - 1][2] < 1.2 * h:
            lo -= 1
        while hi + 1 < len(line) and line[hi + 1][0] - line[hi][2] < 1.2 * h:
            hi += 1
        drop.update(id(w) for w in line[lo:hi + 1])
    for w in sorted(hdr_words, key=lambda w: (w[1], w[0])):
        if id(w) in drop:
            continue
        if w[2] - w[0] > 3 * spacing:
            continue
        ci = col_of_hdr((w[0] + w[2]) / 2)
        if ci is not None:
            cols[ci]["header"].append(w[4])
    for c in cols:
        c["header"] = " ".join(c["header"])

    out_rows = []
    data_ids = {id(r) for r in data}
    started = False
    for r in rows:
        if id(r) in data_ids:
            started = True
        if not started:
            continue
        cells, label = {}, []
        for w in r:
            ci = col_of((w[0] + w[2]) / 2)
            v = _int(w[4])
            if v is None and ci is not None and ci > 1:
                label.append(w[4])
                continue
            if ci is None:
                label.append(w[4])
                continue
            cells[ci] = (cells[ci] + w[4]) if ci in cells else w[4]
        out_rows.append(dict(y=r[0][1], cells=cells, label=" ".join(label), is_data=id(r) in data_ids))
    return dict(columns=cols, rows=out_rows, h=h)


def classify(cols):
    """Assign kinds to columns: serial, ps, cand, total_valid, rejected, nota_post, total, tendered."""
    n = len(cols)
    kinds = [""] * n
    kinds[0] = "serial"
    post_start = n
    for i, c in enumerate(cols):
        t = c["header"]
        if i <= 1:
            continue
        if VALID_KW.search(t) and (TOTAL_KW.search(t) or "valid" in t.lower() or "विधिमान" in t):
            kinds[i] = "total_valid"
            post_start = min(post_start, i)
        elif REJ_KW.search(t):
            kinds[i] = "rejected"
            post_start = min(post_start, i)
        elif TEND_KW.search(t):
            kinds[i] = "tendered"
            post_start = min(post_start, i)
        elif TOTAL_KW.search(t) and i > n / 2:
            kinds[i] = "total"
            post_start = min(post_start, i)
    for i in range(post_start, n):
        if not kinds[i] and NOTA_KW.search(cols[i]["header"]):
            kinds[i] = "nota_post"
    return kinds, post_start


def header_rate(use, kinds, first_cand, post_start, ncols):
    """Share of data rows where the header-derived candidate columns add up to
    the header-derived 'total valid' column (with or without a NOTA column)."""
    tv = kinds.index("total_valid")
    cand = [i for i in range(first_cand, post_start) if not kinds[i]]
    ok = n = 0
    for p in use:
        for r in p["rows"]:
            if not r["is_data"]:
                continue
            n += 1
            c = [_int(r["cells"].get(i, "") or "x") for i in range(ncols)]
            vals = [c[i] for i in cand]
            if c[tv] is None or None in vals:
                continue
            if sum(vals) == c[tv] or (len(vals) > 2 and sum(vals[:-1]) == c[tv]):
                ok += 1
    return ok / n if n else 0.0


def infer_by_arithmetic(use, ncols, first_cand):
    """Find the 'total valid' / 'total' columns from row arithmetic when the
    header could not be read. Returns (kinds, nota_inside_col) or None."""
    rows = []
    for p in use:
        for r in p["rows"]:
            if r["is_data"]:
                rows.append([_int(r["cells"].get(i, "") or "x") for i in range(ncols)])
    if len(rows) < 5:
        return None

    def frac(pred):
        ok = n = 0
        for c in rows:
            try:
                v = pred(c)
            except TypeError:
                continue
            n += 1
            ok += bool(v)
        return ok / max(1, len(rows))

    best = (0, None, False, first_cand)
    for start in range(first_cand, min(first_cand + 5, ncols - 3)):
        for j in range(start + 2, ncols):
            if j - start < 3:
                continue
            a = frac(lambda c: c[j] >= 20 and sum(c[start:j]) == c[j])
            b = frac(lambda c: c[j] >= 20 and sum(c[start:j - 1]) == c[j]) if j - 1 > start + 1 else 0
            if a > best[0] + 1e-9:
                best = (a, j, False, start)
            if b > best[0] + 1e-9:
                best = (b, j, True, start)
    score, j, nota_inside, start = best
    if j is None or score < 0.35:
        return None
    best_score = score
    kinds = [""] * ncols
    kinds[0] = "serial"
    if first_cand == 2:
        kinds[1] = "ps"
    kinds[j] = "total_valid"
    for k in range(first_cand, start):
        kinds[k] = "pre_extra"
    tot = None
    for k in range(j + 1, ncols):
        if frac(lambda c: c[j] + sum(c[j + 1:k]) == c[k]) >= 0.35:
            tot = k
            break
    if tot is None:
        tot = j + 3 if j + 3 < ncols else None
    if tot is not None:
        kinds[tot] = "total"
        mids = list(range(j + 1, tot))
        if mids:
            means = {m: sum((c[m] or 0) for c in rows) / len(rows) for m in mids}
            if nota_inside:
                kinds[mids[0]] = "rejected"
                for m in mids[1:]:
                    kinds[m] = "nota_post"
            elif len(mids) == 1:
                kinds[mids[0]] = "rejected"
            else:
                nm = max(mids, key=lambda m: means[m])
                for m in mids:
                    kinds[m] = "nota_post" if m == nm else "rejected"
        for k in range(tot + 1, ncols):
            kinds[k] = "tendered"
    else:
        for k in range(j + 1, ncols):
            kinds[k] = "rejected" if k == j + 1 else "tendered"
    return kinds, (j - 1 if nota_inside else None), best_score


def table_from_pages(pages):
    """Combine parsed pages (same layout) into the extract.py result format."""
    pages = [p for p in pages if p]
    if not pages:
        return None
    # choose layout by number of columns most common
    from collections import Counter
    ncols = Counter(len(p["columns"]) for p in pages).most_common(1)[0][0]
    use = [p for p in pages if len(p["columns"]) == ncols]
    warn = []
    if len(use) < len(pages):
        warn.append(f"{len(pages) - len(use)} page(s) with a different column count skipped")
    # headers: take the longest header text per column across pages
    hdrs = []
    for ci in range(ncols):
        hs = [p["columns"][ci]["header"] for p in use if p["columns"][ci]["header"]]
        hdrs.append(max(hs, key=len) if hs else "")
    cols = [dict(header=h) for h in hdrs]
    kinds, post_start = classify(cols)
    # booth-number column: among the first columns, the one stepping +1 most often
    # (round / table-number columns repeat or cycle)
    first_cand = 1
    ps_col = 0
    best_steps = -1
    for ci in range(0, min(4, ncols - 3)):
        seq = [booth_token(r["cells"].get(ci, "") or "") for p in use for r in p["rows"] if r["is_data"]]
        steps = sum(1 for a, b in zip(seq, seq[1:]) if a and b and b[0] - a[0] in (0, 1) and b != a)
        if steps > best_steps + 2:
            ps_col, best_steps = ci, steps
    if ps_col > 0:
        for ci in range(0, ps_col):
            kinds[ci] = "pre_extra"
        kinds[ps_col] = "ps"
        first_cand = ps_col + 1
    else:
        vals1 = [r["cells"].get(1, "") for p in use for r in p["rows"] if r["is_data"]]
        b1 = [booth_token(v) for v in vals1]
        mono = sum(1 for a, b in zip(b1, b1[1:]) if a and b and b[0] >= a[0])
        if sum(1 for b in b1 if b) >= 0.8 * len(b1) and mono >= 0.8 * max(1, len(b1) - 1) and kinds[1] == "":
            kinds[1] = "ps"
            first_cand = 2
    nota_inside = None
    hdr_rate = header_rate(use, kinds, first_cand, post_start, ncols) if "total_valid" in kinds else 0.0
    if hdr_rate < 0.5:
        inf = infer_by_arithmetic(use, ncols, first_cand)
        if inf and inf[2] > hdr_rate:
            kinds, nota_inside, _ = inf
            post_start = kinds.index("total_valid")
            warn.append("column roles inferred from row arithmetic (header unreadable or inconsistent)")
    cand_idx = [i for i in range(first_cand, post_start) if not kinds[i]]
    cands = []
    for i in cand_idx:
        nm = clean_name(hdrs[i])
        is_nota = bool(NOTA_KW.search(hdrs[i])) or i == nota_inside
        cands.append(dict(name="NOTA" if is_nota else nm, party="NOTA" if is_nota else "", is_nota=is_nota, col=i))
    if not any(c["is_nota"] for c in cands) and "nota_post" in kinds:
        i = kinds.index("nota_post")
        cands.append(dict(name="NOTA", party="NOTA", is_nota=True, col=i))
    post = {k: kinds.index(k) for k in ("total_valid", "rejected", "total", "tendered") if k in kinds}
    booths, totals = [], []
    for pi, p in enumerate(use):
        for r in p["rows"]:
            cells = r["cells"]
            votes = [_int(cells[c["col"]]) if c["col"] in cells else None for c in cands]
            nnum = sum(1 for v in votes if v is not None)
            label = r["label"]
            if r["is_data"] and _numbering_row([cells.get(i, "") for i in range(ncols)]):
                continue
            if r["is_data"]:
                ps = cells.get(ps_col) if ps_col > 0 else (cells.get(1) if first_cand == 2 else cells.get(0))
                tok = booth_token(ps or "")
                if not tok:
                    continue
                b = dict(booth_no=tok[0], booth_suffix=tok[1], is_postal=False, booth_name="",
                         votes=votes, serial=_int(cells.get(0, "") or "x"))
                if r.get("src"):
                    b["_src"] = (pi, r["src"])
                if r.get("knn"):
                    b["ocr_fix"] = "digits re-read by self-trained reader"
                for k, c in post.items():
                    b[k] = _int(cells[c]) if c in cells else None
                booths.append(b)
            elif nnum >= 0.5 * max(1, len(cands)):
                if POSTAL_KW.search(label):
                    b = dict(booth_no=None, booth_suffix="", is_postal=True, booth_name="", votes=votes)
                    for k, c in post.items():
                        b[k] = _int(cells[c]) if c in cells else None
                    booths.append(b)
                else:
                    totals.append(dict(label=label[:60], votes=votes,
                                       total=_int(cells[post["total"]]) if "total" in post and post["total"] in cells else None))
    if not booths:
        return None
    return dict(layout="pdf", candidates=cands, use_pages=use,
                booths=booths, totals=totals, pre={}, post=post, warnings=warn, headers=hdrs, kinds=kinds)
