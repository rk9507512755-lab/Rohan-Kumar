"""OCR the 2024 Form-20 PDFs whose text layer is missing or unreliable."""
import json
import os
import re
import sys
import time
import traceback

os.environ.setdefault("OMP_THREAD_LIMIT", "1")
sys.path.insert(0, os.path.dirname(__file__))
from multiprocessing import Pool  # noqa: E402

import fitz  # noqa: E402

from extract import booth_check  # noqa: E402
from collections import Counter  # noqa: E402

from glyph_knn import knn_refine  # noqa: E402
from ocr import render  # noqa: E402
from pdf_ocr import band_words, first_col_score, ocr_grid_page, page_quality, prepare_page, reocr_cell, rotation_scores  # noqa: E402
from pdf_table import _int, table_from_pages  # noqa: E402

DIR = "raw/06_Lok_Sabha_2024"
OUT = "work/parsed_ocr"


def repair(res):
    """Re-OCR cells of rows that fail the sum check; impute a single
    unreadable candidate cell from the row total (flagged)."""
    kinds = res["kinds"]
    cand_cols = [c["col"] for c in res["candidates"]]
    tv_col = kinds.index("total_valid") if "total_valid" in kinds else None
    fixed = imputed = 0
    failing = [b for b in res["booths"] if booth_check(b, res["candidates"]) is False and "_src" in b]
    if len(failing) > 0.5 * max(1, len(res["booths"])):
        return 0, 0
    for b in failing[:150]:
        pi, (band,) = b["_src"]
        ctx = res["use_pages"][pi]["ctx"]
        new = []
        for v, cc in zip(b["votes"], cand_cols):
            t = reocr_cell(ctx, band, cc)
            new.append(_int(t) if t is not None else v)
        tv = b.get("total_valid")
        if tv_col is not None:
            t = reocr_cell(ctx, band, tv_col)
            tv2 = _int(t) if t is not None else tv
        else:
            tv2 = tv
        trial = dict(b, votes=new, total_valid=tv2)
        if booth_check(trial, res["candidates"]):
            b["votes"], b["total_valid"] = new, tv2
            b["ocr_fix"] = "cell re-OCR"
            fixed += 1
            continue
        missing = [i for i, v in enumerate(new) if v is None]
        nota_i = [i for i, c in enumerate(res["candidates"]) if c["is_nota"]]
        if len(missing) == 1 and tv2 is not None:
            known = sum(v for i, v in enumerate(new) if v is not None and i not in nota_i)
            i = missing[0]
            val = tv2 - known if i not in nota_i else None
            if val is not None and val >= 0:
                new[i] = val
                b["votes"], b["total_valid"] = new, tv2
                b["ocr_fix"] = f"imputed candidate #{i + 1} from total"
                imputed += 1
    return fixed, imputed


