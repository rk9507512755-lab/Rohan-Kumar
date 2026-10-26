"""Assemble parsed records into the final dataset + per-AC quality report."""
import collections
import csv
import glob
import gzip
import json
import os
import re
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(__file__))
from extract import booth_check  # noqa: E402
from parse_wide import HDR_JUNK, VOTE_KW  # noqa: E402
from parties import split_name_party, std_party  # noqa: E402

BAD_PARTY = re.compile(r"^(\W*|.*?\W*s\W*l?\W*n\W*[o0]\W*\d*\W*|[^A-Za-z\u0900-\u097F]*[A-Za-z\u0900-\u097F]?[^A-Za-z\u0900-\u097F]*)$", re.I)
JUNK_NAME = re.compile(r"^\W*\d*\W*$|^(and party|candidate.*|s\.?\s*no.*)$", re.I)

OUT = sys.argv[1] if len(sys.argv) > 1 else "/home/user/rohan-kumar/data"
ELECTIONS = [("VS2012", "Vidhan Sabha", 2012), ("LS2014", "Lok Sabha", 2014), ("VS2017", "Vidhan Sabha", 2017),
             ("LS2019", "Lok Sabha", 2019), ("VS2022", "Vidhan Sabha", 2022), ("LS2024", "Lok Sabha", 2024)]
EYEAR = {e: y for e, _, y in ELECTIONS}


def load_all():
    recs = collections.defaultdict(list)
    for p in glob.glob("work/parsed/*.json") + glob.glob("work/parsed_pdf/*.json") + glob.glob("work/parsed_ocr/*.json"):
        r = json.load(open(p))
        if r.get("ac"):
            recs[(r["election"], r["ac"])].append(r)
    return recs


_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def xl_safe(df):
    return df.apply(lambda col: col.map(lambda v: _CTRL.sub("", v) if isinstance(v, str) else v))


def rec_rate(r):
    if r.get("status") != "OK":
        return -1
    v = [booth_check(b, r["candidates"]) for b in r["booths"]]
    v = [x for x in v if x is not None]
    return sum(v) / len(v) if v else 0.5


def pick(cands):
    ok = [r for r in cands if r.get("status") == "OK" and r.get("booths")]
    if not ok:
        return cands[0], []
    best = max(ok, key=lambda r: (rec_rate(r) >= 0.9, r.get("source") == "pdf-text",
                                  round(rec_rate(r), 2), len(r["booths"])))
    others = [r for r in cands if r is not best]
    return best, others


def repair_sequence(r):
    """OCR records: booth number read from the PS column can be garbled; use
    the serial column / running order to repair obvious misreads."""
    fixed = 0
    prev = 0
    for b in r["booths"]:
        if b.get("is_postal"):
            continue
        n, s = b.get("booth_no"), b.get("serial")
        good = lambda x: x is not None and prev <= x <= prev + 3  # noqa: E731
        if good(n):
            prev = n
            continue
        if good(s):
            b["booth_no"], b["booth_suffix"] = s, ""
            b["booth_fix"] = f"booth no {n} -> {s} (serial column)"
            fixed += 1
            prev = s
        elif n is not None:
            prev = max(prev, n) if n < prev + 50 else prev
    return fixed


def clean_cand_name(n):
    n = re.sub(r"\s+", " ", (n or "")).strip(" -|.,;:'\"")
    return n


HDR_AC = re.compile(r"(?:constitu\w*|AC|सभा|क्षेत्र)\W{0,6}(?:no\.?\s*&?\s*name\W*)?_*(\d{1,3})\s*[-_ ]+\s*([A-Za-zऀ-ॿ][A-Za-zऀ-ॿ .()]{1,40}?)(?=\s+(?:UTTAR|UTTER|District|DISTRICT|जनपद|विधानसभा|Date|DATE|दिनांक|चक्र|Round|ROUND|Polling|AC\s*No)|\s*$|\s{2})", re.I)
DIST_RE = re.compile(r"District\s*[-:_ ]*\s*_*([A-Za-z][A-Za-z .]{2,40}?)_*\s+(?:AC|A\.C|Polling|No|$)", re.I)


