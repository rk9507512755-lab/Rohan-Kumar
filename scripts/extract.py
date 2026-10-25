"""Parse every Excel Form-20 file into a normalized JSON per (election, AC)."""
import json
import os
import re
import sys
import traceback
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(__file__))
from loader import load_book  # noqa: E402
from parse_rounds import parse_rounds  # noqa: E402
from parse_simple import parse_simple  # noqa: E402
from parse_triplet import parse_triplet  # noqa: E402
from parse_wide import clean_name, is_num, to_int  # noqa: E402

RAW = "raw"
OUT = "work/parsed"
ELECTIONS = {
    "01_Vidhan_Sabha_2012": ("VS2012", "VS", 2012),
    "02_Lok_Sabha_2014": ("LS2014", "LS", 2014),
    "03_Vidhan_Sabha_2017": ("VS2017", "VS", 2017),
    "04_Lok_Sabha_2019": ("LS2019", "LS", 2019),
    "05_Vidhan_Sabha_2022": ("VS2022", "VS", 2022),
}


def booth_check(b, cands):
    """None if the file gives no total to compare, else whether the
    candidate votes add up to one of the reported totals."""
    reported = [b.get(k) for k in ("total", "total_valid", "voters_total") if b.get(k) is not None]
    if not reported:
        return None
    s_all = sum(v or 0 for v in b["votes"])
    s_cand = sum(v or 0 for v, c in zip(b["votes"], cands) if not c.get("is_nota"))
    rej = b.get("rejected") or 0
    ok = {s_all, s_cand, s_all + rej, s_cand + rej}
    return any(t in ok for t in reported)


def check_rate(res):
    v = [booth_check(b, res["candidates"]) for b in res["booths"]]
    v = [x for x in v if x is not None]
    return sum(v) / len(v) if v else None


def score(res):
    if not res:
        return -1
    good = 0
    for b in res["booths"]:
        s = sum(v or 0 for v in b["votes"])
        if s == 0:
            continue
        good += {True: 1.0, None: 1.0, False: 0.6}[booth_check(b, res["candidates"])]
    named = sum(1 for c in res["candidates"] if c["name"]) / max(1, len(res["candidates"]))
    return good * (0.5 + 0.5 * named)


def booth_key(b):
    return ("P",) if b.get("is_postal") else (b["booth_no"], b["booth_suffix"])


def norm(n):
    return re.sub(r"[^a-zऀ-ॿ]", "", (n or "").lower())


def party_lookup(sheets):
    """Read candidate -> party from Form-21E / candidate-list style sheets."""
    out = {}
    for sh in sheets:
        for r, row in enumerate(sh.rows[:40]):
            low = [x.lower() for x in row]
            pc = next((c for c, x in enumerate(low) if re.search(r"party|दल|पार्टी", x) and len(x) < 40), None)
            nc = next((c for c, x in enumerate(low) if re.search(r"name of|candidate|अभ्यर्थी|प्रत्याशी|उम्मीदवार", x) and len(x) < 40), None)
            if pc is None or nc is None or pc == nc:
                continue
            for row2 in sh.rows[r + 1:r + 60]:
                n, p = row2[nc], row2[pc]
                if n and p and not is_num(n) and not is_num(p):
                    out.setdefault(norm(clean_name(n)), p)
            break
    return out


def same_votes(a, b):
    """True when b repeats candidates already in a (e.g. Hindi + English copy)."""
    def sums(r):
        return [sum(bb["votes"][i] or 0 for bb in r["booths"]) for i in range(len(r["candidates"]))]
    sa, sb = set(sums(a)), sums(b)
    return sum(1 for x in sb if x in sa) >= 0.5 * len(sb)


def drop_constant_columns(res):
    """Remove 'candidate' columns that are really S.No / party-code columns:
    the same non-zero number at (almost) every polling station."""
    if not res or len(res["booths"]) < 10:
        return res
    keep = []
    for i, c in enumerate(res["candidates"]):
        vals = [b["votes"][i] for b in res["booths"] if not b.get("is_postal")]
        vals = [v for v in vals if v is not None]
        if vals:
            top, cnt = max(((v, vals.count(v)) for v in set(vals)), key=lambda x: x[1])
            if top != 0 and cnt >= 0.9 * len(vals):
                continue
        keep.append(i)
    if len(keep) == len(res["candidates"]):
        return res
    res["warnings"] = res.get("warnings", []) + [
        f"dropped {len(res['candidates']) - len(keep)} constant-valued column(s) (serial numbers)"]
    res["candidates"] = [res["candidates"][i] for i in keep]
    for b in res["booths"]:
        b["votes"] = [b["votes"][i] for i in keep]
    for t in res.get("totals", []):
        t["votes"] = [t["votes"][i] for i in keep]
    return res