def run(fname):
    t0 = time.time()
    path = f"{DIR}/{fname}"
    m = re.match(r"AC(\d+)", fname)
    ac = int(m.group(1)) if m else None
    rec = dict(election="LS2024", type="LS", year=2024, ac=ac, file=f"06_Lok_Sabha_2024/{fname}",
               notes=[], source="ocr")
    try:
        doc = fitz.open(path)
        prepared, first_try = [], []
        rot_votes = Counter()
        for pg in doc:
            raw = render(pg)
            sc = rotation_scores(raw)
            order = sorted(sc, key=sc.get, reverse=True)
            preps = {}
            seq = {}
            for r in order:
                preps[r] = prepare_page(pg, rot=r, img=raw)
                seq[r] = first_col_score(preps[r])
                if seq[r] >= 8:
                    break
            ranked = sorted(preps, key=lambda r: (seq[r], -order.index(r)), reverse=True)
            if seq[ranked[0]] < 3 and rot_votes:
                common = rot_votes.most_common(1)[0][0]
                if common not in preps:
                    preps[common] = prepare_page(pg, rot=common, img=raw)
                ranked = [common] + [r for r in ranked if r != common]
            best = None
            for r in ranked[:2]:
                prep = preps[r]
                pq, pinfo = ocr_grid_page(pg, prepared=prep, want_header=len(prepared) < 2)
                q = page_quality(pq)
                if pq is not None and q < 0.9:
                    knn_refine([pq])
                    q = page_quality(pq)
                if best is None or q > best[0]:
                    best = (q, prep, pq, pinfo)
                if q >= 0.5:
                    break
            prepared.append(best[1])
            if best[0] >= 0.5:
                rot_votes[best[1][3]["rot"]] += 1
            first_try.append((best[2], best[3], best[0]))
        good = [i for i, ft in enumerate(first_try) if ft[2] >= 0.5]
        pool = good if good else list(range(len(prepared)))
        counts = Counter(len(prepared[i][2]) for i in pool if len(prepared[i][2]) >= 6 and len(prepared[i][1]) >= 6)
        ref = None
        if counts:
            m = counts.most_common(1)[0][0]
            norms = []
            for i in pool:
                img, ys, xs, info = prepared[i]
                if len(xs) == m:
                    x0, x1 = xs[0], xs[-1]
                    norms.append([(x - x0) / (x1 - x0) for x in xs])
            ref = [sorted(v)[len(v) // 2] for v in zip(*norms)]
        pages, infos = [], []
        got_header = 0
        for pi, (pg, prep) in enumerate(zip(doc, prepared)):
            img, ys, xs, info = prep
            override = None
            if ref and len(xs) != len(ref) and info.get("ext") and first_try[pi][2] < 0.5:
                x0, x1 = info["ext"]
                if len(xs) >= 2 and abs(xs[0] - x0) < 40 and abs(xs[-1] - x1) < 40:
                    x0, x1 = xs[0], xs[-1]
                override = [int(x0 + r * (x1 - x0)) for r in ref]
            if override is None:
                p, info = first_try[pi][0], dict(first_try[pi][1], page_quality=round(first_try[pi][2], 2))
            else:
                p, info = ocr_grid_page(pg, prepared=prep, xs_override=override, want_header=got_header < 2)
            if p is not None and sum(1 for c in p["columns"] if c["header"]) >= len(p["columns"]) / 2:
                got_header += 1
            infos.append(info)
            pages.append(p)
        kfix, _ = knn_refine([p for p in pages if p])
        rec["notes"].append(f"OCR: {kfix} rows corrected by self-trained digit reader")
        res = table_from_pages(pages)
        if not res:
            rec.update(status="OCR_FAILED", page_info=infos)
        else:
            fixed, imputed = repair(res)
            v = [booth_check(b, res["candidates"]) for b in res["booths"]]
            v = [x for x in v if x is not None]
            rate = sum(v) / len(v) if v else 0.0
            for b in res["booths"]:
                b.pop("_src", None)
            rec["raw_pages"] = [[{"cells": {str(k): v for k, v in r["cells"].items()}, "is_data": r["is_data"],
                                  "knn": bool(r.get("knn"))}
                                 for r in p["rows"]] + [{"headers": [c["header"] for c in p["columns"]]}]
                                if p else None for p in pages]
            if rate < 0.5:
                # fallback: OCR whole row bands and cluster columns by word position
                from pdf_table import parse_page
                bpages = [parse_page(band_words(prep), min_numeric=5) for prep in prepared]
                res2 = table_from_pages(bpages)
                if res2:
                    v2 = [booth_check(b, res2["candidates"]) for b in res2["booths"]]
                    v2 = [x for x in v2 if x is not None]
                    rate2 = sum(v2) / len(v2) if v2 else 0.0
                    if rate2 > rate:
                        res, rate = res2, rate2
                        rec["notes"].append("OCR: rows read as whole bands (column rules not detectable)")
                        for b in res["booths"]:
                            b.pop("_src", None)
                        rec["raw_pages"] = [[{"cells": {str(k): v for k, v in r["cells"].items()}, "is_data": r["is_data"]}
                                             for r in p["rows"]] + [{"headers": [c["header"] for c in p["columns"]]}]
                                            if p else None for p in bpages]
            rec.update(status="OK", check_rate=round(rate, 3), layout="pdf-ocr", sheet="", header="",
                       candidates=[{k: x for k, x in c.items() if k != "col"} for c in res["candidates"]],
                       booths=res["booths"], totals=res["totals"],
                       columns=dict(pre={}, post=res["post"]), warnings=res["warnings"],
                       headers=res["headers"], page_info=infos)
            rec["notes"].append(f"OCR: {fixed} rows fixed by cell re-OCR, {imputed} single cells imputed from row total")
    except Exception as e:
        rec.update(status="ERROR", error=repr(e)[:300], trace=traceback.format_exc()[-600:])
    rec["secs"] = round(time.time() - t0)
    out = f"{OUT}/LS2024_AC{ac or 0:03d}__{fname}.json"
    json.dump(rec, open(out, "w"), ensure_ascii=False)
    return fname, rec["status"], rec.get("check_rate"), len(rec.get("booths", [])), rec["secs"]


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    files = sys.argv[1:] or json.load(open("work/ocr_queue.json"))
    done = {f.split("__", 1)[1][:-5] for f in os.listdir(OUT)}
    files = [f for f in files if f not in done]
    with Pool(4) as pool:
        for r in pool.imap_unordered(run, files):
            print(*r, flush=True)