def header_meta(r):
    t = r.get("header") or ""
    m = HDR_AC.search(t)
    ac_no, ac_name = (int(m.group(1)), m.group(2).strip(" .")) if m else (None, None)
    d = DIST_RE.search(t)
    years = sorted(set(re.findall(r"\b(20[012]\d)\b", t + " " + (r.get("sheet") or ""))))
    return ac_no, ac_name, (d.group(1).strip() if d else None), years


def ac_names(chosen):
    names = collections.defaultdict(collections.Counter)
    dists = collections.defaultdict(collections.Counter)
    # the Drive's download log has clean AC + district names for the 2024 files
    st = "raw/00_MASTER/_download_status.json"
    if os.path.exists(st):
        for x in json.load(open(st)):
            if x.get("election") == "2024" and x.get("name") and not x["name"].lower().startswith("ac_no"):
                names[x["ac"]][x["name"].strip()] += 50
                if x.get("district"):
                    dists[x["ac"]][x["district"].strip()] += 50
    for f in os.listdir("raw/06_Lok_Sabha_2024"):
        m = re.match(r"AC(\d+)_(.+)\.pdf$", f)
        if m:
            names[int(m.group(1))][m.group(2).replace("_", " ")] += 2
    for (e, ac), r in chosen.items():
        hno, hname, dist, _ = header_meta(r)
        if hno == ac and hname and re.match(r"[A-Za-z]", hname):
            names[ac][hname.title()] += 1
        if dist and hno == ac and re.fullmatch(r"[A-Za-z ]{3,30}", dist.strip(" .")) and \
                not re.search(r"\b(ac|no|sl|polling)\b", dist, re.I):
            dists[ac][dist.strip(" .").title()] += 1
    out = {}
    for ac in range(1, 404):
        nm = names[ac].most_common(1)[0][0] if names[ac] else ""
        ds = dists[ac].most_common(1)[0][0] if dists[ac] else ""
        out[ac] = (nm, ds)
    return out


def _nm(x):
    return re.sub(r"[^a-z]", "", (x or "").lower())


