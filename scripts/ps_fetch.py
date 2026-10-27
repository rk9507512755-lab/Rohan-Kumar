"""Download and parse polling-station-list PDFs chosen from work/ps_pages.json.

Per district the newest list page is taken (pages titled "Search Results" only
if nothing else exists); `--page-rank N` takes the N-th ranked page instead.
Parsed output: work/ps_parsed/<district>__<file>.json
"""
import json
import os
import re
import sys
import time
from concurrent.futures import ProcessPoolExecutor

import requests

sys.path.insert(0, os.path.dirname(__file__))
from ps_parse import parse  # noqa: E402

RAW = "raw/ps_list"
OUT = "work/ps_parsed"
DOWNLOAD_ONLY = "--download-only" in sys.argv


def choose(pages, rank):
    real = [p for p in pages if not p["title"].startswith("Search Results")] or pages
    if rank == 0:
        return max(real, key=lambda p: (p["ym"], p["final"], p["n"]))
    return real[rank - 1] if rank - 1 < len(real) else None


def fetch(url, path, tries=5):
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return True
    for i in range(tries):
        try:
            r = requests.get(url, timeout=120)
            if r.status_code == 200 and r.content[:4] == b"%PDF":
                open(path, "wb").write(r.content)
                return True
            if r.status_code in (403, 404):
                return False
        except requests.RequestException:
            pass
        time.sleep(3 + 3 * i)
    return False


def job(args):
    dist, page, pdf = args
    url = pdf["url"]
    fn = re.sub(r"[^\w.-]", "_", url.rsplit("/", 1)[-1])
    os.makedirs(f"{RAW}/{dist}", exist_ok=True)
    path = f"{RAW}/{dist}/{fn}"
    out = f"{OUT}/{dist}__{fn}.json"
    if DOWNLOAD_ONLY:
        return dist, fn, "downloaded" if fetch(url, path) else "DOWNLOAD_FAILED"
    if os.path.exists(out):
        return dist, fn, "cached"
    rec = dict(district=dist, url=url, link_text=pdf["text"], page=page["page"], page_title=page["title"],
               page_ym=page["ym"], file=path)
    if not fetch(url, path):
        rec.update(status="DOWNLOAD_FAILED", rows=[])
    else:
        try:
            rec.update(parse(path))
        except Exception as e:  # noqa: BLE001
            rec.update(status="ERROR", error=repr(e)[:300], rows=[])
    json.dump(rec, open(out, "w"), ensure_ascii=False)
    return dist, fn, f"{rec['status']} ac={rec.get('ac_no')} rows={len(rec['rows'])}"


def main():
    rank = int(sys.argv[sys.argv.index("--page-rank") + 1]) if "--page-rank" in sys.argv else 0
    only = [a for a in sys.argv[1:] if not a.startswith("--") and not a.isdigit()]
    os.makedirs(OUT, exist_ok=True)
    pages = json.load(open("work/ps_pages.json"))
    jobs = []
    if "--fallback" in sys.argv:
        # districts with ACs still missing: also try the next-ranked list pages (2024 onwards)
        import pandas as pd
        from ps_build import slug
        cov = pd.read_csv("/home/user/rohan-kumar/data/polling_stations/coverage_by_ac.csv")
        need = {slug(d) for d in cov[cov.status != "OK"].district}
        for dist, ps in pages.items():
            if dist not in need:
                continue
            first = choose(ps, 0)
            extra = [p for p in ps if p is not first and p["ym"] >= 202401 and not p["title"].startswith("Search Results")][:3]
            for p in extra:
                jobs += [(dist, p, pdf) for pdf in p["pdfs"]]
        seen = set()
        jobs = [j for j in jobs if not (j[2]["url"] in seen or seen.add(j[2]["url"]))]
    for dist, ps in ([] if "--fallback" in sys.argv else pages.items()):
        if only and dist not in only:
            continue
        p = choose(ps, rank)
        if p:
            jobs += [(dist, p, pdf) for pdf in p["pdfs"]]
    print(len(jobs), "PDFs", flush=True)
    with ProcessPoolExecutor(12 if DOWNLOAD_ONLY else 8) as ex:
        for r in ex.map(job, jobs):
            print(*r, flush=True)


if __name__ == "__main__":
    main()