def drop_total_like_columns(res):
    """A 'candidate' column that equals the sum of the other candidates (or the
    row Total) in most booths is a misplaced total column (seen in the NOTA
    slot of some files)."""
    if not res or len(res["booths"]) < 10 or len(res["candidates"]) < 3:
        return res
    nb = [b for b in res["booths"] if not b.get("is_postal")]
    drop = []
    for i, c in enumerate(res["candidates"]):
        hit = n = 0
        for b in nb:
            v = b["votes"][i]
            if not v:
                continue
            n += 1
            rest = sum(x or 0 for j, x in enumerate(b["votes"]) if j != i)
            if v == rest or v == b.get("total") or v == b.get("total_valid"):
                hit += 1
        if n >= 10 and hit >= 0.8 * n:
            drop.append(i)
    if not drop or len(drop) >= len(res["candidates"]) - 1:
        return res
    names = ", ".join(res["candidates"][i]["name"] or f"#{i + 1}" for i in drop)
    res["warnings"] = res.get("warnings", []) + [
        f"column '{names}' holds row totals, not votes - removed" + (" (NOTA votes not available in file)" if any(res["candidates"][i].get("is_nota") for i in drop) else "")]
    keep = [i for i in range(len(res["candidates"])) if i not in drop]
    res["candidates"] = [res["candidates"][i] for i in keep]
    for b in res["booths"]:
        b["votes"] = [b["votes"][i] for i in keep]
    for t in res.get("totals", []):
        if len(t.get("votes", [])) == len(keep) + len(drop):
            t["votes"] = [t["votes"][i] for i in keep]
    return res


def combine(results):
    """Pick the best sheet result; append sibling parts (same candidates,
    new booths) or merge column-split sheets (same booths, new candidates)."""
    results = [drop_total_like_columns(drop_constant_columns(r)) for r in results if r and len(r["booths"]) >= 2]
    results = [r for r in results if len(r["candidates"]) >= 2]
    if not results:
        return None
    results.sort(key=score, reverse=True)
    best = results[0]
    names = [norm(c["name"]) for c in best["candidates"]]
    keys = {booth_key(b) for b in best["booths"]}
    notes = []
    for other in results[1:]:
        onames = [norm(c["name"]) for c in other["candidates"]]
        okeys = {booth_key(b) for b in other["booths"]}
        if onames == names and not (okeys & keys):
            best["booths"].extend(other["booths"])
            keys |= okeys
            notes.append("combined booths from several sheets")
        elif len(okeys & keys) >= 0.9 * len(okeys) and not (set(onames) & set(names)) and all(onames) \
                and not same_votes(best, other):
            idx = {booth_key(b): b for b in other["booths"]}
            import copy
            trial = copy.deepcopy(best)
            for b in trial["booths"]:
                ob = idx.get(booth_key(b))
                b["votes"] = b["votes"] + (ob["votes"] if ob else [None] * len(onames))
            trial["candidates"] = trial["candidates"] + other["candidates"]
            before, after = check_rate(best), check_rate(trial)
            if before is not None and (after is None or after <= before):
                continue
            best = trial
            names += onames
            notes.append("merged candidate columns split across sheets")
    best["warnings"] = best.get("warnings", []) + sorted(set(notes))
    return best


SHEET_AC = re.compile(r"^\s*(?:a\.?\s*c\.?[\s_-]*(?:no\.?)?\s*)?0*(\d{1,3})(?!\d)", re.I)


def sheet_ac(name):
    if re.match(r"^\s*(r\d|round|table|sheet|page|part|भाग)", name, re.I):
        return None
    m = SHEET_AC.match(name)
    return int(m.group(1)) if m and 1 <= int(m.group(1)) <= 403 else None


