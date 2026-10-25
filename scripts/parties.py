"""Map raw party strings (abbreviations, full names, Hindi) to short codes."""
import re

RULES = [
    ("NOTA", r"\bnota\b|none of the above|नोटा|इनमें से कोई नहीं|उपरोक्त में से कोई नहीं"),
    ("IND", r"^ind\.*$|^ind\.?\s|independ|indepen\s*dent|निर्दलीय|स्वतंत्र|^निर्द"),
    ("BJP", r"bh?ara?t[iy]+a\s*jan?a?ta\s*part|^b\.?\s*j\.?\s*p\.?$|भारतीय जनता|भाजपा"),
    ("SP", r"^samajwadi\s*party$|^samjwadi\s*party$|^s\.?p\.?$|^समाजवादी पार्टी$|^सपा$|^samajwadi$"),
    ("BSP", r"bahu?jan\s*samaj\s*party|bahujn samaj|^b\.?s\.?p\.?$|बहुजन समाज पार्टी|^बसपा$"),
    ("INC", r"indian\s*national\s*congress|^inc\.?$|^i\.?n\.?c\.?$|^congress$|इंडियन नेशनल कांग्रेस|भारतीय राष्ट्रीय कांग्रेस|^कांग्रेस$|^काँग्रेस$"),
    ("RLD", r"rashtriya\s*lok\s*dal|^rld$|राष्ट्रीय लोक दल|रालोद"),
    ("ADAL", r"apna\s*dal|^ad$|^ad\s*\(s\)$|^adal$|अपना दल"),
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
_COMPILED = [(code, re.compile(rx, re.I)) for code, rx in RULES]


def std_party(raw):
    s = re.sub(r"\s+", " ", (raw or "").strip()).strip(" .,-")
    if not s:
        return ""
    for code, rx in _COMPILED:
        if rx.search(s):
            return code
    if len(s) <= 8 and re.fullmatch(r"[A-Za-z().&\- ]+", s):
        return s.upper().replace(" ", "")
    return s
