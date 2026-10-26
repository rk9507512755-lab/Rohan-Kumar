"""Map raw party strings (abbreviations, full names, Hindi) to short codes."""
import re

RULES = [
    # election symbols written instead of party names
    ("BSP", r"^\W*(हाथी|elephant)\W*$"),
    ("SP", r"^\W*(साइकिल|साईकिल|cycle|bicycle)\W*$"),
    ("BJP", r"^\W*(कमल|कमल का फूल|lotus)\W*$"),
    ("INC", r"^\W*(हाथ का पंजा|हाथ|पंजा|hand)\W*$"),
    ("RLD", r"^\W*(हैण्ड ?पम्प|हैंड ?पंप|hand ?pump)\W*$"),
    ("NOTA", r"\bnota\b|none of the above|नोटा|इनमें से कोई नहीं|उपरोक्त में से कोई नहीं"),
    ("IND", r"^ind\.*$|^ind\.?\s|independ|indepen\s*dent|निर्दलीय|स्वतंत्र|^निर्द"),
    ("BJP", r"bh?ara?t[iy]+a\s*jan?a?ta\s*part|^b\.?\s*j\.?\s*p\.?$|भारतीय जनता|भाजपा"),
    ("SP", r"^samajwadi\s*party$|^samjwadi\s*party$|^s\.?p\.?$|^समाजवादी पार्टी$|^सपा$|^samajwadi$"),
    ("BSP", r"bahu?jan\s*samaj\s*party|bahujn samaj|^b\.?s\.?p\.?$|बहुजन समाज पार्टी|^बसपा$"),
    ("INC", r"indian\s*national\s*congress|^inc\.?$|^i\.?n\.?c\.?$|^congress$|इंडियन नेशनल कांग्रेस|भारतीय राष्ट्रीय कांग्रेस|^कांग्रेस$|^काँग्रेस$"),
    ("RLD", r"rashtriya\s*lok\s*dal|^rld$|राष्ट्रीय लोक दल|रालोद"),
    ("ADAL", r"apa?na\s*dal|^ad$|^ad\s*\(s\)$|^adal$|अपना दल"),
    ("AAP", r"aam\s*aadmi|aam\s*admi|^aap$|आम आदमी"),
    ("AIMIM", r"majlis|aimim|मजलिस"),
    ("PECP", r"peace\s*party|^pp$|^pecp$|पीस पार्टी"),
    ("SBSP", r"suheldev|^sbsp$|सुहेलदेव"),
    ("NISHAD", r"nishad|निषाद"),
    ("CPI(M)", r"marxist(?!.*leninist)|cpi\s*\(\s*m\s*\)$|^cpm$|मार्क्सवादी"),
    ("CPI(ML)L", r"leninist|cpi\s*\(\s*m\s*-?\s*l|liberation|libration"),
    ("CPI", r"^communist\s*party\s*of\s*india$|^cpi$|भारतीय कम्युनिस्ट पार्टी$"),
    ("AITC", r"trinamool|trinmul|^aitc$|तृणमूल"),
    ("NCP", r"nationalist\s*congress|^ncp$|राष्ट्रवादी कांग्रेस"),
    ("JD(U)", r"janata\s*dal\s*\(?\s*united|jd\s*\(?u\)?|जनता दल \(यूनाइटेड\)"),
    ("LJP", r"lok\s*jan\s*shakti|^ljp$|लोक जन शक्ति"),
    ("BMP", r"bahujan\s*mukti|^bmp$|बहुजन मुक्ति"),
    ("JAP", r"jan\s*adhikar|^jap$|जन अधिकार"),
    ("SHS", r"shiv\s*sena|शिव सेना"),
    ("RJD", r"rashtriya\s*janata\s*dal|^rjd$"),
    ("ASP(KR)", r"azad\s*samaj|आज़ाद समाज|आजाद समाज"),
    ("PSP(L)", r"pragatisheel samajwadi|प्रगतिशील समाजवादी"),
    ("JKP", r"jan\s*kranti|जन क्रांति"),
    ("MD", r"momin\s*conference|^md$"),
    ("IJP", r"indian\s*justice|^ijp$"),
    ("VIP", r"vikassheel insaan|^vip$|^v i p$"),
]
RULES += [
    ("BJP", r"^भा\s*0?\s*ज\s*0?\s*पा\s*0?$|^भाजपा$"),
    ("SP", r"^स\s*0?\s*पा\s*0?$"),
    ("BSP", r"^ब\s*0?\s*स\s*0?\s*पा\s*0?$"),
    ("INC", r"^कां\s*0?\s*$|^कांग्रेस आई$"),
]
_COMPILED = [(code, re.compile(rx, re.I)) for code, rx in RULES]
CANON = {
    "bharatiya janata party": "BJP", "samajwadi party": "SP", "bahujan samaj party": "BSP",
    "indian national congress": "INC", "rashtriya lok dal": "RLD", "apna dal soneylal": "ADAL",
    "apna dal": "ADAL", "suheldev bharatiya samaj party": "SBSP", "peace party": "PECP",
    "aam aadmi party": "AAP", "all india majlis e ittehadul muslimeen": "AIMIM", "independent": "IND",
    "nationalist congress party": "NCP", "communist party of india": "CPI", "jan adhikar party": "JAP",
    "bahujan mukti party": "BMP", "nirbal indian shoshit hamara aam dal": "NISHAD",
    "pragatisheel samajwadi party lohia": "PSP(L)", "all india trinamool congress": "AITC",
    "lok dal": "LD", "shiv sena": "SHS", "janata dal united": "JD(U)", "rashtriya janata dal": "RJD",
}
KNOWN = set(CANON.values()) | {c for c, _ in RULES}


