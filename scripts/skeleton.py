"""Script-independent consonant skeletons so Hindi and English spellings of a
place name can be compared (मवई बुजुर्ग ~ MAWAI BUJURG -> 'mv bjrg')."""
import re

DEV = {"क": "k", "ख": "k", "ग": "g", "घ": "g", "ङ": "n", "च": "c", "छ": "c", "ज": "j", "झ": "j", "ञ": "n",
       "ट": "t", "ठ": "t", "ड": "d", "ढ": "r", "ण": "n", "त": "t", "थ": "t", "द": "d", "ध": "d", "न": "n",
       "प": "p", "फ": "p", "ब": "b", "भ": "b", "म": "m", "य": "y", "र": "r", "ल": "l", "व": "v", "श": "s",
       "ष": "s", "स": "s", "ह": "h", "ं": "", "ँ": "", "क़": "k", "ख़": "k", "ग़": "g", "ज़": "j", "ड़": "r",
       "ढ़": "r", "फ़": "p", "य़": "y", "ऋ": "r", "ृ": "r"}
EN = [("ch", "c"), ("sh", "s"), ("kh", "k"), ("gh", "g"), ("th", "t"), ("dh", "d"), ("ph", "p"), ("bh", "b"),
      ("jh", "j"), ("rh", "r"), ("f", "p"), ("w", "v"), ("q", "k"), ("z", "j"), ("x", "ks"), ("c", "k")]
GENERIC = re.compile(r"\b(p\.?\s*s|primary|school|prathmik|prathamik|vidyalaya|vidhyalaya|vidyalay|room|no|r\.?\s*n|"
                     r"jr|junior|high|inter|college|uchch|uchcha|purva|poorva|madhyamik|kaksh|kaksha|bhawan|bhavan|"
                     r"panchayat|ghar|composite|kampojit|pra|pu|ma|vi|u|left|right|part|east|west|north|south|"
                     r"new|naveen|navin|nagar|ward|sanviliyan)\b", re.I)
DEV_GENERIC = re.compile(r"(?<![\u0900-\u097F])(प्रा|प्राथमिक|पू|पूर्व|उ|उच्च|मा|माध्यमिक|वि|विद्यालय|कक्ष|क|नं|संख्या|सं|भवन|कमरा|स्कूल|"
                         r"कम्पोजिट|संविलियन|जूनियर|हाई|इण्टर|इंटर|कालेज|कॉलेज|बेसिक|नवीन|नया|पंचायत|घर|सामुदायिक|अंश|"
                         r"भाग|बायां|दायां|पूर्वी|पश्चिमी|उत्तरी|दक्षिणी|वार्ड|नगर|मजरा|ग्राम)(?=[\s0-9.\-–,()/&]|$)")


def _dev_word(w):
    w = w.replace("़", "")
    out = []
    for ch in w:
        if ch in DEV:
            out.append(DEV[ch])
    return "".join(out)


def _en_word(w):
    w = w.lower()
    for a, b in EN:
        w = w.replace(a, b)
    w = re.sub(r"[aeiouy]", "", w) if len(w) > 2 else w
    return w


def skeletons(text):
    text = str(text or "")
    if re.search("[ऀ-ॿ]", text):
        text = DEV_GENERIC.sub(" ", text)
        words = re.findall(r"[ऀ-ॿ]+", text)
        sk = [_dev_word(w) for w in words]
        sk = [re.sub(r"y", "", s) if len(s) > 2 else s for s in sk]  # य is often dropped in English spellings
    else:
        text = GENERIC.sub(" ", text)
        sk = [_en_word(w) for w in re.findall(r"[A-Za-z]+", text)]
    sk = [re.sub(r"(.)\1+", r"\1", s) for s in sk]
    sk = [re.sub(r"n(?=[kgcjtdpb])", "", s) for s in sk]  # nasal before stop: गंज ganj / gaj
    return {s for s in sk if len(s) >= 2}
