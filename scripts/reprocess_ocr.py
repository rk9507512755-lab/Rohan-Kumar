"""Rebuild OCR'd 2024 tables from the raw cells saved in each OCR record
(after parser improvements), without running OCR again."""
import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from extract import booth_check, drop_constant_columns  # noqa: E402
from pdf_table import table_from_pages  # noqa: E402


def rate(res):
    v = [booth_check(b, res["candidates"]) for b in res["booths"]]
    v = [x for x in v if x is not None]
    return sum(v) / len(v) if v else 0.0


def main(paths):
    for p in paths:
        R = json.load(open(p))
        if R.get("status") != "OK" or not R.get("raw_pages"):
            continue
        pages = []
        for rp in R["raw_pages"]:
            if not rp:
                pages.append(None)
                continue
            hdrs = rp[-1].get("headers", [])
            rows = [dict(cells={int(k): v for k, v in r["cells"].items()}, is_data=r["is_data"],
                         label="" if r["is_data"] else "total", knn=r.get("knn")) for r in rp[:-1]]
            pages.append(dict(columns=[dict(header=h) for h in hdrs], rows=rows))
        res = table_from_pages(pages)
        if not res:
            continue
        res = drop_constant_columns(res)
        new = rate(res)
        old = R.get("check_rate") or 0
        if new > old + 0.01:
            for b in res["booths"]:
                b.pop("_src", None)
            R.update(candidates=[{k: x for k, x in c.items() if k != "col"} for c in res["candidates"]],
                     booths=res["booths"], totals=res["totals"], columns=dict(pre={}, post=res["post"]),
                     warnings=res["warnings"], headers=res["headers"], check_rate=round(new, 3))
            R.setdefault("notes", []).append("table rebuilt from saved OCR cells with improved column inference")
            json.dump(R, open(p, "w"), ensure_ascii=False)
            print(f"{R['file']}: {old} -> {new:.3f} ({len(res['booths'])} booths)")


if __name__ == "__main__":
    main(sys.argv[1:] or sorted(glob.glob("work/parsed_ocr/*.json")))