def header_text(sheets):
    for sh in sheets:
        t = " ".join(x for row in sh.rows[:7] for x in row if x)
        if t:
            return t[:600]
    return ""


def process(path):
    folder, fname = path.split("/")[-2:]
    eid, etype, year = ELECTIONS[folder]
    ac = int(re.search(r"AC(\d+)", fname).group(1))
    rec = dict(election=eid, type=etype, year=year, ac=ac, file=f"{folder}/{fname}", notes=[])
    try:
        sheets, notes = load_book(path)
        rec["notes"] += notes
        rec["kruti_cells"] = sum(s.kd_cells for s in sheets)
        rec["kruti_heuristic_cells"] = sum(s.kd_heuristic for s in sheets)
        from parse_wide import parse_wide
        numbered = {sh.name: sheet_ac(sh.name) for sh in sheets}
        mine = [sh for sh in sheets if numbered[sh.name] == ac]
        others_numbered = {v for v in numbered.values() if v and v != ac}
        use_sheets = sheets
        if mine and len(mine) < len(sheets):
            use_sheets = mine
            rec["notes"].append(f"used sheet '{mine[0].name}' named after this AC")
        elif not mine and len(others_numbered) >= 2:
            rec["notes"].append("workbook holds sheets for other ACs only (" +
                                ", ".join(str(x) for x in sorted(others_numbered)) + ")")
        cands = []
        for sh in use_sheets:
            if sh.nrows < 4:
                continue
            for fn in (parse_wide, parse_simple, parse_triplet):
                try:
                    r = fn(sh)
                except Exception as e:  # keep going with other parsers
                    rec["notes"].append(f"{fn.__name__} failed on sheet {sh.name}: {e!r}"[:200])
                    r = None
                if r:
                    r["sheet"] = sh.name
                    cands.append(r)
        res = combine(cands)
        if (res is None or score(res) < 5) and use_sheets is not sheets:
            cands = []
            for sh in sheets:
                if sh.nrows < 4:
                    continue
                for fn in (parse_wide, parse_simple, parse_triplet):
                    try:
                        r = fn(sh)
                    except Exception:
                        r = None
                    if r:
                        r["sheet"] = sh.name
                        cands.append(r)
            res = combine(cands)
            rec["notes"].append("sheet named after this AC had no usable table; used other sheets")
        if res is None or score(res) < 5:
            rr = parse_rounds(sheets)
            if rr and score(rr) > score(res):
                rr["sheet"] = "round-wise sheets"
                res = rr
        if res is None:
            rec["status"] = "NO_TABLE_FOUND"
            return rec
        parties = party_lookup(sheets)
        filled = 0
        for c in res["candidates"]:
            if not c.get("party") and c["name"]:
                p = parties.get(norm(c["name"]))
                if p:
                    c["party"] = p
                    filled += 1
        if filled:
            rec["notes"].append(f"party filled from candidate list sheet for {filled} candidates")
        rec.update(
            status="OK",
            layout=res["layout"],
            sheet=res.get("sheet"),
            header=header_text(sheets),
            candidates=[dict(name=c["name"], party=c.get("party", ""), is_nota=c.get("is_nota", False))
                        for c in res["candidates"]],
            booths=[{k: v for k, v in b.items() if k != "src_row"} for b in res["booths"]],
            totals=res.get("totals", []),
            columns=dict(pre=res.get("pre", {}), post=res.get("post", {})),
            warnings=res.get("warnings", []),
        )
    except Exception as e:
        rec["status"] = "ERROR"
        rec["error"] = repr(e)[:300]
        rec["trace"] = traceback.format_exc()[-800:]
    return rec


def run(path):
    rec = process(path)
    out = f"{OUT}/{rec['election']}_AC{rec['ac']:03d}.json"
    with open(out, "w") as f:
        json.dump(rec, f, ensure_ascii=False)
    return rec["file"], rec["status"], len(rec.get("booths", [])), rec.get("layout")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    args = sys.argv[1:]
    if args:
        files = args
    else:
        files = [f"{RAW}/{d}/{f}" for d in ELECTIONS for f in sorted(os.listdir(f"{RAW}/{d}"))]
    with Pool(4) as pool:
        for r in pool.imap_unordered(run, files, chunksize=2):
            if r[1] != "OK" or len(args) < 20:
                print(*r, flush=True)