def _fuzzy(s):
    import difflib
    key = re.sub(r"[^a-z ]", " ", s.lower())
    key = re.sub(r"\s+", " ", key).strip()
    if len(key) < 6:
        return None
    m = difflib.get_close_matches(key, CANON.keys(), n=1, cutoff=0.89)
    return CANON[m[0]] if m else None


def std_party(raw):
    s = re.sub(r"\s+", " ", (raw or "").strip()).strip(" .,-")
    if not s:
        return ""
    for code, rx in _COMPILED:
        if rx.search(s):
            return code
    m = re.search(r"\(\s*([A-Za-z().]{2,10})\s*\)\s*$", s)
    if m:
        inner = std_party(m.group(1))
        if inner in KNOWN:
            return inner
    f = _fuzzy(s)
    if f:
        return f
    if len(s) <= 8 and re.fullmatch(r"[A-Za-z().&\- ]+", s):
        return s.upper().replace(" ", "")
    return s


def split_name_party(name):
    """'Mohd Ashif Jafri Bahujan Samaj Party' -> ('Mohd Ashif Jafri', 'Bahujan Samaj Party').
    The split point is where the tail reads most like a known party name."""
    import difflib
    words = (name or "").split()
    best = None
    for k in range(1, len(words)):
        tail = " ".join(words[k:]).strip(" ()-,")
        code = std_party(tail)
        if code not in KNOWN or code == "NOTA" or len(tail) < 3:
            continue
        key = re.sub(r"\s+", " ", re.sub(r"[^a-z\u0900-\u097f ]", " ", tail.lower())).strip()
        refs = [c for c, v in CANON.items() if v == code] or [code.lower()]
        sc = max(difflib.SequenceMatcher(None, key, r).ratio() for r in refs)
        if code == "IND" and key.startswith("ind"):
            sc = 1.0
        if best is None or sc > best[0]:
            best = (sc, k, tail)
    if best and best[0] >= 0.6:
        return " ".join(words[:best[1]]).strip(" (-,"), best[2]
    return name, ""
