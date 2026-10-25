"""Kruti Dev 010 (legacy 8-bit Hindi font) -> Unicode Devanagari converter.

Mapping order follows the widely used Rajbhasha converter: sequential
replacement (longest/contextual patterns first), then the pre-base
'f' (ि) and reph 'Z' (र्) are moved to their logical Unicode positions.
"""
import re

_PAIRS = [
    ("ñ", "॰"), ("Q+Z", "QZ+"), ("sas", "sa"), ("aa", "a"), (")Z", "र्द्ध"), ("ZZ", "Z"),
    ("‘", '"'), ("’", '"'), ("“", "'"), ("”", "'"),
    ("å", "०"), ("ƒ", "१"), ("„", "२"), ("…", "३"), ("†", "४"), ("‡", "५"),
    ("ˆ", "६"), ("‰", "७"), ("Š", "८"), ("‹", "९"),
    ("¶+", "फ़्"), ("d+", "क़"), ("[+k", "ख़"), ("[+", "ख़्"), ("x+", "ग़"), ("T+", "ज़्"),
    ("t+", "ज़"), ("M+", "ड़"), ("<+", "ढ़"), ("Q+", "फ़"), (";+", "य़"), ("j+", "ऱ"), ("u+", "ऩ"),
    ("Ùk", "त्त"), ("Ù", "त्त्"), ("ä", "क्त"), ("–", "दृ"), ("—", "कृ"), ("é", "न्न"), ("™", "न्न्"),
    ("=kk", "=k"), ("f=k", "f="),
    ("à", "ह्न"), ("á", "ह्य"), ("â", "हृ"), ("ã", "ह्म"), ("ºz", "ह्र"), ("º", "ह्"), ("í", "द्द"),
    ("{k", "क्ष"), ("{", "क्ष्"), ("=", "त्र"), ("«", "त्र्"),
    ("Nî", "छ्य"), ("Vî", "ट्य"), ("Bî", "ठ्य"), ("Mî", "ड्य"), ("<î", "ढ्य"), ("|", "द्य"),
    ("K", "ज्ञ"), ("}", "द्व"), ("J", "श्र"), ("Vª", "ट्र"), ("Mª", "ड्र"), ("<ªª", "ढ्र"),
    ("Nª", "छ्र"), ("Ø", "क्र"), ("Ý", "फ्र"), ("nzZ", "र्द्र"), ("æ", "द्र"), ("ç", "प्र"),
    ("Á", "प्र"), ("xz", "ग्र"), ("#", "रु"), (":", "रू"),
    ("v‚", "ऑ"), ("vks", "ओ"), ("vkS", "औ"), ("vk", "आ"), ("v", "अ"), ("b±", "ईं"),
    ("Ã", "ई"), ("bZ", "ई"), ("b", "इ"), ("m", "उ"), ("Å", "ऊ"), (",s", "ऐ"), (",", "ए"), ("_", "ऋ"),
    ("ô", "क्क"), ("d", "क"), ("Dk", "क"), ("D", "क्"), ("[k", "ख"), ("[", "ख्"), ("x", "ग"),
    ("Xk", "ग"), ("X", "ग्"), ("Ä", "घ"), ("?k", "घ"), ("?", "घ्"), ("³", "ङ"),
    ("pkS", "चै"), ("p", "च"), ("Pk", "च"), ("P", "च्"), ("N", "छ"), ("t", "ज"), ("Tk", "ज"),
    ("T", "ज्"), (">", "झ"), ("÷", "झ्"), ("¥", "ञ"),
    ("ê", "ट्ट"), ("ë", "ट्ठ"), ("V", "ट"), ("B", "ठ"), ("ì", "ड्ड"), ("ï", "ड्ढ"),
    ("M+", "ड़"), ("<+", "ढ़"), ("M", "ड"), ("<", "ढ"), (".k", "ण"), (".", "ण्"),
    ("r", "त"), ("Rk", "त"), ("R", "त्"), ("Fk", "थ"), ("F", "थ्"), (")", "द्ध"), ("n", "द"),
    ("/k", "ध"), ("èk", "ध"), ("/", "ध्"), ("Ë", "ध्"), ("è", "ध्"), ("u", "न"), ("Uk", "न"), ("U", "न्"),
    ("i", "प"), ("Ik", "प"), ("I", "प्"), ("Q", "फ"), ("¶", "फ्"), ("c", "ब"), ("Ck", "ब"),
    ("C", "ब्"), ("Hk", "भ"), ("H", "भ्"), ("e", "म"), ("Ek", "म"), ("E", "म्"),
    (";", "य"), ("¸", "य्"), ("j", "र"), ("y", "ल"), ("Yk", "ल"), ("Y", "ल्"), ("G", "ळ"),
    ("o", "व"), ("Ok", "व"), ("O", "व्"),
    ("'k", "श"), ("'", "श्"), ('"k', "ष"), ('"', "ष्"), ("l", "स"), ("Lk", "स"), ("L", "स्"), ("g", "ह"),
    ("È", "ीं"), ("z", "्र"),
    ("Ì", "द्द"), ("Í", "ट्ट"), ("Î", "ट्ठ"), ("Ï", "ड्ड"), ("Ñ", "कृ"), ("Ò", "भ"), ("Ó", "्य"),
    ("Ô", "ड्ढ"), ("Ö", "झ्"), ("Ø", "क्र"), ("Ù", "त्त्"), ("Ük", "श"), ("Ü", "श्"),
    ("‚", "ॉ"), ("ks", "ो"), ("kS", "ौ"), ("k", "ा"), ("h", "ी"), ("q", "ु"), ("w", "ू"),
    ("`", "ृ"), ("s", "े"), ("S", "ै"),
    ("a", "ं"), ("¡", "ँ"), ("%", "ः"), ("W", "ॅ"), ("•", "ऽ"), ("·", "ऽ"), ("∙", "ऽ"),
    ("~j", "्र"), ("~", "्"), ("\\", "?"), ("+", "़"), (" ः", ":"),
    ("^", "‘"), ("*", "’"), ("Þ", "“"), ("ß", "”"), ("(", ";"), ("¼", "("), ("½", ")"),
    ("¿", "{"), ("À", "}"), ("¾", "="), ("A", "।"), ("-", "."), ("&", "-"), ("Œ", "µ"),
    ("]", ","), ("~ ", "् "), ("@", "/"),
]