def quality(e, ac, r, others, names=None, dup_of=None):
    q = dict(election=e, ac_no=ac, status=r.get("status"), source_file=r.get("file"),
             parse_method=r.get("layout") or r.get("source") or "", sheet=r.get("sheet") or "")
    flags = []
    if r.get("status") != "OK":
        q.update(grade="F", flags=r.get("status") + (": " + r.get("error", "") if r.get("error") else ""))
        return q
    cands = r["candidates"]
    B = r["booths"]
    nb = [b for b in B if not b.get("is_postal")]
    nums = [b["booth_no"] for b in nb if b.get("booth_no")]
    keys = collections.Counter((b.get("booth_no"), b.get("booth_suffix")) for b in nb)
    mx = max(nums) if nums else 0
    gaps = len(set(range(1, mx + 1)) - set(nums)) if mx else 0
    dups = sum(v - 1 for v in keys.values() if v > 1)
    checks = [booth_check(b, cands) for b in B]
    chk = [c for c in checks if c is not None]
    rate = (sum(chk) / len(chk)) if chk else None
    n_real = sum(1 for c in cands if not c.get("is_nota"))
    zero_booths = sum(1 for b in nb if sum(v or 0 for v in b["votes"]) == 0)
    missing_cells = sum(1 for b in B for v in b["votes"] if v is None)
    q.update(n_booths=len(nb), postal_row=any(b.get("is_postal") for b in B), max_booth_no=mx,
             booth_gaps=gaps, duplicate_booths=dups, zero_vote_booths=zero_booths,
             n_candidates=n_real, has_nota=any(c.get("is_nota") for c in cands),
             total_votes=sum(v or 0 for b in B for v in b["votes"]),
             booths_with_total_col=len(chk), sum_check_rate=round(rate, 4) if rate is not None else None,
             blank_vote_cells=missing_cells,
             kruti_cells_converted=(r.get("kruti_cells") or 0) + (r.get("kruti_heuristic_cells") or 0))
    # systematic offset: total column also summed the serial-number columns
    if rate is not None and rate < 0.95:
        diffs = collections.Counter()
        for b in B:
            t = next((b.get(k) for k in ("total", "total_valid", "voters_total") if b.get(k) is not None), None)
            if t is not None:
                diffs[t - sum(v or 0 for v in b["votes"])] += 1
        top, cnt = diffs.most_common(1)[0] if diffs else (0, 0)
        tri = n_real * (n_real + 1) // 2
        if top in (tri - 1, tri) and cnt >= 0.8 * sum(diffs.values()):
            flags.append(f"file's Total column wrongly includes candidate serial numbers (+{top} in every booth); candidate votes unaffected")
        elif cnt >= 0.8 * sum(diffs.values()) and top != 0:
            flags.append(f"file's Total column differs from candidate sum by a constant {top}")
        elif not any(c.get("is_nota") for c in cands) and r["election"] != "VS2012" and \
                sum(c for d, c in diffs.items() if 0 <= d <= 15) >= 0.8 * sum(diffs.values()):
            flags.append("NOTA column absent in file; Total exceeds candidate sum by a few votes (likely NOTA)")
        else:
            flags.append(f"candidate votes add up to the file's Total in only {rate:.0%} of booths")
    # compare with the file's own grand-total row
    tot = [t for t in r.get("totals", []) if len(t.get("votes", [])) == len(cands)]
    if tot:
        sums = [sum(b["votes"][i] or 0 for b in B) for i in range(len(cands))]
        best = max(tot, key=lambda t: sum(1 for a, b in zip(sums, t["votes"]) if a == (b or 0)))
        match = sum(1 for a, b in zip(sums, best["votes"]) if a == (b or 0))
        q["candidates_matching_file_total_row"] = f"{match}/{len(cands)}"
        if match < len(cands):
            flags.append(f"booth sums match the file's total row for {match}/{len(cands)} candidates")
    hno, hname, _, years = header_meta(r)
    hdr_mismatch = False
    own_sheet = any(str(n).startswith("used sheet") for n in r.get("notes", []))
    if hno and hno != ac and names and not own_sheet:
        known = _nm(names.get(hno, ("", ""))[0])
        if known and _nm(hname) and (_nm(hname).startswith(known[:5]) or known.startswith(_nm(hname)[:5])):
            hdr_mismatch = True
            flags.append(f"header names AC {hno} ({hname}) but file is for AC {ac}")
    if dup_of:
        flags.append(f"booth data identical to AC {', '.join(map(str, dup_of))} of the same election - probably the wrong file was uploaded")
    bad_years = [y for y in years if int(y) != EYEAR[e] and not (e == "VS2012" and y == "2011")]
    if bad_years:
        flags.append(f"header/sheet mentions year {', '.join(bad_years)} (check this is the {EYEAR[e]} result)")
    if not cands or any(not c["name"] for c in cands):
        flags.append(f"{sum(1 for c in cands if not c['name'])} candidate name(s) missing in header")
    if not any(c.get("party") for c in cands if not c.get("is_nota")):
        flags.append("party affiliation not given in file")
    if gaps:
        flags.append(f"{gaps} booth numbers missing between 1 and {mx}")
    if dups:
        flags.append(f"{dups} duplicate booth rows")
    if zero_booths > max(2, 0.05 * max(1, len(nb))):
        flags.append(f"{zero_booths} booths with zero votes")
    if r.get("source") == "ocr":
        nknn = sum(1 for b in B if b.get("ocr_fix", "").startswith("digits"))
        nfix = sum(1 for b in B if b.get("ocr_fix", "").startswith("cell"))
        nimp = sum(1 for b in B if b.get("ocr_fix", "").startswith("imputed"))
        nbf = sum(1 for b in B if b.get("booth_fix"))
        flags.append(f"OCR of scanned PDF: {nknn} rows corrected by self-trained digit reader, {nfix} rows re-read cell by cell, "
                     f"{nimp} cells imputed from row totals, {nbf} booth numbers repaired")
    for w in r.get("warnings", []) + r.get("notes", []):
        if w and "OCR:" not in w:
            flags.append(w)
    if others:
        q["alternate_files"] = "; ".join(o.get("file", "") for o in others)
    # grade
    if rate is None:
        g = "B" if q.get("candidates_matching_file_total_row", "0/1").split("/")[0] == str(len(cands)) else "C"
    elif rate >= 0.98:
        g = "A"
    elif rate >= 0.9:
        g = "B"
    elif any("serial numbers" in f or "constant" in f or "NOTA column absent" in f for f in flags):
        g = "B"
    elif rate >= 0.5:
        g = "C"
    else:
        g = "D"
    if dup_of:
        g = "D"
    elif hdr_mismatch and g in ("A", "B"):
        g = "C"
    q["grade"] = g
    q["flags"] = " | ".join(dict.fromkeys(flags))
    return q


