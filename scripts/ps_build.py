"""Assemble parsed polling-station lists into one table + coverage report.

AC of each PDF: number printed in the PDF > number in the link text > best
match of its location/building names against that district's Form-20 booth
names (VS2022). Several PDFs of one AC are concatenated when their PS numbers
do not overlap, otherwise the larger one is kept.
"""
import glob
import gzip
import json
import os
import re
import sys
from collections import Counter, defaultdict

import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from skeleton import skeletons  # noqa: E402
from ps_parse import fix_glyphs  # noqa: E402

REPO = sys.argv[1] if len(sys.argv) > 1 else "/home/user/rohan-kumar"
OUTDIR = f"{REPO}/data/polling_stations"

ALIAS = {"auriya": "auraiya", "badaun": "budaun", "lalitpurac": "lalitpur", "pratapgargh": "pratapgarh",
         "rampurs": "rampur", "shrawasti": "shravasti", "gautambuddhanagar": "gbnagar",
         "santkabirnagar": "sknagar", "raebareli": "raebareli", "ambedkarnagar": "ambedkarnagar"}


def slug(d):
    s = re.sub(r"[^a-z]", "", str(d).lower())
    return ALIAS.get(s, s)


def norm(s):
    s = str(s or "")
    s = re.sub(r"[़ँं]", "", s)  # nukta / anusvara variants
    s = re.sub(r"(प्रा|प्राथमिक|पू|पूर्व|उ|उच्च|मा|माध्यमिक|वि|विद्यालय|कक्ष|क|नं|संख्या|सं|भवन|कमरा|स्कूल|कम्पोजिट|संविलियन|"
               r"जूनियर|हाई|इण्टर|इंटर|कालेज|कॉलेज|बेसिक|नवीन|नया|मदरसा|पंचायत|घर|सामुदायिक|अंश|भाग)\b", " ", s)
    return re.sub(r"[\s0-9.\-–,()/&]+", " ", s).strip()


def tokens(s):
    return {t for t in skeletons(s) if len(t) >= 3}


def header_ac(path):
    import pymupdf
    from ps_parse import conv, is_kd_doc, page_ac
    try:
        doc = pymupdf.open(path)
    except Exception:  # noqa: BLE001
        return None
    kd = is_kd_doc(doc)
    for page in list(doc)[:2]:
        lines = [conv(ln, kd) for ln in page.get_text("text").splitlines()]
        ac = page_ac("\n".join(" ".join(lines[i:i + 4]) for i in range(0, min(len(lines), 60), 2)))
        if ac:
            return ac
    return None


def load_form20_names():
    b = pd.read_csv(f"{REPO}/data/UP_Form20_booths.csv.gz", usecols=["election", "ac_no", "is_postal", "booth_name"],
                    dtype={"booth_name": str}, low_memory=False)
    b = b[(b.election.isin(["VS2022", "LS2019", "VS2017"])) & (b.is_postal == 0)]
    names = defaultdict(Counter)
    for ac, nm in zip(b.ac_no, b.booth_name):
        for t in tokens(nm):
            names[int(ac)][t] += 1
    return names


def guess_ac_by_names(rows, cand_acs, names):
    """IDF-weighted overlap of place-name skeletons with each candidate AC's Form-20 booth names."""
    import math
    cand = [a for a in cand_acs if names.get(a)]
    if not cand:
        return None, {}
    df = Counter(t for a in cand for t in names[a])
    toks = {t for r in rows for t in tokens(fix_glyphs(f"{r.get('location', '')} {r.get('building', '')}"))}
    idf = {t: math.log((len(cand) + 1) / df[t]) for t in toks if df.get(t)}
    total = sum(math.log(len(cand) + 1) for _ in toks) or 1
    scores = {a: sum(w for t, w in idf.items() if t in names[a]) / total for a in cand}
    best = max(scores, key=scores.get)
    ranked = sorted(scores.values(), reverse=True)
    if scores[best] < 0.08 or (len(ranked) > 1 and ranked[0] < 1.8 * ranked[1]):
        return None, scores
    return best, scores


