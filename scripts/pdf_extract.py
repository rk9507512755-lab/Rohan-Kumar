"""Parse 2024 Lok Sabha Form-20 PDFs (text layer first, OCR fallback)."""
import json
import os
import re
import sys
from collections import defaultdict
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(__file__))
import fitz  # noqa: E402

from extract import booth_check, drop_constant_columns  # noqa: E402
from pdf_table import parse_page, table_from_pages, words_from_fitz  # noqa: E402

DIR = "raw/06_Lok_Sabha_2024"
OUT = "work/parsed_pdf"
AC_RE = re.compile(r"(?:segment|खण्ड|क्षेत्र|constituency)\D{0,15}?(\d{1,3})\s*[-–—.]\s*([A-Za-zऀ-ॿ][A-Za-zऀ-ॿ .()]{1,40})", re.I)


def page_ac(text):
    m = AC_RE.search(text)
    if m:
        return int(m.group(1)), m.group(2).strip()
    return None, None


def rate(res):
    v = [booth_check(b, res["candidates"]) for b in res["booths"]]
    v = [x for x in v if x is not None]
    return (sum(v) / len(v)) if v else 0.0


def parse_text_pdf(path):
    doc = fitz.open(path)
    by_ac = defaultdict(list)
    last_ac = None
    names = {}
    for pg in doc:
        ac, nm = page_ac(pg.get_text())
        if ac is None:
            ac = last_ac
        last_ac = ac
        if ac is not None and nm:
            names.setdefault(ac, nm)
        by_ac[ac].append(parse_page(words_from_fitz(pg)))
    out = {}
    for ac, pages in by_ac.items():
        res = table_from_pages(pages)
        if res:
            res = drop_constant_columns(res)
            res["ac_name_pdf"] = names.get(ac, "")
            out[ac] = res
    return out, len(doc)


def file_ac(fname):
    m = re.match(r"AC(\d+)", fname)
    return int(m.group(1)) if m else None


def run(fname):
    path = f"{DIR}/{fname}"
    try:
        results, npages = parse_text_pdf(path)
    except Exception as e:
        return [dict(file=fname, status="ERROR", error=repr(e)[:200])]
    fac = file_ac(fname)
    recs = []
    if fac is not None:
        # single-AC file: trust the file name; fold pages whose header said otherwise
        res = None
        for ac, r in results.items():
            if res is None or len(r["booths"]) > len(res["booths"]):
                res = r
        results = {fac: res} if res else {}
        if not results:
            results = {fac: None}
    for ac, res in results.items():
        rec = dict(election="LS2024", type="LS", year=2024, ac=ac, file=f"06_Lok_Sabha_2024/{fname}",
                   notes=[], source="pdf-text", pages=npages)
        if not res:
            rec["status"] = "NEEDS_OCR"
        else:
            r = rate(res)
            rec.update(status="OK" if r >= 0.9 else "NEEDS_OCR", check_rate=round(r, 3), layout="pdf",
                       sheet="", header=res.get("ac_name_pdf", ""),
                       candidates=res["candidates"], booths=res["booths"], totals=res["totals"],
                       columns=dict(pre={}, post=res["post"]), warnings=res["warnings"],
                       headers=res["headers"])
        recs.append(rec)
    return recs


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    files = sys.argv[1:] or sorted(os.listdir(DIR))
    with Pool(4) as pool:
        for recs in pool.imap_unordered(run, files):
            for rec in recs:
                ac = rec.get("ac")
                name = f"{OUT}/LS2024_AC{ac:03d}__{rec['file'].split('/')[-1]}.json" if ac else f"{OUT}/LS2024_unknown__{rec['file'].split('/')[-1]}.json"
                json.dump(rec, open(name, "w"), ensure_ascii=False)
                print(rec["file"], ac, rec["status"], rec.get("check_rate"), len(rec.get("booths", [])), flush=True)