def borrow_ls_names(chosen):
    """OCR'd Lok Sabha ACs: copy candidate names/parties from a text-parsed AC
    of the same parliamentary constituency (same ballot). The donor must be a
    nearby AC with the same number of candidates whose vote shares, in ballot
    order, correlate strongly and clearly better than any other donor."""
    import numpy as np
    def shares(r):
        v = np.array([sum(b["votes"][i] or 0 for b in r["booths"]) for i in range(len(r["candidates"]))], float)
        return v / v.sum() if v.sum() else v
    LABEL = re.compile(r"निर्वाचन|संख्या|पक्ष|अभ्यर्थ|क्षेत्र|मतों|सभा|लोक|विधान|[|{}<>\[\]~@#]|\d{3,}")

    def bad_names(r):
        from loader import kd_score
        names = [c["name"] for c in r["candidates"] if not c.get("is_nota")]
        if not names:
            return True
        bad = sum(1 for n in names if not n or LABEL.search(n) or kd_score(n) > 0.3 or len(n) > 40)
        return bad >= 0.3 * len(names)

    def good_donor(r2):
        return r2.get("source") != "ocr" and r2.get("status") == "OK" and not bad_names(r2)

    for (e, ac), r in chosen.items():
        if e != "LS2024" or r.get("status") != "OK":
            continue
        if r.get("source") != "ocr" and not bad_names(r):
            continue
        n = len(r["candidates"])
        sv = shares(r)
        scored = []
        for d in range(1, 8):
            for a2 in (ac - d, ac + d):
                r2 = chosen.get((e, a2))
                if not r2 or not good_donor(r2) or len(r2["candidates"]) != n:
                    continue
                s2 = shares(r2)
                if sv.std() == 0 or s2.std() == 0:
                    continue
                scored.append((float(np.corrcoef(sv, s2)[0, 1]), a2, r2))
        if not scored:
            continue
        scored.sort(key=lambda x: -x[0])
        best = scored[0]
        if best[0] >= 0.95 and (len(scored) == 1 or best[0] - scored[1][0] >= 0.02 or
                                [c["name"] for c in scored[1][2]["candidates"]] == [c["name"] for c in best[2]["candidates"]]):
            for c, c2 in zip(r["candidates"], best[2]["candidates"]):
                c["ocr_name"] = c["name"]
                c["name"], c["party"], c["is_nota"] = c2["name"], c2.get("party", ""), c2.get("is_nota", False)
            r.setdefault("notes", []).append(
                f"candidate names/parties taken from AC {best[1]} (same ballot; vote-share correlation {best[0]:.3f})")