_CONS = set("कखगघङचछजझञटठडढणतथदधनपफबभमयरलळवशषसहऱऩक़ख़ग़ज़ड़ढ़फ़य़")
_MATRAS = set("ािीुूृेैोौंःँॅ़")
HALANT = "्"


def _move_i(s):
    """Move the pre-base 'f' after the full consonant cluster that follows it."""
    out = []
    i = 0
    while i < len(s):
        ch = s[i]
        if ch != "f":
            out.append(ch)
            i += 1
            continue
        j = i + 1
        if j < len(s) and s[j] in _CONS:
            j += 1
            if j < len(s) and s[j] == "़":
                j += 1
            # absorb half-consonant conjunct chains: क्ष, स्थ, न्द्र ...
            while j + 1 < len(s) and s[j] == HALANT and s[j + 1] in _CONS:
                j += 2
                if j < len(s) and s[j] == "़":
                    j += 1
        elif i > 0 and out and out[-1] == HALANT:
            j = i + 1
        cluster = s[i + 1:j]
        if not cluster:  # stray 'f' with nothing to attach
            out.append("ि")
            i += 1
            continue
        out.append(cluster + "ि")
        i = j
    return "".join(out)


def _move_reph(s):
    """'Z' (reph) is typed after the syllable; Unicode wants र् before it."""
    while True:
        p = s.find("Z")
        if p < 0:
            return s
        q = p - 1
        while q >= 0 and s[q] in _MATRAS:
            q -= 1
        # include preceding half consonants of the cluster
        while q >= 2 and s[q - 1] == HALANT and s[q - 2] in _CONS:
            q -= 2
        if q < 0:
            s = s[:p] + "र्" + s[p + 1:]
            continue
        s = s[:q] + "र्" + s[q:p] + s[p + 1:]


def kd2uni(text):
    if text is None:
        return text
    s = str(text)
    if not s.strip():
        return s
    for a, b in _PAIRS:
        if a in s:
            s = s.replace(a, b)
    s = _move_i(s)
    s = _move_reph(s)
    # matra + nukta order fix and doubled signs
    s = re.sub("([ािीुूृेैोौ])़", "़\\1", s)
    return s


if __name__ == "__main__":
    import sys
    tests = ["izk0 ikB'kkyk", "iadt dqekj efy", "cychj flag", "ohjsUnz flag", "jktCcj",
             "fot; dqekj flag", "eqdqy", "izkFkfed fo|ky;", "xqyke ekSgEe", ";'kohj flag",
             "txr flg", "fLFkr", "ekStwn", "Hkkjrh; turk ikVhZ", "cgqtu lekt ikVhZ",
             "lektoknh ikVhZ", "deZp+kjh", "iapk;r?kj gfjtu cLrh", "ifjlj", "Lokfe;ksa"]
    for t in (sys.argv[1:] or tests):
        print(f"{t!r:28} -> {kd2uni(t)}")
