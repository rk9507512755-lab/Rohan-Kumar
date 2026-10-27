"""Find polling-station-list PDFs on UP district (s3waas / *.nic.in) websites.

For every district site: fetch the home page, the DEO portal / election pages
and the WordPress search for polling-station keywords, follow post links that
look like polling station lists, and record every PDF link with its text.
Output: work/ps_links.json  [{district, page, page_title, text, url}]
"""
import html
import json
import re
import sys
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

import requests

DISTRICTS = """agra aligarh prayagraj ambedkarnagar amethi amroha auraiya azamgarh baghpat bahraich ballia
balrampur banda barabanki bareilly basti bijnor budaun bulandshahr chandauli chitrakoot deoria etah etawah
ayodhya farrukhabad fatehpur firozabad gbnagar ghaziabad ghazipur gonda gorakhpur hamirpur hapur hardoi
hathras jalaun jaunpur jhansi kannauj kanpurdehat kanpurnagar kasganj kaushambi kheri kushinagar lalitpur
lucknow maharajganj mahoba mainpuri mathura mau meerut mirzapur moradabad muzaffarnagar pilibhit pratapgarh
raebareli rampur saharanpur sambhal sknagar bhadohi shahjahanpur shamli shravasti siddharthnagar sitapur
sonbhadra sultanpur unnao varanasi""".split()

KW = re.compile(r"polling\s*station|polling\s*booth|\bPS\b|मतदेय|मतदान\s*केन्द्र|मतदान\s*स्थल|बूथ", re.I)
SKIP = re.compile(r"\.(jpg|jpeg|png|gif|css|js|svg|ico|woff2?|ttf|eot)(\?|$)|/wp-content/|/wp-json|#", re.I)
S = requests.Session()


def get(url, tries=5):
    for i in range(tries):
        try:
            r = S.get(url, timeout=40)
            if r.status_code == 200:
                return r.text
            if r.status_code in (403, 404, 410):
                return None
        except requests.RequestException:
            pass
        time.sleep(2 + 2 * i)
    return None


def links(page_html, base):
    out = []
    for m in re.finditer(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', page_html, re.S | re.I):
        href = html.unescape(m.group(1)).strip()
        text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", m.group(2)))).strip()
        out.append((urllib.parse.urljoin(base, href), text))
    return out


def title(page_html):
    m = re.search(r"<title>(.*?)</title>", page_html or "", re.S | re.I)
    return re.sub(r"\s+", " ", html.unescape(m.group(1))).strip() if m else ""


def crawl(d):
    root = f"https://{d}.nic.in/"
    seeds = [root, root + "deo-portal/", root + "election/", root + "elections/",
             root + "?s=polling+station", root + "?s=polling", root + "?s=" + urllib.parse.quote("मतदेय"),
             root + "document-category/election/", root + "document-category/election-document/"]
    seen, pdfs, queue = set(), [], []
    home = get(root)
    if home is None:
        return d, None
    for s in seeds:
        queue.append((s, 0))
    while queue:
        url, depth = queue.pop(0)
        if url in seen or len(seen) > 120:
            continue
        seen.add(url)
        page = home if url == root else get(url)
        if not page:
            continue
        pt = title(page)
        for u, t in links(page, url):
            host = urllib.parse.urlparse(u).netloc
            if u.lower().endswith(".pdf"):
                pdfs.append(dict(district=d, page=url, page_title=pt, text=t, url=u))
            elif host == f"{d}.nic.in" and not SKIP.search(u) and depth < 2 and (KW.search(t) or KW.search(urllib.parse.unquote(u))):
                queue.append((u.split("#")[0], depth + 1))
            elif host == f"{d}.nic.in" and "/page/" in u and depth < 2 and "?s=" in url:
                queue.append((u, depth + 1))
    return d, pdfs


def main():
    ds = sys.argv[1:] or DISTRICTS
    res = {}
    with ThreadPoolExecutor(8) as ex:
        for d, p in ex.map(crawl, ds):
            res[d] = p
            print(d, "UNREACHABLE" if p is None else len(p), flush=True)
    json.dump(res, open("work/ps_links.json", "w"), ensure_ascii=False, indent=0)


if __name__ == "__main__":
    main()
