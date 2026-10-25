"""Parser for Form-20 sheets where each candidate has a single vote column
(name, and optionally party, written in the header rows above it)."""
import re

from parse_wide import (NOTA_KW, POSTAL_KW, REJ_KW, TEND_KW, TOTAL_KW, _numbering_row,
                        booth_token, clean_name, is_num, to_int)

PRE_KW = re.compile(
    r"elector|\bmale\b|female|\bother|third|\btg\b|turnout|identif|tender|percent|%|polling|\bpart\b|part no|"
    r"\bs\.? ?no\b|\bsl\.? ?no|serial|name of|^name$|^no\.?$|a\.?c\.? ?no|ps.?no|"
    r"निर्वाचक|मतदाता|पुरुष|महिला|^अन्य|मतदान|प्रतिशत|क्रम ?सं|क्र0|क्रमांक|^भाग|मतदेय|स्थल|संख्या|निविदत्त|पहचान", re.I)
GROUP_KW = re.compile(
    r"candidate|प्रत्याशी|अभ्यर्थी|following|निम्नलिखित|valid votes cast|votes cast in favour|"
    r"प्राप्त मत|^votes?$|^मत$|party|दल|serial|sl\.?\s*n|^s\.?\s*no|पक्ष में|in favour", re.I)
VALID_KW = re.compile(r"valid|वैध|वैद्य|विधिमान", re.I)


def _header_cells(rows, hdr, c):
    return [rows[r][c] for r in hdr if rows[r][c]]


