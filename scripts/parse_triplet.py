"""Form-20 sheets with candidate blocks (S.No | Party | Votes) but no
'Votes Secured' sub-header: blocks are found from the data itself, where the
serial-number columns hold 1, 2, 3 ... at a fixed stride."""
from collections import Counter

from parse_simple import _header_cells, is_group
from parse_wide import (NOTA_KW, POSTAL_KW, REJ_KW, TEND_KW, TOTAL_KW, _numbering_row,
                        booth_token, clean_name, is_num, to_int)


def parse_triplet(sheet):
    rows = sheet.rows
    if sheet.nrows < 5 or sheet.ncols < 8:
        return None
    best = None
    for bc in range(0, min(5, sheet.ncols)):
        hits = [r for r in range(sheet.nrows) if booth_token(rows[r][bc])
                and sum(1 for x in rows[r] if is_num(x)) >= 5 and not _numbering_row(rows[r])]
        d = len({booth_token(rows[r][bc]) for r in hits})
        if best is None or d > best[0]:
            best = (d, bc, hits)
    if not best or best[0] < 3:
        return None
    _, bc, hits = best
    sample = hits[: min(len(hits), 300)]
    # serial columns: constant small integer wherever filled
    serial = {}
    for c in range(bc + 1, sheet.ncols):
        vals = [to_int(rows[r][c]) for r in sample if rows[r][c]]
        if len(vals) < 1 or any(v is None for v in vals):
            continue
        top, cnt = Counter(vals).most_common(1)[0]
        if 1 <= top <= 80 and cnt >= 0.95 * len(vals):
            serial[c] = top
    # longest chain 1,2,3,... with constant stride
    chain = []
    for c, k in sorted(serial.items()):
        if k == 1:
            cur = [c]
            want = 2
            for c2, k2 in sorted(serial.items()):
                if c2 > cur[-1] and k2 == want:
                    cur.append(c2)
                    want += 1
            if len(cur) > len(chain):
                chain = cur
    if len(chain) < 2:
        return None
    strides = Counter(b - a for a, b in zip(chain, chain[1:]))
    w = strides.most_common(1)[0][0]
    if w < 2 or w > 4:
        return None
    fd = hits[0]
    hdr = [r for r in range(max(0, fd - 8), fd) if not _numbering_row(rows[r]) and sum(1 for x in rows[r] if x) >= 2]

    cands = []
    for i, sc in enumerate(chain):
        end = chain[i + 1] - 1 if i + 1 < len(chain) else sc + w - 1
        vc = end
        name = ""
        for c in range(sc, end + 1):
            cells = [x for x in _header_cells(rows, hdr, c) if not is_group(x) and not is_num(x)]
            if cells:
                name = cells[-1]
                break
        party = ""
        for r in sample[:20]:
            for c in range(sc + 1, vc):
                if rows[r][c] and not is_num(rows[r][c]):
                    party = rows[r][c]
                    break
            if party:
                break
        cands.append(dict(name=clean_name(name), party=party, vote_col=vc,
                          is_nota=bool(NOTA_KW.search(name + " " + party))))
    last = cands[-1]["vote_col"]
    post = {}
    for c in range(last + 1, sheet.ncols):
        t = " ".join(_header_cells(rows, hdr, c))
        if not t:
            continue
        if NOTA_KW.search(t) and not any(cd["is_nota"] for cd in cands):
            cands.append(dict(name="NOTA", party="NOTA", vote_col=c, is_nota=True))
        elif REJ_KW.search(t):
            post.setdefault("rejected", c)
        elif TOTAL_KW.search(t):
            post.setdefault("total", c)
    for cd in cands:
        if cd["is_nota"]:
            cd["name"] = cd["party"] = "NOTA"
    first = chain[0]
    name_c = next((c for c in range(bc + 1, first) if sum(
        1 for r in sample if rows[r][c] and not is_num(rows[r][c])) >= 0.5 * len(sample)), None)
    pre = {}
    for c in range(bc + 1, first):
        t = " ".join(_header_cells(rows, hdr, c)).lower()
        if TEND_KW.search(t):
            pre["tendered"] = c
    booths, totals, seen = [], [], False
    for r in range(fd, sheet.nrows):
        row = rows[r]
        if not any(row):
            continue
        votes = [to_int(row[cd["vote_col"]]) for cd in cands]
        nnum = sum(1 for v in votes if v is not None)
        label = " ".join(row[c] for c in range(0, first) if row[c] and not is_num(row[c]))
        tok = booth_token(row[bc])
        postal = bool(POSTAL_KW.search(label))
        if not tok and not postal:
            if seen and nnum >= 0.5 * len(cands):
                totals.append(dict(row=r, label=label[:60], votes=votes,
                                   total=to_int(row[post["total"]]) if "total" in post else None))
            continue
        if nnum < 0.5 * len(cands):
            continue
        seen = True
        b = dict(booth_no=tok[0] if tok else None, booth_suffix=tok[1] if tok else "",
                 is_postal=postal and not tok, booth_name=row[name_c] if name_c is not None else "",
                 votes=votes)
        for k, c in list(pre.items()) + list(post.items()):
            b[k] = to_int(row[c])
        booths.append(b)
    if not booths:
        return None
    return dict(layout="triplet", candidates=cands, booths=booths, totals=totals, pre=pre,
                post=post, warnings=[])