def main():
    os.makedirs(OUT, exist_ok=True)
    recs = load_all()
    chosen, alts = {}, {}
    for key, rs in recs.items():
        for r in rs:
            if r.get("source") == "ocr" and r.get("status") == "OK" and (r.get("check_rate") or 0) < 0.5:
                r["status"] = "OCR_UNRELIABLE"
                r["error"] = f"only {r.get('check_rate', 0):.0%} of OCR'd booth rows add up; data withheld"
        best, others = pick(rs)
        chosen[key] = best
        alts[key] = others
    for r in chosen.values():
        if r.get("source") == "ocr" and r.get("status") == "OK":
            repair_sequence(r)
    borrow_ls_names(chosen)
    names = ac_names({k: v for k, v in chosen.items() if v.get("status") == "OK"})
    sigs = collections.defaultdict(list)
    for (e, ac), r in chosen.items():
        if r.get("status") == "OK":
            sig = tuple(tuple(b["votes"]) for b in r["booths"][:40] if not b.get("is_postal"))
            if sig and sum(v or 0 for t in sig for v in t) > 0:
                sigs[(e, sig)].append(ac)
    dup = {}
    from extract import sheet_ac
    for (e, _), acs in sigs.items():
        if len(acs) < 2:
            continue
        owners = [a for a in acs if header_meta(chosen[(e, a)])[0] == a or sheet_ac(chosen[(e, a)].get("sheet") or "") == a]
        if len(owners) == 1:
            for a in acs:
                if a != owners[0]:
                    r = chosen[(e, a)]
                    r["status"] = "WRONG_FILE"
                    r["error"] = f"file holds the booth data of AC {owners[0]} (identical rows); data withheld for this AC"
            continue
        for a in acs:
            dup[(e, a)] = [x for x in acs if x != a]

    long_rows = collections.defaultdict(list)
    booth_rows, cand_rows, qrows = [], [], []
    for (e, ac) in sorted(chosen):
        r = chosen[(e, ac)]
        q = quality(e, ac, r, alts[(e, ac)], names, dup.get((e, ac)))
        acname, dist = names.get(ac, ("", ""))
        q["ac_name"], q["district"] = acname, dist
        qrows.append(q)
        if r.get("status") != "OK":
            continue
        cands = r["candidates"]
        for c in cands:
            c["name"] = clean_cand_name(c["name"]) or ("NOTA" if c.get("is_nota") else "")
            if not c.get("is_nota"):
                if JUNK_NAME.match(c["name"]) or HDR_JUNK.match(c["name"]) or VOTE_KW.search(c["name"]):
                    c["name"] = ""
                if not (c.get("party") or "").strip() and c["name"]:
                    nm, pty = split_name_party(c["name"])
                    if pty:
                        c["name"], c["party"] = nm, pty
                elif c.get("party") and (HDR_JUNK.match(c["party"]) or BAD_PARTY.match(c["party"])):
                    c["party"] = ""
            pty = (c.get("party") or "").strip()
            if len(pty) > 3 and not c.get("is_nota"):
                k = c["name"].lower().find(pty.lower()[:10])
                if k > 2:
                    c["name"] = c["name"][:k].strip(" -,(/")
            c["party_std"] = "NOTA" if c.get("is_nota") else std_party(c.get("party"))
        seen = collections.Counter()
        totals = [0] * len(cands)
        for b in r["booths"]:
            if b.get("is_postal"):
                bid = "POSTAL"
            else:
                bid = f"{b['booth_no']}{b.get('booth_suffix') or ''}"
            seen[bid] += 1
            if seen[bid] > 1:
                bid = f"{bid}#{seen[bid]}"
            votes = b["votes"]
            s_all = sum(v or 0 for v in votes)
            ranked = sorted(((v or 0, i) for i, v in enumerate(votes) if not cands[i].get("is_nota")), reverse=True)
            win = ranked[0] if ranked else (0, None)
            run = ranked[1] if len(ranked) > 1 else (0, None)
            chk = booth_check(b, cands)
            booth_rows.append(dict(
                election=e, ac_no=ac, ac_name=acname, booth_id=bid, booth_no=b.get("booth_no"),
                booth_suffix=b.get("booth_suffix") or "", is_postal=int(bool(b.get("is_postal"))),
                booth_name=b.get("booth_name") or "", electors=b.get("electors"),
                voters_male=b.get("voters_male"), voters_female=b.get("voters_female"),
                voters_other=b.get("voters_other"), voters_total=b.get("voters_total"),
                candidate_votes_total=s_all,
                nota=sum(v or 0 for v, c in zip(votes, cands) if c.get("is_nota")),
                rejected=b.get("rejected"), tendered=b.get("tendered"),
                file_total_valid=b.get("total_valid"), file_total=b.get("total"),
                sum_check={True: "match", False: "mismatch", None: "no_total_in_file"}[chk],
                winner=cands[win[1]]["name"] if win[1] is not None and win[0] > 0 else "",
                winner_party=cands[win[1]]["party_std"] if win[1] is not None and win[0] > 0 else "",
                winner_votes=win[0], runner_up=cands[run[1]]["name"] if run[1] is not None and run[0] > 0 else "",
                runner_up_party=cands[run[1]]["party_std"] if run[1] is not None and run[0] > 0 else "",
                margin=win[0] - run[0],
                data_note="; ".join(x for x in (b.get("ocr_fix"), b.get("booth_fix")) if x),
            ))
            for i, (c, v) in enumerate(zip(cands, votes)):
                totals[i] += v or 0
                long_rows[e].append((e, ac, acname, bid, i + 1, c["name"], c.get("party") or "", c["party_std"],
                                     "" if v is None else v))
        order = sorted(range(len(cands)), key=lambda i: -totals[i])
        for rank, i in enumerate(order, 1):
            c = cands[i]
            cand_rows.append(dict(election=e, ac_no=ac, ac_name=acname, candidate_sr=i + 1, candidate=c["name"],
                                  party=c.get("party") or "", party_std=c["party_std"], is_nota=int(bool(c.get("is_nota"))),
                                  total_votes=totals[i], rank=rank))
    write_outputs(long_rows, booth_rows, cand_rows, qrows, names)