def parse_simple(sheet):
    rows = sheet.rows
    nrows, ncols = sheet.nrows, sheet.ncols
    if nrows < 5 or ncols < 5:
        return None
    # locate booth column + first data row: rows with booth token and >=4 numbers
    best = None
    for bc in range(0, min(5, ncols)):
        hits = []
        for r in range(nrows):
            row = rows[r]
            t = booth_token(row[bc])
            if not t:
                continue
            if sum(1 for x in row if is_num(x)) >= 5 and not _numbering_row(row):
                hits.append(r)
        distinct = len({booth_token(rows[r][bc]) for r in hits})
        if best is None or distinct > best[0]:
            best = (distinct, bc, hits)
    if not best or best[0] < 3:
        return None
    _, bc, hits = best
    fd = hits[0]
    hdr = [r for r in range(max(0, fd - 9), fd)
           if not _numbering_row(rows[r]) and sum(1 for x in rows[r] if x) >= 2]
    data_rows = [r for r in range(fd, nrows)]
    booth_rows = hits

    # numeric share per column over booth rows
    def num_share(c):
        vals = [rows[r][c] for r in booth_rows]
        n = sum(1 for v in vals if is_num(v))
        blank = sum(1 for v in vals if not v or v in ("-", "--"))
        return n / max(1, len(vals)) if n >= 0.2 * len(vals) else 0, (n + blank) / max(1, len(vals))

    numeric = [c for c in range(ncols) if c != bc and num_share(c)[0] > 0 and num_share(c)[1] >= 0.8]

    def own_hdr(c):
        cells = _header_cells(rows, hdr, c)
        return cells

    def is_candidate_col(c):
        cells = own_hdr(c)
        if not cells:
            return False
        txt = " ".join(cells)
        if NOTA_KW.search(txt):
            return True
        named = [x for x in cells if not GROUP_KW.search(x) and not is_num(x)]
        if not named:
            return False
        low = named[-1]
        if PRE_KW.search(low) or REJ_KW.search(low) or TOTAL_KW.search(low) \
                or VALID_KW.search(low) or TEND_KW.search(low) or POSTAL_KW.search(low):
            return False
        return True

    # longest contiguous run (in numeric-column order) of candidate columns
    runs, cur = [], []
    for c in numeric:
        if is_candidate_col(c) and (not cur or c - cur[-1] <= 2):
            cur.append(c)
        else:
            if cur:
                runs.append(cur)
            cur = [c] if is_candidate_col(c) else []
    if cur:
        runs.append(cur)
    if not runs:
        return None
    cand_cols = max(runs, key=len)
    if len(cand_cols) < 2:
        return None

    cands = []
    for c in cand_cols:
        cells = [x for x in own_hdr(c) if not GROUP_KW.search(x) or NOTA_KW.search(x)]
        cells = [x for x in cells if not is_num(x)]
        name = clean_name(cells[0]) if cells else ""
        party = cells[1] if len(cells) > 1 else ""
        # "Name - Party" or "Name (Party)" in one cell
        if not party:
            m = re.match(r"^(.*?)\s*\((.+)\)\s*$", name)
            if m and len(m.group(2)) > 1:
                name, party = m.group(1).strip(), m.group(2).strip()
        is_nota = bool(NOTA_KW.search(" ".join(own_hdr(c))))
        if is_nota:
            name, party = "NOTA", "NOTA"
        cands.append(dict(name=name, party=party, vote_col=c, is_nota=is_nota))

    first_c, last_c = cand_cols[0], cand_cols[-1]
    post, pre = {}, {}
    for c in numeric:
        if c > last_c:
            t = " ".join(own_hdr(c))
            if NOTA_KW.search(t):
                if not any(cd["is_nota"] for cd in cands):
                    cands.append(dict(name="NOTA", party="NOTA", vote_col=c, is_nota=True))
            elif REJ_KW.search(t):
                post.setdefault("rejected", c)
            elif TEND_KW.search(t):
                post.setdefault("tendered", c)
            elif VALID_KW.search(t) and "total_valid" not in post:
                post["total_valid"] = c
            elif TOTAL_KW.search(t):
                post.setdefault("total", c)
        elif c < first_c:
            cells = own_hdr(c)
            own = cells[-1] if cells else ""
            t = " ".join(cells).lower()
            if "elector" in t or "निर्वाचक" in t:
                if TOTAL_KW.search(own) or not any(k in own.lower() for k in ("male", "पुरुष", "महिला", "other", "अन्य")):
                    pre["electors"] = c
            elif TEND_KW.search(t):
                pre.setdefault("tendered", c)
            elif re.search(r"female|महिला|स्त्री", own, re.I):
                pre["voters_female"] = c
            elif re.search(r"\bmale|पुरुष", own, re.I):
                pre["voters_male"] = c
            elif re.search(r"other|third|tg|अन्य", own, re.I):
                pre["voters_other"] = c
            elif TOTAL_KW.search(own):
                pre["voters_total"] = c
    if "tendered" in post:
        pre.setdefault("tendered", post.pop("tendered"))

    # name column
    name_c = None
    for c in range(bc + 1, first_c):
        vals = [rows[r][c] for r in booth_rows[:200]]
        if vals and sum(1 for v in vals if v and not is_num(v)) >= 0.5 * len(vals):
            name_c = c
            break
    suf_c = None
    if bc + 1 < first_c and bc + 1 != name_c:
        vals = [rows[r][bc + 1] for r in booth_rows]
        ne = [v for v in vals if v]
        if ne and len(ne) < 0.6 * len(vals) and all(len(v) <= 3 and not is_num(v) for v in ne):
            suf_c = bc + 1

    booths, totals = [], []
    seen = False
    for r in data_rows:
        row = rows[r]
        if not any(row):
            continue
        votes = [to_int(row[cd["vote_col"]]) for cd in cands]
        nnum = sum(1 for v in votes if v is not None)
        label = " ".join(row[c] for c in range(0, first_c) if row[c] and not is_num(row[c]))
        tok = booth_token(row[bc])
        if tok and suf_c is not None and row[suf_c]:
            tok = (tok[0], row[suf_c].strip())
        postal = bool(POSTAL_KW.search(label))
        if not tok and not postal:
            if seen and nnum >= 0.5 * len(cands) and (TOTAL_KW.search(label) or not label):
                totals.append(dict(row=r, label=label[:60], votes=votes,
                                   total=to_int(row[post["total"]]) if "total" in post else None))
            continue
        if nnum < 0.5 * len(cands) or _numbering_row(row):
            continue
        seen = True
        b = dict(booth_no=tok[0] if tok else None, booth_suffix=tok[1] if tok else "",
                 is_postal=postal and not tok,
                 booth_name=row[name_c] if name_c is not None else "", votes=votes, src_row=r)
        for k, c in list(pre.items()) + list(post.items()):
            b[k] = to_int(row[c])
        booths.append(b)
    if not booths:
        return None
    return dict(layout="single", candidates=cands, booths=booths, totals=totals, pre=pre,
                post=post, booth_col=bc, warnings=[], sub_row=fd - 1)