def main():
    acs = pd.read_csv(f"{REPO}/data/UP_assembly_constituencies.csv")
    acs["slug"] = acs.district.map(slug)
    dist_acs = acs.groupby("slug").ac_no.apply(list).to_dict()
    ac_name = dict(zip(acs.ac_no, acs.ac_name))
    ac_dist = dict(zip(acs.ac_no, acs.district))
    names = load_form20_names()
    files = []
    for f in sorted(glob.glob("work/ps_parsed/*.json")):
        r = json.load(open(f))
        cand = dist_acs.get(r["district"], [])
        m = re.search(r"(?<!\d)(\d{1,3})(?!\d)", r.get("link_text", ""))
        link_ac = int(m.group(1)) if m and 1 <= int(m.group(1)) <= 403 else None
        ac, how = r.get("ac_no"), "pdf_header"
        if ac and cand and ac not in cand and (r.get("ac_counts") or {}).get(str(ac), 0) < 3:
            ac, how = None, None
        if not ac and link_ac in cand:
            ac, how = link_ac, "link_text"
        hdr = None
        if not ac and r["rows"]:
            hdr = header_ac(r["file"])
            if hdr in cand:
                ac, how = hdr, "pdf_header"
        if not ac and r["rows"]:
            # district column of the AC list is not always right: also consider the numbers the file itself names
            wider = sorted(set(cand) | {a for a in (link_ac, hdr, r.get("ac_no")) if a})
            ac, sc = guess_ac_by_names(r["rows"], wider, names)
            how = "name_match" if ac else None
        r.update(ac=ac, ac_how=how)
        files.append(r)
    by_ac = defaultdict(list)
    for r in files:
        if r["status"] == "OK" and (len(r["rows"]) > 1300 or max(x["ps_no"] for x in r["rows"]) > 1300):
            r["status"] = "NOT_ONE_AC"  # district-wide serial numbers, not an AC list
        if r["ac"] and r["status"] == "OK":
            by_ac[r["ac"]].append(r)
    out_rows, report = [], []
    for ac in sorted(acs.ac_no):
        # one candidate list per source page (a page may split an AC over several PDFs)
        lists = defaultdict(list)
        for r in by_ac.get(ac, []):
            lists[r["page"]].append(r)
        options = []
        for page, fs in lists.items():
            fs = sorted(fs, key=lambda r: -len(r["rows"]))
            chosen, seen = [], set()
            for r in fs:
                nums = {x["ps_no"] for x in r["rows"]}
                if not chosen or (not (nums & seen) and not any(x.get("ps_no_inferred") for x in r["rows"])):
                    chosen.append(r)
                    seen |= nums
            n = max(seen) if seen else 0
            miss = (n - len(seen)) / max(1, n)
            options.append((miss <= 0.02 and n >= 50, fs[0]["page_ym"], -miss, chosen))
        chosen = max(options, key=lambda o: o[:3])[3] if options else []
        rows = [dict(x, _src=r) for r in chosen for x in r["rows"]]
        rows.sort(key=lambda x: x["ps_no"])
        nums = [x["ps_no"] for x in rows]
        n = max(nums) if nums else 0
        gaps = sorted(set(range(1, n + 1)) - set(nums)) if n else []
        dups = [k for k, v in Counter(nums).items() if v > 1]
        for x in rows:
            src = x.pop("_src")
            out_rows.append(dict(district=ac_dist[ac], ac_no=ac, ac_name=ac_name[ac], ps_no=x["ps_no"],
                                 ps_no_inferred=bool(x.get("ps_no_inferred")), location=fix_glyphs(x.get("location", "")),
                                 building=fix_glyphs(x.get("building", "")), area=fix_glyphs(x.get("area", "")),
                                 voters_for=x.get("voters_for", ""), electors=x.get("electors"),
                                 tehsil_block_zone=x.get("group") or "", list_title=src["page_title"].split("|")[0].strip(),
                                 list_upload=f"{src['page_ym'] // 100}-{src['page_ym'] % 100:02d}",
                                 source_url=src["url"], source_page=x["page"]))
        status = "OK" if rows and not gaps and not dups else ("PARTIAL" if rows else "MISSING")
        report.append(dict(ac_no=ac, ac_name=ac_name[ac], district=ac_dist[ac], status=status, polling_stations=len(rows),
                           max_ps_no=n, gaps=len(gaps), gap_list=" ".join(map(str, gaps[:30])),
                           duplicates=len(dups), with_electors=sum(1 for x in rows if x.get("electors")),
                           ps_no_inferred=any(x.get("ps_no_inferred") for x in rows),
                           ac_identified_by=",".join(sorted({r["ac_how"] for r in chosen})) if chosen else "",
                           files=len(chosen), lists_available=len(lists),
                           list_upload=f"{chosen[0]['page_ym'] // 100}-{chosen[0]['page_ym'] % 100:02d}" if chosen else "",
                           source_urls=" ".join(r["url"] for r in chosen)))
    os.makedirs(OUTDIR, exist_ok=True)
    df = pd.DataFrame(out_rows)
    with gzip.open(f"{OUTDIR}/UP_polling_stations_2026.csv.gz", "wt", encoding="utf-8") as fh:
        df.to_csv(fh, index=False)
    rep = pd.DataFrame(report)
    rep.to_csv(f"{OUTDIR}/coverage_by_ac.csv", index=False)
    unassigned = [dict(district=r["district"], status=r["status"], rows=len(r["rows"]), link_text=r["link_text"],
                       page_title=r["page_title"], url=r["url"]) for r in files if not r["ac"] or r["status"] != "OK"]
    pd.DataFrame(unassigned).to_csv(f"{OUTDIR}/files_not_used.csv", index=False)
    print(rep.status.value_counts().to_string())
    print("rows", len(df), "with electors", int(df.electors.notna().sum()) if len(df) else 0)


if __name__ == "__main__":
    main()