LONG_HDR = ["election", "ac_no", "ac_name", "booth_id", "candidate_sr", "candidate", "party", "party_std", "votes"]


def write_csv_gz(path, header, rows):
    with gzip.open(path, "wt", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def write_outputs(long_rows, booth_rows, cand_rows, qrows, names):
    import pandas as pd
    os.makedirs(f"{OUT}/long", exist_ok=True)
    os.makedirs(f"{OUT}/excel", exist_ok=True)
    for e, rows in long_rows.items():
        write_csv_gz(f"{OUT}/long/UP_Form20_{e}_long.csv.gz", LONG_HDR, rows)
    bdf = pd.DataFrame(booth_rows)
    cdf = pd.DataFrame(cand_rows)
    qdf = pd.DataFrame(qrows)
    qcols = ["election", "ac_no", "ac_name", "district", "grade", "status", "n_booths", "max_booth_no", "booth_gaps",
             "duplicate_booths", "zero_vote_booths", "postal_row", "n_candidates", "has_nota", "total_votes",
             "booths_with_total_col", "sum_check_rate", "candidates_matching_file_total_row", "blank_vote_cells",
             "kruti_cells_converted", "parse_method", "sheet", "source_file", "alternate_files", "flags"]
    qdf = qdf.reindex(columns=qcols)
    bdf.to_csv(f"{OUT}/UP_Form20_booths.csv.gz", index=False, compression="gzip")
    cdf.to_csv(f"{OUT}/UP_Form20_candidates_ac_totals.csv", index=False)
    qdf.to_csv(f"{OUT}/UP_Form20_quality_report.csv", index=False)
    pd.DataFrame([dict(ac_no=a, ac_name=n, district=d) for a, (n, d) in sorted(names.items())]).to_csv(
        f"{OUT}/UP_assembly_constituencies.csv", index=False)
    # per-election Excel workbooks
    for e, etype, year in ELECTIONS:
        b = bdf[bdf.election == e]
        if b.empty:
            continue
        with pd.ExcelWriter(f"{OUT}/excel/UP_Form20_{e}.xlsx", engine="openpyxl") as xw:
            readme = pd.DataFrame({"About": [
                f"UP {etype} {year} - Form 20 booth-wise results (parsed from CEO UP files).",
                "Sheet 'booths': one row per polling station (booth_id; POSTAL = postal ballots).",
                "Sheet 'booth_votes_wide': candidate votes per booth, one column per candidate (C01, C02 ... see 'candidates').",
                "Sheet 'candidates': AC-level totals per candidate.",
                "Sheet 'quality': per-AC quality grade and flags. Grade A: >=98% booths add up to the file's own total; B: >=90% or a known systematic Total-column error; C/D: check flags.",
                "Long format (one row per booth x candidate) is in data/long/*.csv.gz and in the SQLite database.",
            ]})
            readme.to_excel(xw, sheet_name="README", index=False)
            b.pipe(xl_safe).to_excel(xw, sheet_name="booths", index=False)
            cdf[cdf.election == e].pipe(xl_safe).to_excel(xw, sheet_name="candidates", index=False)
            wide = []
            lr = long_rows[e]
            byb = collections.defaultdict(dict)
            for (_, ac, acn, bid, sr, nm, pr, ps, v) in lr:
                byb[(ac, acn, bid)][f"C{sr:02d}"] = v
            for (ac, acn, bid), d in byb.items():
                wide.append(dict(ac_no=ac, ac_name=acn, booth_id=bid, **d))
            wdf = pd.DataFrame(wide)
            wdf = wdf.reindex(columns=["ac_no", "ac_name", "booth_id"] + sorted(c for c in wdf.columns if c.startswith("C")))
            wdf.pipe(xl_safe).to_excel(xw, sheet_name="booth_votes_wide", index=False)
            qdf[qdf.election == e].pipe(xl_safe).to_excel(xw, sheet_name="quality", index=False)
    # quality workbook
    with pd.ExcelWriter(f"{OUT}/UP_Form20_quality_report.xlsx", engine="openpyxl") as xw:
        summ = qdf.groupby(["election", "grade"]).size().unstack(fill_value=0).reset_index()
        summ.pipe(xl_safe).to_excel(xw, sheet_name="summary", index=False)
        qdf.pipe(xl_safe).to_excel(xw, sheet_name="per_AC", index=False)
    # SQLite
    db = f"{OUT}/UP_Form20.sqlite"
    if os.path.exists(db):
        os.remove(db)
    con = sqlite3.connect(db)
    con.execute("CREATE TABLE elections(election TEXT PRIMARY KEY, type TEXT, year INT)")
    con.executemany("INSERT INTO elections VALUES (?,?,?)", ELECTIONS)
    con.execute("CREATE TABLE constituencies(ac_no INT PRIMARY KEY, ac_name TEXT, district TEXT)")
    con.executemany("INSERT INTO constituencies VALUES (?,?,?)", [(a, n, d) for a, (n, d) in sorted(names.items())])
    con.execute("""CREATE TABLE candidates(election TEXT, ac_no INT, candidate_sr INT, candidate TEXT, party TEXT,
                   party_std TEXT, is_nota INT, total_votes INT, rank INT, PRIMARY KEY(election, ac_no, candidate_sr))""")
    con.executemany("INSERT INTO candidates VALUES (?,?,?,?,?,?,?,?,?)",
                    [(c["election"], c["ac_no"], c["candidate_sr"], c["candidate"], c["party"], c["party_std"],
                      c["is_nota"], c["total_votes"], c["rank"]) for c in cand_rows])
    bcols = list(booth_rows[0].keys())
    con.execute(f"CREATE TABLE booths({', '.join(bcols)}, PRIMARY KEY(election, ac_no, booth_id))")
    con.executemany(f"INSERT INTO booths VALUES ({','.join('?' * len(bcols))})", [tuple(b[k] for k in bcols) for b in booth_rows])
    con.execute("""CREATE TABLE votes(election TEXT, ac_no INT, booth_id TEXT, candidate_sr INT, votes INT,
                   PRIMARY KEY(election, ac_no, booth_id, candidate_sr)) WITHOUT ROWID""")
    for e, rows in long_rows.items():
        con.executemany("INSERT INTO votes VALUES (?,?,?,?,?)",
                        [(r[0], r[1], r[3], r[4], None if r[8] == "" else r[8]) for r in rows])
    qcols_sql = [c for c in qcols]
    con.execute(f"CREATE TABLE quality({', '.join(qcols_sql)})")
    con.executemany(f"INSERT INTO quality VALUES ({','.join('?' * len(qcols_sql))})",
                    [tuple(None if (isinstance(v, float) and v != v) else (str(v) if isinstance(v, (list, dict)) else v)
                           for v in row) for row in qdf[qcols_sql].itertuples(index=False)])
    con.execute("""CREATE VIEW long AS SELECT v.election, v.ac_no, k.ac_name, v.booth_id, v.candidate_sr,
                   c.candidate, c.party, c.party_std, v.votes FROM votes v
                   JOIN candidates c USING(election, ac_no, candidate_sr)
                   LEFT JOIN constituencies k USING(ac_no)""")
    if os.path.exists("work/bye.csv"):
        import shutil
        bye = pd.read_csv("work/bye.csv")
        shutil.copy("work/bye.csv", f"{OUT}/UP_bye_elections_2013_2018_constituency_results.csv")
        bye.to_sql("bye_elections", con, index=False)
    con.commit()
    con.execute("VACUUM")
    con.close()
    print("booths", len(booth_rows), "candidates", len(cand_rows), "long", sum(len(v) for v in long_rows.values()))


if __name__ == "__main__":
    main()
