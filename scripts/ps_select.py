"""Rank pages of polling-station-list PDFs per district (newest, final first)."""
import json
import re
import sys
from collections import defaultdict

KW = re.compile(r"polling\s*station|polling\s*booth|मतदेय|मतदान\s*केन्द्र|मतदान\s*स्थल|\bPS\b", re.I)
BAD = re.compile(r"voter|मतदाता\s*सूची|ASD|ए\.एस\.डी|BLO|graduate|teacher|स्नातक|शिक्षक|MLC|panchayat|पंचायत|nikay|निकाय|"
                 r"municipal|नगर\s*निगम|e-?roll|photo|BLA|sector|सेक्टर|zonal|magistrate|webcast|vulnerab|critical|"
                 r"press|प्रेस|minutes|बैठक|meeting|objection|आपत्ति|rationali|form", re.I)


def upload_ym(url):
    m = re.search(r"/uploads/(\d{4})/(\d{2})/", url)
    return int(m.group(1)) * 100 + int(m.group(2)) if m else 0


def main():
    d = json.load(open("work/ps_links.json"))
    pages = defaultdict(dict)
    for dist, ls in d.items():
        for lk in ls or []:
            ctx = lk["text"] + " " + lk["page_title"] + " " + lk["page"]
            if KW.search(ctx) and not BAD.search(lk["page_title"] + " " + lk["text"]):
                pages[(dist, lk["page"], lk["page_title"])][lk["url"]] = lk["text"]
    ranked = defaultdict(list)
    for (dist, page, title), urls in pages.items():
        ym = sorted(upload_ym(u) for u in urls)[len(urls) // 2]
        final = bool(re.search(r"final|अंतिम|अन्तिम", title + page, re.I))
        ranked[dist].append(dict(page=page, title=title, ym=ym, final=final, n=len(urls),
                                 pdfs=[dict(url=u, text=t) for u, t in urls.items()]))
    for dist in ranked:
        ranked[dist].sort(key=lambda p: (p["ym"] // 100, p["final"], p["ym"]), reverse=True)
    json.dump(ranked, open("work/ps_pages.json", "w"), ensure_ascii=False, indent=0)
    for dist, ps in sorted(ranked.items()):
        for p in ps[:3]:
            print(dist, p["ym"], "F" if p["final"] else "-", p["n"], p["title"][:70], sep=" | ")


if __name__ == "__main__":
    main()
