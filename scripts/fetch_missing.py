"""Download the Form-20 files that are missing from the Drive copy, straight
from their original source URLs (CEO UP / district portals), into raw/ so the
normal pipeline can pick them up.

Run this on a machine that can reach ceouttarpradesh.nic.in and
cdn.s3waas.gov.in (e.g. any normal internet connection in India):

    python3 scripts/fetch_missing.py              # files listed in data/missing/
    python3 scripts/fetch_missing.py --retry-404  # also retry URLs that were 404 in 2024-25

then: python3 -I scripts/extract.py; python3 -I scripts/pdf_extract.py;
      python3 -I scripts/ocr_extract.py; bash scripts/finalize.sh
"""
import csv
import os
import sys
import urllib.request

FOLDER = {"VS2012": "01_Vidhan_Sabha_2012", "LS2014": "02_Lok_Sabha_2014", "VS2017": "03_Vidhan_Sabha_2017",
          "LS2019": "04_Lok_Sabha_2019", "VS2022": "05_Vidhan_Sabha_2022", "LS2024": "06_Lok_Sabha_2024"}
WANT = {"DOWNLOADED_BUT_NOT_ON_DRIVE"}


def main():
    if "--retry-404" in sys.argv:
        WANT.add("NOT_ON_CEO_WEBSITE")
    rows = list(csv.DictReader(open("data/missing/missing_or_partial_ACs.csv", encoding="utf-8")))
    todo = [r for r in rows if r["category"] in WANT and r["source_url"]]
    print(len(todo), "files to fetch")
    ok = 0
    for r in todo:
        url = r["source_url"]
        ext = os.path.splitext(url)[1] or ".pdf"
        name = f"AC{int(r['ac_no']):03d}" + (f"_{r['ac_name'].replace(' ', '_')}" if r["election"] == "LS2024" and r["ac_name"] else "")
        dst = os.path.join("raw", FOLDER[r["election"]], name + ext)
        if os.path.exists(dst) and os.path.getsize(dst) > 0:
            continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            data = urllib.request.urlopen(req, timeout=120).read()
            if data[:5].lower().startswith(b"<!doc") or data[:5].lower().startswith(b"<html"):
                raise ValueError("got an HTML page, not a file")
            open(dst, "wb").write(data)
            ok += 1
            print("OK  ", r["election"], r["ac_no"], dst)
        except Exception as e:  # report and keep going
            print("FAIL", r["election"], r["ac_no"], url, e)
    print(f"downloaded {ok}/{len(todo)}")


if __name__ == "__main__":
    main()
