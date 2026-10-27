"""Render a Vidhan Sabha War Dossier (English + Hindi) from dossier_data.py JSON
plus a small facts JSON (news/research context).

usage: python3 dossier_html.py data.json facts.json out.html
"""
import html
import json
import sys

PARTY_ORDER = ["BSP", "BJP", "SP", "NISHAD", "INC"]  # fixed colour slots, never re-ordered by rank
PARTY_NAME = {
    "SP": ("Samajwadi Party (SP)", "समाजवादी पार्टी (सपा)"),
    "BJP": ("Bharatiya Janata Party (BJP)", "भारतीय जनता पार्टी (भाजपा)"),
    "BSP": ("Bahujan Samaj Party (BSP)", "बहुजन समाज पार्टी (बसपा)"),
    "INC": ("Indian National Congress (INC)", "कांग्रेस (INC)"),
    "NISHAD": ("NISHAD Party", "निषाद पार्टी"),
    "SBSP": ("SBSP", "सुभासपा"), "ADAL": ("Apna Dal", "अपना दल"), "RLD": ("RLD", "रालोद"),
}
E_NAME = {"VS2012": ("Assembly 2012", "विधानसभा 2012"), "VS2017": ("Assembly 2017", "विधानसभा 2017"),
          "VS2022": ("Assembly 2022", "विधानसभा 2022"), "LS2014": ("Lok Sabha 2014", "लोकसभा 2014"),
          "LS2019": ("Lok Sabha 2019", "लोकसभा 2019"), "LS2024": ("Lok Sabha 2024", "लोकसभा 2024")}
BAND_NAME = {"kila": ("Fortress (lead 200+)", "किला (200+ से आगे)"),
             "mazboot": ("Strong (lead 100–199)", "मज़बूत (100–199 से आगे)"),
             "swing_badhat": ("Swing lead (1–99)", "स्विंग बढ़त (1–99 से आगे)"),
             "palatne_layak": ("Can be flipped (behind 1–99)", "पलटने लायक (1–99 से पीछे)"),
             "kathin": ("Hard (behind 100–199)", "कठिन (100–199 से पीछे)"),
             "red_alert": ("Red alert (behind 200+)", "रेड अलर्ट (200+ से पीछे)"),
             "barabar": ("Tie", "बराबर")}


def esc(x):
    return html.escape(str(x), quote=True)


def n(x):
    """Indian digit grouping: 107840 -> 1,07,840"""
    if x is None:
        return "–"
    neg = x < 0
    s = str(abs(int(round(x))))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        s = ",".join(parts) + "," + tail
    return ("−" if neg else "") + s


def pc(x, nd=1):
    return "–" if x is None else f"{x:.{nd}f}%"


def pname(p, lang):
    return PARTY_NAME.get(p, (p, p))[0 if lang == "en" else 1]


def chip(p):
    slot = PARTY_ORDER.index(p) + 1 if p in PARTY_ORDER else 0
    return f'<span class="chip s{slot}">{esc(p)}</span>'


def table(head, rows, cls=""):
    th = "".join(f"<th>{h}</th>" for h in head)
    tr = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<div class="tw"><table class="{cls}"><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>'


def point(pid, en, hi, kpis, evidence):
    """en / hi: dict(title, summary, data=[...], actions=[...])"""
    def block(lang, t):
        lbl = dict(en=("What the data says", "Action plan", "KPIs"), hi=("डेटा क्या कहता है", "एक्शन प्लान", "KPI (नापने के पैमाने)"))[lang]
        data = "".join(f"<li>{x}</li>" for x in t["data"])
        act = "".join(f"<li>{x}</li>" for x in t["actions"])
        k = "".join(f"<li>{x}</li>" for x in kpis[lang])
        return (f'<div class="lang {lang}" lang="{"en" if lang == "en" else "hi"}">'
                f'<h3>{t["title"]}</h3><p class="sum">{t["summary"]}</p>'
                f'<div class="cols"><div><h4>{lbl[0]}</h4><ul>{data}</ul></div>'
                f'<div><h4>{lbl[1]}</h4><ul class="act">{act}</ul><h4>{lbl[2]}</h4><ul class="kpi">{k}</ul></div></div></div>')
    return (f'<article class="point" id="{pid}">{block("en", en)}{block("hi", hi)}'
            f'<details class="ev" open><summary>Evidence / सबूत</summary>{evidence}</details></article>')


def build(d, f):
    E = d["elections"]
    v22, v17, v12 = E["VS2022"], E["VS2017"], E["VS2012"]
    l19, l24 = E["LS2019"], E["LS2024"]
    pb22, pb24 = d["party_booths"]["VS2022"], d["party_booths"]["LS2024"]
    ps = d["ps2026"]
    ac, name = d["ac_no"], f.get("ac_name_en", d["ac_name"])
    name_hi = f.get("ac_name_hi", name)
    nda22 = f.get("nda_2022_party", "NISHAD")
    parties22 = [p for p in PARTY_ORDER if p in pb22]
    parties24 = [p for p in PARTY_ORDER if p in pb24]
    pts = {}

    # ------------------------------------------------------------- 1. seat
    bye = f.get("bye2024")
    e_drop = v22["electors"] - ps["electors"]
    rows = [["Constituency / क्षेत्र", f"{ac} – {esc(name)} ({esc(name_hi)})"],
            ["District / ज़िला", esc(f.get("district_en", d["district"])) + " / " + esc(f.get("district_hi", ""))],
            ["Lok Sabha seat / लोकसभा सीट", esc(f.get("pc", "–"))],
            ["Category / श्रेणी", esc(f.get("category", "–"))],
            ["Polling stations 2026 (draft) / मतदेय स्थल 2026", n(ps["polling_stations"])],
            ["Voters on 2026 draft list / 2026 सूची में मतदाता", n(ps["electors"])],
            ["Villages / mohallas with a polling station / गाँव-मोहल्ले", n(ps["villages"])],
            ["Voters 2022 / 2022 में मतदाता", n(v22["electors"])]]
    for k, (en_l, hi_l) in f.get("current", {}).items():
        rows.append([esc(k), esc(en_l) + " / " + esc(hi_l)])
    pts["1"] = point("p1", dict(
        title=f"{name}: a close three-way seat",
        summary=f"In 2022 {v22['winner']['party']} won by {n(f.get('official_margin', {}).get('VS2022', v22['margin']))} votes; "
                + (f"in the 2024 bye-election {bye['winner_party']} won by {n(bye['margin'])}." if bye else ""),
        data=[f"2022: {v22['booths']} booths, {n(v22['electors'])} voters, turnout {pc(v22['turnout'])}.",
              f"2026 draft list: {ps['polling_stations']} polling stations, {n(ps['electors'])} voters — {n(e_drop)} fewer than 2022 ({pc(100 * e_drop / v22['electors'])}).",
              f"Last three assembly winners: 2012 {v12['winner']['party']}, 2017 {v17['winner']['party']}, 2022 {v22['winner']['party']}"
              + (f", 2024 bye-election {bye['winner_party']}." if bye else "."),
              f"Lok Sabha segment: 2019 {l19['winner']['party']} led by {n(l19['margin'])}; 2024 {l24['winner']['party']} led by {n(l24['margin'])}."],
        actions=["Every party: check its booth list against the 2026 polling-station numbers before any booth work.",
                 "Every party: verify each booth's voter count on the new list (claims and objections period).",
                 "Track the seat as a three-way contest; no party has won it twice in a row since 2012."]),
        dict(
        title=f"{name_hi}: तीन पार्टियों की कड़ी टक्कर",
        summary=f"2022 में {v22['winner']['party']} {n(f.get('official_margin', {}).get('VS2022', v22['margin']))} वोट से जीती; "
                + (f"2024 उपचुनाव में {bye['winner_party']} {n(bye['margin'])} वोट से जीती।" if bye else ""),
        data=[f"2022: {v22['booths']} बूथ, {n(v22['electors'])} मतदाता, मतदान {pc(v22['turnout'])}।",
              f"2026 की आलेख्य सूची: {ps['polling_stations']} मतदेय स्थल, {n(ps['electors'])} मतदाता — 2022 से {n(e_drop)} कम ({pc(100 * e_drop / v22['electors'])})।",
              f"पिछले तीन विधानसभा विजेता: 2012 {v12['winner']['party']}, 2017 {v17['winner']['party']}, 2022 {v22['winner']['party']}"
              + (f", 2024 उपचुनाव {bye['winner_party']}।" if bye else "।"),
              f"लोकसभा में इस क्षेत्र से: 2019 {l19['winner']['party']} {n(l19['margin'])} से आगे; 2024 {l24['winner']['party']} {n(l24['margin'])} से आगे।"],
        actions=["हर पार्टी: बूथ का काम शुरू करने से पहले अपनी बूथ सूची 2026 के नए मतदेय स्थल नंबरों से मिलाए।",
                 "हर पार्टी: नई सूची में हर बूथ के मतदाता गिनती जाँचे (दावा-आपत्ति के समय)।",
                 "यह सीट तीन-तरफ़ा मुकाबले वाली है; 2012 से कोई पार्टी लगातार दो बार नहीं जीती।"]),
        dict(en=["Voters on list vs 2022", "Booths re-mapped to 2026 numbers", "Turnout vs 62.5% (2022)"],
             hi=["2022 के मुकाबले सूची में मतदाता", "2026 नंबरों से मिलाए गए बूथ", "मतदान बनाम 62.5% (2022)"]),
        table(["Item / विषय", "Value / आँकड़ा"], rows))

    # ------------------------------------------------------------- 2. ground picture
    t = d["turnout_2022"]
    w = d["women"]
    trows = [[E_NAME[e][0] + " / " + E_NAME[e][1], n(E[e]["booths"]), n(E[e]["electors"]), n(E[e]["voters"]), pc(E[e]["turnout"]),
              pc(E[e]["female_share_of_voters"])] for e in ["VS2012", "LS2014", "VS2017", "LS2019", "VS2022"]]
    trows.append([E_NAME["LS2024"][0] + " / " + E_NAME["LS2024"][1], n(l24["booths"]), "–", "–", "–", "–"])
    pts["2a"] = point("p2a", dict(
        title="Turnout is steady; women vote as much as men",
        summary=f"Turnout has stayed between {pc(min(E[e]['turnout'] for e in ['VS2012','VS2017','VS2022','LS2014','LS2019']))} and {pc(max(E[e]['turnout'] for e in ['VS2012','VS2017','VS2022','LS2014','LS2019']))}; women were {pc(w['female_turnout_share_2022'])} of 2022 voters.",
        data=[f"2022 booth turnout ranged from {pc(t['min'])} to {pc(t['max'])} (median {pc(t['median'])}).",
              f"{t['below_50']} booths had turnout below 50%; {t['above_70']} booths had 70% or more.",
              f"In {w['booths_women_more_than_men_2022']} of {w['of']} booths more women than men voted in 2022.",
              f"Women's share of voters: 2012 {pc(v12['female_share_of_voters'])}, 2017 {pc(v17['female_share_of_voters'])}, 2022 {pc(v22['female_share_of_voters'])}."],
        actions=["Every party: list the low-turnout booths and check if names are missing or shifted on the new roll.",
                 "Every party: plan women's outreach meetings in the women-majority booths (legal meetings only).",
                 "Keep turnout work to registration help and polling-day information — no transport or gifts to voters."]),
        dict(
        title="मतदान स्थिर है; महिलाएँ पुरुषों जितना वोट डालती हैं",
        summary=f"मतदान {pc(min(E[e]['turnout'] for e in ['VS2012','VS2017','VS2022','LS2014','LS2019']))} से {pc(max(E[e]['turnout'] for e in ['VS2012','VS2017','VS2022','LS2014','LS2019']))} के बीच रहा; 2022 में वोट डालने वालों में {pc(w['female_turnout_share_2022'])} महिलाएँ थीं।",
        data=[f"2022 में बूथ-वार मतदान {pc(t['min'])} से {pc(t['max'])} तक (बीच का आँकड़ा {pc(t['median'])})।",
              f"{t['below_50']} बूथों पर मतदान 50% से कम; {t['above_70']} बूथों पर 70% या ज़्यादा।",
              f"2022 में {w['of']} में से {w['booths_women_more_than_men_2022']} बूथों पर पुरुषों से ज़्यादा महिलाओं ने वोट डाला।",
              f"वोटरों में महिलाओं का हिस्सा: 2012 {pc(v12['female_share_of_voters'])}, 2017 {pc(v17['female_share_of_voters'])}, 2022 {pc(v22['female_share_of_voters'])}।"],
        actions=["हर पार्टी: कम मतदान वाले बूथ छाँटे और देखे कि नई सूची में नाम कटे या खिसके तो नहीं।",
                 "हर पार्टी: महिला-बहुल बूथों में महिलाओं के साथ बैठकें करे (सिर्फ़ कानूनी बैठकें)।",
                 "मतदान बढ़ाने का काम सिर्फ़ नाम जुड़वाने और जानकारी देने तक — वोटर को वाहन या उपहार नहीं।"]),
        dict(en=["Booths below 50% turnout", "Women's share of voters", "New-voter forms per booth"],
             hi=["50% से कम मतदान वाले बूथ", "वोटरों में महिलाओं का हिस्सा", "हर बूथ पर नए मतदाता फ़ॉर्म"]),
        table(["Election / चुनाव", "Booths / बूथ", "Voters on list / मतदाता", "Voted / वोट पड़े", "Turnout / मतदान", "Women of voters / महिलाएँ"], trows))

    news = f.get("issues", [])
    if news:
        pts["2b"] = point("p2b", dict(
            title="Local issues reported in the news",
            summary="Issues that newspapers have reported for this area; not measured by us.",
            data=[esc(x["en"]) for x in news],
            actions=["Every party: verify each issue on the ground before using it.",
                     "Keep a list of which villages each issue touches.",
                     "Update the list every month."]),
            dict(title="ख़बरों में आए स्थानीय मुद्दे",
                 summary="अख़बारों में इस इलाके के जो मुद्दे छपे; हमने इन्हें नापा नहीं है।",
                 data=[esc(x["hi"]) for x in news],
                 actions=["हर पार्टी: इस्तेमाल से पहले हर मुद्दा ज़मीन पर जाँचे।", "हर मुद्दा किन गाँवों को छूता है, उसकी सूची रखें।", "सूची हर महीने अपडेट करें।"]),
            dict(en=["Issues verified on ground", "Villages mapped per issue"], hi=["ज़मीन पर जाँचे गए मुद्दे", "हर मुद्दे से जुड़े गाँव"]),
            table(["Issue / मुद्दा", "Reported / ख़बर"], [[esc(x["en"]), esc(x.get("when", ""))] for x in news]))

    # ------------------------------------------------------------- 3. record
    def res_table(e):
        s = E[e]
        rows = [[c["rank"], esc(c["candidate"]), chip(c["party"]) if c["party"] in PARTY_ORDER else esc(c["party"]), n(c["votes"]), pc(c["share"])]
                for c in s["candidates"][:5]]
        return f"<h5>{E_NAME[e][0]} / {E_NAME[e][1]}</h5>" + table(["#", "Candidate / उम्मीदवार", "Party / पार्टी", "Votes / वोट", "Share / हिस्सा"], rows)
    hist = []
    for e in ["VS2012", "VS2017", "VS2022"]:
        s = E[e]
        om = f.get("official_margin", {}).get(e)
        hist.append([E_NAME[e][0], f"{s['winner']['party']} ({n(s['winner']['votes'])})", f"{s['runner_up']['party']} ({n(s['runner_up']['votes'])})", n(s["margin"]) + (f" <span class='hi'>(official {n(om)})</span>" if om else ""), pc(s["margin_pct"]), pc(s["turnout"])])
    if bye:
        hist.append(["Bye-election 2024 / उपचुनाव 2024", f"{bye['winner_party']} ({n(bye['winner_votes'])})", f"{bye['runner_party']} ({n(bye['runner_votes'])})", n(bye["margin"]), pc(bye.get("margin_pct")), pc(bye.get("turnout"))])
    for e in ["LS2019", "LS2024"]:
        s = E[e]
        hist.append([E_NAME[e][0] + " (segment)", f"{s['winner']['party']} ({n(s['winner']['votes'])})", f"{s['runner_up']['party']} ({n(s['runner_up']['votes'])})", n(s["margin"]), pc(s["margin_pct"]), pc(s["turnout"])])
    share = {p: [next((c["share"] for c in E[e]["candidates"] if c["party"] == p), None) for e in ["VS2012", "VS2017", "VS2022"]] for p in PARTY_ORDER}
    nda_share22 = share[nda22][2]
    pts["3"] = point("p3", dict(
        title="Winner changed in every assembly election",
        summary=f"SP won 2012, BSP won 2017, SP won 2022" + (f", {bye['winner_party']} won the 2024 bye-election" if bye else "") + "; the margin was about 3% in both 2017 and 2022.",
        data=[f"2012: SP {pc(share['SP'][0])}, BSP {pc(share['BSP'][0])}; BJP {pc(share['BJP'][0])}.",
              f"2017: BSP {pc(share['BSP'][1])}, BJP {pc(share['BJP'][1])}, SP {pc(share['SP'][1])}, NISHAD {pc(share['NISHAD'][1])}.",
              f"2022: SP {pc(share['SP'][2])}, {nda22} (NDA) {pc(nda_share22)}, BSP {pc(share['BSP'][2])}.",
              f"Lok Sabha segment: 2019 BSP {pc(l19['winner']['share'])} vs BJP {pc(l19['runner_up']['share'])}; 2024 SP {pc(l24['winner']['share'])}, BJP {pc(l24['runner_up']['share'])}, BSP {pc(next(c['share'] for c in l24['candidates'] if c['party']=='BSP'))}."],
        actions=["Every party: compare its 2022 and 2024 booth results side by side (booth explorer below).",
                 "Every party: study the booths it lost between two elections, not only the seat total.",
                 "Plan for a winning line of about 38–44% of votes, the range winners needed here since 2017."]),
        dict(
        title="हर विधानसभा चुनाव में विजेता बदला",
        summary=f"2012 में सपा, 2017 में बसपा, 2022 में सपा" + (f", 2024 उपचुनाव में {bye['winner_party']}" if bye else "") + "; 2017 और 2022 दोनों में जीत का अंतर करीब 3% था।",
        data=[f"2012: सपा {pc(share['SP'][0])}, बसपा {pc(share['BSP'][0])}; भाजपा {pc(share['BJP'][0])}।",
              f"2017: बसपा {pc(share['BSP'][1])}, भाजपा {pc(share['BJP'][1])}, सपा {pc(share['SP'][1])}, निषाद {pc(share['NISHAD'][1])}।",
              f"2022: सपा {pc(share['SP'][2])}, {nda22} (NDA) {pc(nda_share22)}, बसपा {pc(share['BSP'][2])}।",
              f"लोकसभा में यह क्षेत्र: 2019 बसपा {pc(l19['winner']['share'])} बनाम भाजपा {pc(l19['runner_up']['share'])}; 2024 सपा {pc(l24['winner']['share'])}, भाजपा {pc(l24['runner_up']['share'])}, बसपा {pc(next(c['share'] for c in l24['candidates'] if c['party']=='BSP'))}।"],
        actions=["हर पार्टी: अपने 2022 और 2024 के बूथ नतीजे साथ रखकर देखे (नीचे बूथ एक्सप्लोरर)।",
                 "हर पार्टी: सिर्फ़ कुल नतीजा नहीं, दो चुनावों के बीच हारे गए बूथ पढ़े।",
                 "जीत की रेखा ~38–44% वोट मानकर योजना बनाएँ — 2017 से यहाँ विजेता को इतना ही चाहिए था।"]),
        dict(en=["Vote share vs 38% line", "Booths won vs last election", "Margin trend"],
             hi=["38% रेखा के मुकाबले वोट हिस्सा", "पिछले चुनाव के मुकाबले जीते बूथ", "अंतर का रुझान"]),
        table(["Election / चुनाव", "Winner / विजेता", "Second / दूसरे", "Margin (booth votes) / अंतर", "Margin %", "Turnout / मतदान"], hist)
        + "<p class='note'>Booth-level figures are EVM votes; official results also include postal ballots. / बूथ के आँकड़े EVM वोट हैं; आधिकारिक नतीजों में डाक मतपत्र भी जुड़ते हैं।</p>"
        + '<div class="grid2">' + "".join(res_table(e) for e in ["VS2012", "VS2017", "VS2022", "LS2019", "LS2024"]) + "</div>")

    # ------------------------------------------------------------- 4. booth map
    def wl_rows(pb, ps_):
        return [[chip(p), n(pb[p]["votes"]), n(pb[p]["won"]), n(pb[p]["second"]), n(pb[p]["third"]),
                 n(pb[p]["strong_60"]), n(pb[p]["weak_15"])] for p in ps_]
    hdr = ["Party / पार्टी", "Votes / वोट", "1st / पहले", "2nd / दूसरे", "3rd / तीसरे", "60%+ booths", "<15% booths"]
    top = max(parties22, key=lambda p: pb22[p]["won"])
    pts["4a"] = point("p4a", dict(
        title="Booths won, second and third by party",
        summary=f"In 2022 SP came first in {pb22['SP']['won']} booths, {nda22} in {pb22[nda22]['won']}, BSP in {pb22['BSP']['won']} (of {v22['booths']}).",
        data=[f"2022 strong booths (60%+ share): SP {pb22['SP']['strong_60']}, {nda22} {pb22[nda22]['strong_60']}, BSP {pb22['BSP']['strong_60']}.",
              f"2022 weak booths (below 15%): SP {pb22['SP']['weak_15']}, {nda22} {pb22[nda22]['weak_15']}, BSP {pb22['BSP']['weak_15']}.",
              f"2024 Lok Sabha: SP first in {pb24['SP']['won']}, BJP {pb24['BJP']['won']}, BSP {pb24['BSP']['won']} of {l24['booths']} booths.",
              f"BSP was second in {pb22['BSP']['second']} booths in 2022 and in {pb24['BSP']['second']} in 2024."],
        actions=["Every party: mark its first, second and third-place booths on one map.",
                 "Second-place booths are where the next gain is most likely; give them booth-level attention.",
                 "Weak booths (below 15%) need a basic presence first: a booth agent and a local contact."]),
        dict(
        title="पार्टी-वार: कितने बूथ पहले, दूसरे, तीसरे",
        summary=f"2022 में {v22['booths']} में से सपा {pb22['SP']['won']} बूथों पर पहले, {nda22} {pb22[nda22]['won']} पर, बसपा {pb22['BSP']['won']} पर।",
        data=[f"2022 मज़बूत बूथ (60%+ हिस्सा): सपा {pb22['SP']['strong_60']}, {nda22} {pb22[nda22]['strong_60']}, बसपा {pb22['BSP']['strong_60']}।",
              f"2022 कमज़ोर बूथ (15% से कम): सपा {pb22['SP']['weak_15']}, {nda22} {pb22[nda22]['weak_15']}, बसपा {pb22['BSP']['weak_15']}।",
              f"2024 लोकसभा: {l24['booths']} बूथों में सपा {pb24['SP']['won']} पर पहले, भाजपा {pb24['BJP']['won']}, बसपा {pb24['BSP']['won']}।",
              f"बसपा 2022 में {pb22['BSP']['second']} बूथों पर और 2024 में {pb24['BSP']['second']} पर दूसरे नंबर पर थी।"],
        actions=["हर पार्टी: अपने पहले, दूसरे और तीसरे नंबर वाले बूथ एक नक्शे पर रखें।",
                 "दूसरे नंबर वाले बूथों में अगली बढ़त की संभावना सबसे ज़्यादा है; वहाँ बूथ-स्तर पर ध्यान दें।",
                 "कमज़ोर बूथों (15% से कम) में पहले बुनियादी मौजूदगी: बूथ एजेंट और एक स्थानीय संपर्क।"]),
        dict(en=["Booths in 1st place", "Booths in 2nd place", "Booths with an agent"], hi=["पहले नंबर वाले बूथ", "दूसरे नंबर वाले बूथ", "बूथ एजेंट वाले बूथ"]),
        "<h5>Assembly 2022 / विधानसभा 2022</h5>" + table(hdr, wl_rows(pb22, parties22))
        + "<h5>Lok Sabha 2024 / लोकसभा 2024</h5>" + table(hdr, wl_rows(pb24, parties24))
        + f"<p class='note'>Tied booths count as first for both parties: 1st places add up to {sum(pb22[p]['won'] for p in parties22)} for {v22['booths']} booths in 2022 and {sum(pb24[p]['won'] for p in parties24)} for {l24['booths']} in 2024. / बराबरी वाले बूथ दोनों पार्टियों के 'पहले' में गिने गए।</p>")

    bands = ["kila", "mazboot", "swing_badhat", "palatne_layak", "kathin", "red_alert", "barabar"]
    def band_rows(pb, ps_, nb):
        return [[chip(p)] + [n(pb[p]["bands"][b]) for b in bands] + [n(sum(pb[p]["bands"].values()))] for p in ps_]
    bh = ["Party"] + [f"{BAND_NAME[b][0]}<br><span class='hi'>{BAND_NAME[b][1]}</span>" for b in bands] + ["Total / कुल"]
    pts["4b"] = point("p4b", dict(
        title="Six margin bands for every party",
        summary=f"Booths each party leads or trails by, from fortress (200+) to red alert (behind 200+).",
        data=[f"2022 swing-lead booths (ahead by 1–99): SP {pb22['SP']['bands']['swing_badhat']}, {nda22} {pb22[nda22]['bands']['swing_badhat']}, BSP {pb22['BSP']['bands']['swing_badhat']}.",
              f"2022 can-be-flipped booths (behind by 1–99): SP {pb22['SP']['bands']['palatne_layak']}, {nda22} {pb22[nda22]['bands']['palatne_layak']}, BSP {pb22['BSP']['bands']['palatne_layak']}.",
              f"Votes needed to flip all those booths in 2022: SP {n(pb22['SP']['flip_votes_palatne'])}, {nda22} {n(pb22[nda22]['flip_votes_palatne'])}, BSP {n(pb22['BSP']['flip_votes_palatne'])}.",
              f"Fortress booths (200+ lead) 2022: SP {pb22['SP']['bands']['kila']}, {nda22} {pb22[nda22]['bands']['kila']}, BSP {pb22['BSP']['bands']['kila']}; 2024: SP {pb24['SP']['bands']['kila']}, BJP {pb24['BJP']['bands']['kila']}."],
        actions=["Every party: defend 'swing lead' booths first — they are the easiest to lose.",
                 "Every party: work the 'can be flipped' booths booth by booth; the gap is under 100 votes each.",
                 "Do not spend effort in fortress or red-alert booths until the middle bands are covered."]),
        dict(
        title="हर पार्टी के लिए अंतर के छह खाने",
        summary="हर पार्टी कितने बूथों पर कितने वोट से आगे या पीछे है — किला (200+) से रेड अलर्ट (200+ पीछे) तक।",
        data=[f"2022 स्विंग बढ़त वाले बूथ (1–99 से आगे): सपा {pb22['SP']['bands']['swing_badhat']}, {nda22} {pb22[nda22]['bands']['swing_badhat']}, बसपा {pb22['BSP']['bands']['swing_badhat']}।",
              f"2022 पलटने लायक बूथ (1–99 से पीछे): सपा {pb22['SP']['bands']['palatne_layak']}, {nda22} {pb22[nda22]['bands']['palatne_layak']}, बसपा {pb22['BSP']['bands']['palatne_layak']}।",
              f"2022 में ये सारे बूथ पलटने के लिए कुल वोट: सपा {n(pb22['SP']['flip_votes_palatne'])}, {nda22} {n(pb22[nda22]['flip_votes_palatne'])}, बसपा {n(pb22['BSP']['flip_votes_palatne'])}।",
              f"किला बूथ (200+ बढ़त) 2022: सपा {pb22['SP']['bands']['kila']}, {nda22} {pb22[nda22]['bands']['kila']}, बसपा {pb22['BSP']['bands']['kila']}; 2024: सपा {pb24['SP']['bands']['kila']}, भाजपा {pb24['BJP']['bands']['kila']}।"],
        actions=["हर पार्टी: पहले 'स्विंग बढ़त' वाले बूथ बचाए — ये सबसे आसानी से हाथ से निकलते हैं।",
                 "हर पार्टी: 'पलटने लायक' बूथों पर एक-एक बूथ करके काम करे; हर जगह अंतर 100 से कम है।",
                 "जब तक बीच के खाने न सँभलें, किला या रेड अलर्ट बूथों पर मेहनत न लगाएँ।"]),
        dict(en=["Swing-lead booths held", "Can-be-flipped booths won", "Votes gained in flip booths"],
             hi=["बचाए गए स्विंग बढ़त बूथ", "जीते गए पलटने लायक बूथ", "पलटने लायक बूथों में बढ़े वोट"]),
        "<h5>Assembly 2022</h5>" + table(bh, band_rows(pb22, parties22, v22["booths"]), "bands")
        + "<h5>Lok Sabha 2024</h5>" + table(bh, band_rows(pb24, parties24, l24["booths"]), "bands"))

    def topt(pb, p, key):
        return table(["Booth", "Name / नाम", "Votes", "Share", "Lead / बढ़त", "Main rival"],
                     [[x["booth"], esc(x["name"]), n(x["votes"]), pc(x["share"]), n(x["lead"]), chip(x["rival"]) if x["rival"] in PARTY_ORDER else esc(x["rival"])] for x in pb[p][key]])
    tabs = "".join(f'<details><summary>{chip(p)} 2022 — top 10 strongest / सबसे मज़बूत 10</summary>{topt(pb22, p, "top10")}</details>'
                   f'<details><summary>{chip(p)} 2022 — top 10 weakest / सबसे कमज़ोर 10</summary>{topt(pb22, p, "bottom10")}</details>' for p in parties22)
    tabs += "".join(f'<details><summary>{chip(p)} 2024 — top 10 strongest / सबसे मज़बूत 10</summary>{topt(pb24, p, "top10")}</details>' for p in parties24)
    pts["4c"] = point("p4c", dict(
        title="Top-10 strongest and weakest booths",
        summary="Each party's ten best and ten worst booths by vote share (2022; 2024 for strongest).",
        data=[f"SP's best 2022 booth: {pb22['SP']['top10'][0]['booth']} ({pc(pb22['SP']['top10'][0]['share'])}).",
              f"{nda22}'s best 2022 booth: {pb22[nda22]['top10'][0]['booth']} ({pc(pb22[nda22]['top10'][0]['share'])}).",
              f"BSP's best 2022 booth: {pb22['BSP']['top10'][0]['booth']} ({pc(pb22['BSP']['top10'][0]['share'])}).",
              "Strong booths of one party are often the weakest booths of another; open the lists to compare."],
        actions=["Every party: keep its strongest booths as volunteer bases for nearby booths.",
                 "Every party: in its weakest booths, start with listening meetings, not rallies.",
                 "Re-check the lists against the 2026 booth numbers before field use."]),
        dict(
        title="सबसे मज़बूत और सबसे कमज़ोर 10 बूथ",
        summary="वोट हिस्से के हिसाब से हर पार्टी के सबसे अच्छे और सबसे कमज़ोर दस बूथ।",
        data=[f"सपा का 2022 में सबसे अच्छा बूथ: {pb22['SP']['top10'][0]['booth']} ({pc(pb22['SP']['top10'][0]['share'])})।",
              f"{nda22} का 2022 में सबसे अच्छा बूथ: {pb22[nda22]['top10'][0]['booth']} ({pc(pb22[nda22]['top10'][0]['share'])})।",
              f"बसपा का 2022 में सबसे अच्छा बूथ: {pb22['BSP']['top10'][0]['booth']} ({pc(pb22['BSP']['top10'][0]['share'])})।",
              "एक पार्टी के मज़बूत बूथ अक्सर दूसरी के सबसे कमज़ोर बूथ होते हैं; सूचियाँ खोलकर मिलाएँ।"],
        actions=["हर पार्टी: अपने मज़बूत बूथों को आस-पास के बूथों के लिए कार्यकर्ता केंद्र बनाए।",
                 "हर पार्टी: कमज़ोर बूथों में रैली नहीं, पहले बात सुनने वाली बैठकें करे।",
                 "मैदान में इस्तेमाल से पहले सूची 2026 के बूथ नंबरों से मिलाएँ।"]),
        dict(en=["Volunteers per strong booth", "Meetings held in weak booths"], hi=["हर मज़बूत बूथ पर कार्यकर्ता", "कमज़ोर बूथों में हुई बैठकें"]),
        tabs)

    cb = d["close_booths"]["VS2022"]
    pts["4d"] = point("p4d", dict(
        title="Fifteen booths decided by 0–3 votes",
        summary=f"In 2022, {len(cb)} booths were decided by {cb[-1]['gap']} votes or fewer; {sum(1 for x in cb if x['gap'] == 0)} were exact ties.",
        data=[f"Ties: booth {', '.join(x['booth'] for x in cb if x['gap'] == 0)}.",
              f"Booths won by 1 vote: {', '.join(x['booth'] for x in cb if x['gap'] == 1)}.",
              f"Parties in these close fights: " + ", ".join(f"{p} {sum(1 for x in cb if p in (x['first'], x['second']))}" for p in parties22) + ".",
              "One family's turnout can change the result in each of these booths."],
        actions=["Every party: have a trained polling agent in each of these booths for the full day.",
                 "Every party: check every name on these booths' rolls during the claims period.",
                 "Every party: ensure form-17C (votes recorded) is collected from each of these booths."]),
        dict(
        title="0–3 वोट से तय हुए पंद्रह बूथ",
        summary=f"2022 में {len(cb)} बूथ {cb[-1]['gap']} या उससे कम वोट से तय हुए; {sum(1 for x in cb if x['gap'] == 0)} पर बराबरी रही।",
        data=[f"बराबरी: बूथ {', '.join(x['booth'] for x in cb if x['gap'] == 0)}।",
              f"1 वोट से फ़ैसला: बूथ {', '.join(x['booth'] for x in cb if x['gap'] == 1)}।",
              "इन कड़ी टक्करों में पार्टियाँ: " + ", ".join(f"{p} {sum(1 for x in cb if p in (x['first'], x['second']))}" for p in parties22) + "।",
              "इन बूथों में एक परिवार का वोट डालना या न डालना नतीजा बदल सकता है।"],
        actions=["हर पार्टी: इन बूथों में पूरे दिन प्रशिक्षित पोलिंग एजेंट रखे।",
                 "हर पार्टी: दावा-आपत्ति के समय इन बूथों की सूची का हर नाम जाँचे।",
                 "हर पार्टी: इन सभी बूथों से फ़ॉर्म-17C (दर्ज वोट) की कॉपी ज़रूर ले।"]),
        dict(en=["Agents present in close booths", "Roll entries checked", "17C copies collected"],
             hi=["कड़ी टक्कर वाले बूथों में एजेंट", "जाँची गई सूची प्रविष्टियाँ", "मिली 17C कॉपियाँ"]),
        table(["Booth", "Name / नाम", "1st", "Votes", "2nd", "Votes", "Gap / अंतर"],
              [[x["booth"], esc(x["name"]), chip(x["first"]) if x["first"] in PARTY_ORDER else esc(x["first"]), n(x["v1"]),
                chip(x["second"]) if x["second"] in PARTY_ORDER else esc(x["second"]), n(x["v2"]), n(x["gap"])] for x in cb]))

    cs = d["core_swing"]
    flows = cs["flows"]
    pts["4e"] = point("p4e", dict(
        title="Core booths are few; most booths switched",
        summary=f"Of {cs['booths_with_2017_match']} booths traceable from 2017 to 2022, {cs['changed_2017_2022']} changed winner.",
        data=[f"Same winner in 2012, 2017 and 2022 (of {cs['booths_with_3_elections']} traceable booths): " + ", ".join(f"{k} {v}" for k, v in cs["core_3_of_3"].items()) + ".",
              "Biggest switches 2017→2022: " + ", ".join(f"{k} {v}" for k, v in list(flows.items())[:4]) + " booths.",
              f"Same winner 2017 and 2022: " + ", ".join(f"{k} {v}" for k, v in cs["same_winner_2017_2022"].items()) + ".",
              f"Booths were renumbered (384 in 2017, 464 in 2022); {d['booth_matching']['VS2022->VS2017']['matched']} of 464 could be traced by name."],
        actions=["Every party: treat its few core booths as anchors, not as safe; they are a small share of the seat.",
                 "Every party: study the booths that left it in 2022 and talk to local workers there.",
                 "Re-trace these booths to 2026 numbers before field use."]),
        dict(
        title="पक्के बूथ कम हैं; ज़्यादातर बूथ पलटे",
        summary=f"2017 से 2022 तक पहचाने जा सके {cs['booths_with_2017_match']} बूथों में से {cs['changed_2017_2022']} पर विजेता बदला।",
        data=[f"2012, 2017 और 2022 तीनों में एक ही विजेता ({cs['booths_with_3_elections']} पहचाने गए बूथों में): " + ", ".join(f"{k} {v}" for k, v in cs["core_3_of_3"].items()) + "।",
              "2017→2022 सबसे बड़े बदलाव: " + ", ".join(f"{k} {v}" for k, v in list(flows.items())[:4]) + " बूथ।",
              "2017 और 2022 में वही विजेता: " + ", ".join(f"{k} {v}" for k, v in cs["same_winner_2017_2022"].items()) + "।",
              f"बूथ नंबर बदले (2017 में 384, 2022 में 464); 464 में से {d['booth_matching']['VS2022->VS2017']['matched']} बूथ नाम से पहचाने जा सके।"],
        actions=["हर पार्टी: अपने गिने-चुने पक्के बूथों को आधार माने, सुरक्षित नहीं; ये सीट का छोटा हिस्सा हैं।",
                 "हर पार्टी: 2022 में जो बूथ हाथ से गए, वहाँ के स्थानीय कार्यकर्ताओं से बात करे।",
                 "मैदान में इस्तेमाल से पहले इन बूथों को 2026 के नंबरों से मिलाएँ।"]),
        dict(en=["Core booths held", "Lost booths visited"], hi=["बचाए गए पक्के बूथ", "हाथ से गए बूथों में दौरे"]),
        table(["Change 2017→2022 / बदलाव", "Booths / बूथ"], [[esc(k), n(v)] for k, v in flows.items()]))

    wt = w["top"]
    pts["4f"] = point("p4f", dict(
        title="Women-majority booths",
        summary=f"More women than men voted in {w['booths_women_more_than_men_2022']} of {w['of']} booths in 2022.",
        data=[f"Women were {pc(w['female_turnout_share_2022'])} of all 2022 voters.",
              f"Largest gap: booth {wt[0]['booth']} ({wt[0]['female']} women, {wt[0]['male']} men).",
              "Winners in the 10 widest women-majority booths: " + ", ".join(f"{k} {v}" for k, v in sorted(__import__('collections').Counter(x['winner'] for x in wt).items())) + ".",
              f"The 2026 list has {w['women_only_ps_2026']} women-only polling stations."],
        actions=["Every party: send women workers to these booths for roll checks and meetings.",
                 "Every party: hear women voters' issues (water, roads, safety, schemes) directly.",
                 "Keep all contact within the law: no gifts or cash."]),
        dict(
        title="महिला-बहुल बूथ",
        summary=f"2022 में {w['of']} में से {w['booths_women_more_than_men_2022']} बूथों पर पुरुषों से ज़्यादा महिलाओं ने वोट डाला।",
        data=[f"2022 में कुल वोटरों में {pc(w['female_turnout_share_2022'])} महिलाएँ थीं।",
              f"सबसे बड़ा अंतर: बूथ {wt[0]['booth']} ({wt[0]['female']} महिलाएँ, {wt[0]['male']} पुरुष)।",
              "सबसे ज़्यादा महिला-बहुल 10 बूथों में विजेता: " + ", ".join(f"{k} {v}" for k, v in sorted(__import__('collections').Counter(x['winner'] for x in wt).items())) + "।",
              f"2026 की सूची में सिर्फ़ महिलाओं के लिए {w['women_only_ps_2026']} मतदेय स्थल हैं।"],
        actions=["हर पार्टी: इन बूथों में सूची जाँच और बैठकों के लिए महिला कार्यकर्ता भेजे।",
                 "हर पार्टी: महिला वोटरों की बात (पानी, सड़क, सुरक्षा, योजनाएँ) सीधे सुने।",
                 "हर संपर्क कानून के दायरे में: कोई उपहार या नकद नहीं।"]),
        dict(en=["Women workers per booth", "Women's meetings held"], hi=["हर बूथ पर महिला कार्यकर्ता", "हुई महिला बैठकें"]),
        table(["Booth", "Name / नाम", "Women / महिलाएँ", "Men / पुरुष", "Winner 2022"],
              [[x["booth"], esc(x["name"]), n(x["female"]), n(x["male"]), chip(x["winner"]) if x["winner"] in PARTY_ORDER else esc(x["winner"])] for x in wt]))

    sv = d["villages"]
    pts["4g"] = point("p4g", dict(
        title="Villages split across booths and parties",
        summary=f"{sv['multi_booth_villages']} villages have more than one booth; in {sv['split_count']} of them the booths voted for different parties in 2022.",
        data=[f"Largest split: {esc(sv['split_villages'][0]['village'])} — {sv['split_villages'][0]['booths']} booths: " + ", ".join(f"{k} {v}" for k, v in sv['split_villages'][0]['winners'].items()) + ".",
              f"{esc(sv['split_villages'][1]['village'])}: " + ", ".join(f"{k} {v}" for k, v in sv['split_villages'][1]['winners'].items()) + ".",
              f"{esc(sv['split_villages'][2]['village'])}: " + ", ".join(f"{k} {v}" for k, v in sv['split_villages'][2]['winners'].items()) + ".",
              f"Village names are from the 2026 list; {d['booth_matching']['VS2022->PS2026']['matched']} of 464 booths of 2022 could be traced to it."],
        actions=["Every party: treat each tola (hamlet) of a split village as its own unit.",
                 "Every party: find out why neighbouring booths of one village voted differently.",
                 "Assign one worker per tola, not one per village."]),
        dict(
        title="गाँव जो बूथों और पार्टियों में बँटे",
        summary=f"{sv['multi_booth_villages']} गाँवों में एक से ज़्यादा बूथ हैं; इनमें से {sv['split_count']} में 2022 में अलग-अलग बूथों ने अलग पार्टी को जिताया।",
        data=[f"सबसे बड़ा बँटवारा: {esc(sv['split_villages'][0]['village'])} — {sv['split_villages'][0]['booths']} बूथ: " + ", ".join(f"{k} {v}" for k, v in sv['split_villages'][0]['winners'].items()) + "।",
              f"{esc(sv['split_villages'][1]['village'])}: " + ", ".join(f"{k} {v}" for k, v in sv['split_villages'][1]['winners'].items()) + "।",
              f"{esc(sv['split_villages'][2]['village'])}: " + ", ".join(f"{k} {v}" for k, v in sv['split_villages'][2]['winners'].items()) + "।",
              f"गाँवों के नाम 2026 की सूची से हैं; 2022 के 464 में से {d['booth_matching']['VS2022->PS2026']['matched']} बूथ उससे मिलाए जा सके।"],
        actions=["हर पार्टी: बँटे गाँव के हर टोले को अलग इकाई माने।",
                 "हर पार्टी: पता करे कि एक ही गाँव के पास-पास के बूथों ने अलग वोट क्यों दिया।",
                 "हर गाँव पर एक नहीं, हर टोले पर एक कार्यकर्ता।"]),
        dict(en=["Tolas with a named worker", "Split villages visited"], hi=["नामित कार्यकर्ता वाले टोले", "बँटे गाँवों में दौरे"]),
        table(["Village 2026 / गाँव", "Booths 2022", "Winners / विजेता", "Booth nos."],
              [[esc(x["village"]), n(x["booths"]), ", ".join(f"{k} {v}" for k, v in x["winners"].items()), ", ".join(x["booth_ids"])] for x in sv["split_villages"][:15]]))

    # ------------------------------------------------------------- 6. SWOT
    swot_cards = []
    for p in parties22:
        x = pb22[p]
        b = x["bands"]
        s_en = f"First in {x['won']} booths; {b['kila'] + b['mazboot']} booths with 100+ lead; {x['strong_60']} booths above 60%."
        w_en = f"Below 15% in {x['weak_15']} booths; {b['red_alert']} booths behind by 200+."
        o_en = f"{b['palatne_layak']} booths behind by under 100 votes ({n(x['flip_votes_palatne'])} votes would flip them)."
        t_en = f"{b['swing_badhat']} booths ahead by under 100 votes (total cushion {n(x['cushion_swing'])})."
        s_hi = f"{x['won']} बूथों पर पहले; {b['kila'] + b['mazboot']} बूथों पर 100+ की बढ़त; {x['strong_60']} बूथों पर 60% से ज़्यादा।"
        w_hi = f"{x['weak_15']} बूथों पर 15% से कम; {b['red_alert']} बूथों पर 200+ से पीछे।"
        o_hi = f"{b['palatne_layak']} बूथों पर 100 से कम वोट से पीछे ({n(x['flip_votes_palatne'])} वोट से ये पलट सकते हैं)।"
        t_hi = f"{b['swing_badhat']} बूथों पर 100 से कम की बढ़त (कुल गद्दी {n(x['cushion_swing'])})।"
        extra = ""
        if p == nda22 and "BJP" in pb24:
            y = pb24["BJP"]
            extra = (f"<p class='note'>NDA in 2024 Lok Sabha (BJP candidate): first in {y['won']} booths, {pc(next(c['share'] for c in l24['candidates'] if c['party']=='BJP'))} share. / "
                     f"2024 लोकसभा में NDA (भाजपा उम्मीदवार): {y['won']} बूथों पर पहले।</p>")
        swot_cards.append(f"""<div class="swot"><h4>{chip(p)} {esc(pname(p, 'en'))} / {esc(pname(p, 'hi'))}{' — NDA 2022' if p == nda22 else ''}</h4>
<dl><dt>Strength / ताक़त</dt><dd>{s_en}<br><span class="hi">{s_hi}</span></dd>
<dt>Weakness / कमज़ोरी</dt><dd>{w_en}<br><span class="hi">{w_hi}</span></dd>
<dt>Opportunity / मौक़ा</dt><dd>{o_en}<br><span class="hi">{o_hi}</span></dd>
<dt>Threat / ख़तरा</dt><dd>{t_en}<br><span class="hi">{t_hi}</span></dd></dl>{extra}</div>""")
    inc = next((c for c in v22["candidates"] if c["party"] == "INC"), None)
    if inc:
        swot_cards.append(f"""<div class="swot"><h4>{chip('INC')} {esc(pname('INC', 'en'))} / {esc(pname('INC', 'hi'))}</h4>
<dl><dt>Position / स्थिति</dt><dd>2022: {n(inc['votes'])} votes ({pc(inc['share'])}); 2012: {pc(share['INC'][0])}. Too small for a booth map; the base is under 1,000 votes per 100 booths.<br>
<span class="hi">2022: {n(inc['votes'])} वोट ({pc(inc['share'])}); 2012: {pc(share['INC'][0])}। बूथ नक्शे के लिए आधार बहुत छोटा।</span></dd></dl></div>""")
    pts["6"] = f'<article class="point" id="p6"><div class="swotgrid">{"".join(swot_cards)}</div></article>'

    # ------------------------------------------------------------- 7. positioning / vote math
    pool22 = v22["total_votes_counted"]
    proj_votes = round(ps["electors"] * v22["turnout"] / 100)
    lines = []
    for p, base22, base24 in [("SP", pb22["SP"]["votes"], pb24["SP"]["votes"]), (nda22 + " / BJP (NDA)", pb22[nda22]["votes"], pb24["BJP"]["votes"]), ("BSP", pb22["BSP"]["votes"], pb24["BSP"]["votes"])]:
        lines.append([esc(p), n(base22), pc(100 * base22 / pool22), n(base24), pc(100 * base24 / l24["total_votes_counted"]),
                      n(max(0, round(0.38 * proj_votes) - base22)), n(max(0, round(0.44 * proj_votes) - base22))])
    if bye:
        lines.append(["Bye-election 2024 / उपचुनाव 2024", "–", "–", "–", "–", "–", "–"])
    pts["7a"] = point("p7a", dict(
        title="Vote math: if the candidate is from party X",
        summary=f"At 2022 turnout and the 2026 list, about ~{n(proj_votes)} votes will be cast; a win needs roughly ~{n(round(0.38 * proj_votes))}–{n(round(0.44 * proj_votes))}.",
        data=[f"SP base: 2022 {n(pb22['SP']['votes'])} ({pc(share['SP'][2])}); 2024 LS segment {n(pb24['SP']['votes'])} ({pc(l24['winner']['share'])}).",
              f"NDA base: 2022 {nda22} {n(pb22[nda22]['votes'])} ({pc(nda_share22)}); 2024 LS segment BJP {n(pb24['BJP']['votes'])} ({pc(l24['runner_up']['share'])}).",
              f"BSP base: 2022 {n(pb22['BSP']['votes'])} ({pc(share['BSP'][2])}); 2024 LS segment {n(pb24['BSP']['votes'])}; 2017 {n(next(c['votes'] for c in v17['candidates'] if c['party']=='BSP'))} (won).",
              "Bases are party results with past candidates; a new candidate can move them either way." + (f" Bye-election 2024: {bye['winner_party']} {n(bye['winner_votes'])}, {bye['runner_party']} {n(bye['runner_votes'])}." if bye else "")],
        actions=["Every party: start from its lower base (worst of 2022/2024), not the best.",
                 "Every party: count the extra votes needed and assign them to booths in the 'can be flipped' band.",
                 "Re-run this math when the final 2027 roll is published."]),
        dict(
        title="वोट गणित: अगर उम्मीदवार पार्टी X से हो",
        summary=f"2022 जितने मतदान और 2026 की सूची से ~{n(proj_votes)} वोट पड़ेंगे; जीत के लिए लगभग ~{n(round(0.38 * proj_votes))}–{n(round(0.44 * proj_votes))} वोट चाहिए।",
        data=[f"सपा का आधार: 2022 {n(pb22['SP']['votes'])} ({pc(share['SP'][2])}); 2024 लोकसभा में यहाँ {n(pb24['SP']['votes'])} ({pc(l24['winner']['share'])})।",
              f"NDA का आधार: 2022 {nda22} {n(pb22[nda22]['votes'])} ({pc(nda_share22)}); 2024 लोकसभा में भाजपा {n(pb24['BJP']['votes'])} ({pc(l24['runner_up']['share'])})।",
              f"बसपा का आधार: 2022 {n(pb22['BSP']['votes'])} ({pc(share['BSP'][2])}); 2024 लोकसभा {n(pb24['BSP']['votes'])}; 2017 {n(next(c['votes'] for c in v17['candidates'] if c['party']=='BSP'))} (जीत)।",
              "ये आधार पुराने उम्मीदवारों के साथ पार्टी के नतीजे हैं; नया उम्मीदवार इन्हें किसी भी तरफ़ बदल सकता है।" + (f" 2024 उपचुनाव: {bye['winner_party']} {n(bye['winner_votes'])}, {bye['runner_party']} {n(bye['runner_votes'])}।" if bye else "")],
        actions=["हर पार्टी: सबसे अच्छे नहीं, सबसे कम आधार (2022/2024 में कम वाला) से शुरू करे।",
                 "हर पार्टी: कितने अतिरिक्त वोट चाहिए, गिने और उन्हें 'पलटने लायक' बूथों में बाँटे।",
                 "2027 की अंतिम सूची आने पर यह गणित दोबारा करें।"]),
        dict(en=["Base votes per booth", "Extra votes assigned to booths", "Projected share vs 38%"],
             hi=["हर बूथ पर आधार वोट", "बूथों को सौंपे अतिरिक्त वोट", "अनुमानित हिस्सा बनाम 38%"]),
        table(["Party / पार्टी", "2022 votes", "2022 %", "2024 LS votes", "2024 LS %", "Extra for ~38% / अतिरिक्त", "Extra for ~44%"], lines))

    plan = f.get("plan", [])
    pts["7b"] = point("p7b", dict(
        title="120-day plan (same for every party)",
        summary="Four 30-day blocks, from the roll check to polling day. Only legal campaign work.",
        data=[esc(x[0]) for x in plan],
        actions=["Name one person responsible for each block.", "Review the KPIs every week.", "Follow the model code of conduct from the day it starts."]),
        dict(title="120 दिन की योजना (हर पार्टी के लिए एक जैसी)",
             summary="सूची जाँच से मतदान दिवस तक चार 30-दिन के खंड। सिर्फ़ कानूनी प्रचार कार्य।",
             data=[esc(x[1]) for x in plan],
             actions=["हर खंड के लिए एक ज़िम्मेदार व्यक्ति तय करें।", "हर हफ़्ते KPI देखें।", "आचार संहिता लागू होने के दिन से उसका पालन करें।"]),
        dict(en=["Booths with full committee", "Roll entries checked", "Agents trained"], hi=["पूरी समिति वाले बूथ", "जाँची गई प्रविष्टियाँ", "प्रशिक्षित एजेंट"]),
        table(["Days / दिन", "Work / काम"], [[esc(x[2]), esc(x[0]) + "<br><span class='hi'>" + esc(x[1]) + "</span>"] for x in plan]))

    take = f.get("takeaways", [])
    pts["7c"] = ('<article class="point" id="p7c"><ol class="take">'
                 + "".join(f"<li><b>{esc(a)}</b><br><span class='hi'>{esc(b)}</span></li>" for a, b in take) + "</ol></article>")
    return pts


CSS = """
:root{--bg:#f6f7f5;--paper:#ffffff;--ink:#16191d;--ink2:#4b525b;--mute:#7b828b;--line:#dfe2e0;--accent:#1f5f5b;--accent-soft:#e3efed;
--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--s4:#eda100;--s5:#e87ba4;--s0:#8a9099;--warn:#b54708;
--f-display:'Archivo',system-ui,sans-serif;--f-body:'Hind','Archivo',system-ui,sans-serif;--f-mono:'JetBrains Mono',ui-monospace,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#121514;--paper:#1a1e1d;--ink:#eef0ee;--ink2:#b9c0bd;--mute:#8d9592;--line:#2c3331;--accent:#7cc7bd;--accent-soft:#1f2d2b;
--s1:#3987e5;--s2:#d95926;--s3:#199e70;--s4:#c98500;--s5:#d55181;--s0:#8a9099;--warn:#f0a05a;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#121514;--paper:#1a1e1d;--ink:#eef0ee;--ink2:#b9c0bd;--mute:#8d9592;--line:#2c3331;--accent:#7cc7bd;--accent-soft:#1f2d2b;
--s1:#3987e5;--s2:#d95926;--s3:#199e70;--s4:#c98500;--s5:#d55181;--s0:#8a9099;--warn:#f0a05a;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font-family:var(--f-body);font-size:15.5px;line-height:1.55}
.wrap{max-width:1180px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:20px 60px}
header.top{display:grid;gap:6px;padding-block:18px 14px;border-bottom:2px solid var(--ink)}
.eyebrow{font-family:var(--f-mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2)}
h1{font-family:var(--f-display);font-weight:800;font-size:clamp(28px,5vw,46px);line-height:1.05;margin:0;text-wrap:balance}
h1 .no{font-family:var(--f-mono);font-weight:500;color:var(--accent)}
.sub{color:var(--ink2);margin:0}
.bar{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--bg);display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding-block:10px;border-bottom:1px solid var(--line)}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:var(--bg)}
.bar nav{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:13px}
.bar nav a{color:var(--ink2);text-decoration:none}.bar nav a:hover{color:var(--accent)}
.seg{margin-left:auto;display:inline-flex;border:1px solid var(--line);border-radius:6px;overflow:hidden}
.seg button{font:inherit;font-size:13px;background:var(--paper);color:var(--ink);border:0;padding:5px 10px;cursor:pointer}
.seg button[aria-pressed="true"]{background:var(--accent);color:var(--paper)}
.seg button:focus-visible,select:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
section{padding-block:26px 6px}
h2{font-family:var(--f-display);font-size:24px;margin:0 0 4px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
h2 .n{font-family:var(--f-mono);font-size:14px;color:var(--accent)}
h2 .hi{font-family:var(--f-body);font-weight:600;color:var(--ink2);font-size:19px}
.point>*,.lang,details{min-width:0}
.point{background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:18px;margin-block:14px;display:grid;gap:14px;min-width:0}
.lang h3{font-family:var(--f-display);font-size:19px;margin:0 0 2px;text-wrap:balance}
.lang.hi h3{font-family:var(--f-body);font-weight:700}
.lang.hi{border-top:1px dashed var(--line);padding-top:12px}
.sum{margin:0 0 8px;color:var(--ink2);font-weight:500}
.cols{display:grid;grid-template-columns:1.25fr 1fr;gap:18px}
.cols>div{min-width:0}
@media (max-width:760px){.cols{grid-template-columns:1fr}}
h4{font-size:12px;font-family:var(--f-mono);text-transform:uppercase;letter-spacing:.07em;color:var(--mute);margin:6px 0 4px}
h5{font-size:14px;margin:12px 0 6px}
ul{margin:0;padding-left:18px}li{margin-block:3px}
ul.act li::marker{content:"→  ";color:var(--accent)}
ul.kpi{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:6px}ul.kpi li{margin:0;font-size:12.5px;border:1px solid var(--line);border-radius:999px;padding:2px 9px;color:var(--ink2)}
details.ev>summary,details>summary{cursor:pointer;font-size:13px;color:var(--accent);font-weight:600;padding-block:4px}
.tw{overflow-x:auto;max-width:100%}
table{border-collapse:collapse;font-size:13px;width:100%;font-variant-numeric:tabular-nums}
th,td{padding:5px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{font-weight:600;color:var(--ink2);background:var(--bg);position:sticky;top:0}
td:not(:nth-child(2)){white-space:nowrap}
table.bands td{text-align:right}table.bands td:first-child{text-align:left}
th .hi,span.hi{color:var(--ink2);font-weight:400}
.chip{display:inline-block;font-family:var(--f-mono);font-size:11.5px;font-weight:600;padding:1px 7px;border-radius:4px;color:var(--ink);background:var(--bg);border-left:4px solid var(--s0)}
.chip.s1{border-color:var(--s1)}.chip.s2{border-color:var(--s2)}.chip.s3{border-color:var(--s3)}.chip.s4{border-color:var(--s4)}.chip.s5{border-color:var(--s5)}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:4px 18px}.grid2>*{min-width:0}
.swotgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px}
.swot{border:1px solid var(--line);border-radius:6px;padding:12px;min-width:0}.swot h4{font-family:var(--f-body);text-transform:none;letter-spacing:0;font-size:15px;color:var(--ink);margin:0 0 6px}
dl{margin:0;display:grid;gap:6px}dt{font-family:var(--f-mono);font-size:11.5px;text-transform:uppercase;color:var(--mute)}dd{margin:0;font-size:14px}
li a{overflow-wrap:anywhere}
.note{font-size:13px;color:var(--ink2);margin:8px 0 0}
ol.take{margin:0;padding-left:22px;display:grid;gap:10px}
.chart{display:grid;gap:10px}
.chart .row{display:grid;grid-template-columns:110px 1fr;gap:10px;align-items:center}
.chart .lbl{font-size:13px;color:var(--ink2)}
.stack{display:flex;height:26px;gap:2px}
.stack span{display:block;height:100%;border-radius:2px}
.stack span:first-child{border-radius:4px 2px 2px 4px}.stack span:last-child{border-radius:2px 4px 4px 2px}
.legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;color:var(--ink2)}
.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:13px}
.tools label{display:flex;gap:6px;align-items:center}
select,input[type=search]{font:inherit;font-size:13px;padding:5px 8px;border:1px solid var(--line);border-radius:6px;background:var(--paper);color:var(--ink);min-width:0}
#bx{max-height:520px;overflow:auto}
#bx th{cursor:pointer}
.count{color:var(--mute);font-size:12.5px}
.internal{border:1px dashed var(--warn);background:transparent}
.internal h2{color:var(--warn)}
.tip{position:fixed;pointer-events:none;background:var(--ink);color:var(--paper);font-size:12px;padding:5px 8px;border-radius:4px;z-index:20;display:none;max-width:260px}
body.only-en .lang.hi,body.only-hi .lang.en{display:none}
body.only-en .lang.en+.lang.hi{display:none}
body.only-hi .lang.hi{border-top:0;padding-top:0}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
"""


def page(d, f, pts, errors):
    ac, name = d["ac_no"], f.get("ac_name_en", d["ac_name"])
    master = json.dumps(d["master"], ensure_ascii=False)
    elect = json.dumps({e: dict(cands=[dict(p=c["party"], v=c["votes"], s=c["share"], c=c["candidate"]) for c in s["candidates"]],
                                margin=s["margin"], turnout=s["turnout"]) for e, s in d["elections"].items()}, ensure_ascii=False)
    if f.get("bye2024"):
        b = f["bye2024"]
        elect = elect[:-1] + ',"BYE2024":' + json.dumps(dict(cands=b.get("candidates", []), margin=b["margin"], turnout=b.get("turnout"))) + "}"
    nav = [("p1", "1 Seat"), ("p2a", "2 Ground"), ("p3", "3 Record"), ("p4a", "4 Booth map"), ("p6", "6 SWOT"), ("p7a", "7 Positioning"), ("explore", "Explorer"), ("internal", "Data notes")]
    sec = lambda num, en, hi, body: f'<section id="s{num}"><h2><span class="n">{num}</span>{en}<span class="hi">{hi}</span></h2>{body}</section>'  # noqa: E731
    body = (
        sec("1", "Seat introduction", "सीट परिचय", pts["1"])
        + sec("2", "Ground picture", "ज़मीनी तस्वीर", pts["2a"] + pts.get("2b", ""))
        + sec("3", "Election record", "चुनावी रिकॉर्ड", '<article class="point"><div id="share-chart" class="chart" aria-label="Vote share by election"></div></article>' + pts["3"])
        + sec("4", "Party-wise booth map", "पार्टी-वार बूथ नक्शा", pts["4a"] + pts["4b"] + pts["4c"] + pts["4d"] + pts["4e"] + pts["4f"] + pts["4g"]
              + '<article class="point"><p class="sum">Block / zone breakdown: the polling-station list for this seat does not name blocks or zones, so this view is not shown yet. / ब्लॉक-ज़ोन: इस सीट की मतदेय स्थल सूची में ब्लॉक या ज़ोन नहीं लिखा, इसलिए यह हिस्सा अभी नहीं है।</p></article>')
        + sec("5", "Social equation", "जाति समीकरण", '<article class="point"><p class="sum">Left out on purpose: this dossier does not use caste estimates. / जानबूझकर छोड़ा गया: इस डोज़ियर में जाति के अनुमान शामिल नहीं हैं।</p></article>')
        + sec("6", "SWOT by party (from booth data)", "पार्टी-वार SWOT (बूथ डेटा से)", pts["6"])
        + sec("7", "Candidate positioning", "उम्मीदवार की स्थिति", pts["7a"] + pts["7b"] + '<h3 style="margin:18px 0 0">6 big takeaways / 6 बड़ी बातें</h3>' + pts["7c"])
    )
    explorer = """<section id="explore"><h2><span class="n">▤</span>Compare & explore<span class="hi">तुलना और बूथ एक्सप्लोरर</span></h2>
<article class="point"><div class="tools"><label for="ea">Election A</label><select id="ea"></select><label for="eb">Election B</label><select id="eb"></select></div><div id="cmp"></div></article>
<article class="point"><div class="tools">
<label for="q">Search / खोजें</label><input id="q" type="search" placeholder="booth no, school or village">
<label for="fw">Winner 2022</label><select id="fw"><option value="">All / सभी</option></select>
<label for="fp">Margin band for</label><select id="fp"></select><select id="fb" aria-label="band"><option value="">All bands</option></select>
<span class="count" id="cnt"></span></div>
<div class="tw" id="bx"><table><thead><tr id="bxh"></tr></thead><tbody id="bxb"></tbody></table></div></article></section>"""
    internal = f"""<section id="internal"><article class="point internal"><h2><span class="n">!</span>For you only: data errors found<span class="hi">सिर्फ़ आपके लिए: डेटा में जो गलतियाँ या उल्टा-पुल्टा मिला</span></h2>
<p class="sum">Not for the presentation. / प्रेज़ेंटेशन के लिए नहीं।</p><ul>{''.join(f'<li>{x}</li>' for x in errors)}</ul>
<h4>Cross-checks / जाँच</h4>{table(['Check', 'Result', 'Detail'], [[esc(c['check']), '✔ pass' if c['ok'] else '✖ fail', esc(c['detail'])] for c in d['checks']])}
<h4>Sources for news facts / ख़बरों के स्रोत</h4><ul>{''.join(f'<li><a href="{esc(u)}" target="_blank" rel="noopener">{esc(u)}</a></li>' for u in f.get('sources', []))}</ul></article></section>"""
    js = r"""
const M=__MASTER__, EL=__ELECT__;
const ORDER=['BSP','BJP','SP','NISHAD','INC'];
const slot=p=>{const i=ORDER.indexOf(p);return i<0?0:i+1};
const nf=x=>x==null?'–':Number(x).toLocaleString('en-IN');
const LBL={VS2012:'Assembly 2012',LS2014:'Lok Sabha 2014',VS2017:'Assembly 2017',LS2019:'Lok Sabha 2019',VS2022:'Assembly 2022',LS2024:'Lok Sabha 2024',BYE2024:'Bye-election 2024'};
// language toggle
const setLang=l=>{document.body.classList.toggle('only-en',l==='en');document.body.classList.toggle('only-hi',l==='hi');
 document.querySelectorAll('.seg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.l===l)));try{localStorage.setItem('lang',l)}catch(e){}};
document.querySelectorAll('.seg button').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.l)));
try{setLang(localStorage.getItem('lang')||'both')}catch(e){setLang('both')}
// tooltip
const tip=document.createElement('div');tip.className='tip';document.body.appendChild(tip);
const showTip=(e,t)=>{tip.textContent=t;tip.style.display='block';tip.style.left=Math.min(e.clientX+12,innerWidth-270)+'px';tip.style.top=(e.clientY+12)+'px'};
const hideTip=()=>tip.style.display='none';
// share chart (stacked bars, one per election, parties in fixed order)
(function(){const el=document.getElementById('share-chart');const es=['VS2012','LS2014','VS2017','LS2019','VS2022','LS2024'].concat(EL.BYE2024&&EL.BYE2024.cands.length?['BYE2024']:[]);
 let h='<div class="legend">'+ORDER.map(p=>`<span><i style="background:var(--s${slot(p)})"></i>${p}</span>`).join('')+'<span><i style="background:var(--s0)"></i>Others</span></div>';
 es.forEach(e=>{const c=EL[e].cands.filter(x=>x.p!=='NOTA');let tot=c.reduce((a,x)=>a+x.v,0);const by={};c.forEach(x=>{const k=ORDER.includes(x.p)?x.p:'Others';by[k]=(by[k]||0)+x.v});
  const segs=ORDER.concat(['Others']).filter(k=>by[k]).map(k=>{const s=100*by[k]/tot;return `<span data-t="${LBL[e]} · ${k}: ${nf(by[k])} (${s.toFixed(1)}%)" style="width:${s}%;background:var(--s${k==='Others'?0:slot(k)})"></span>`}).join('');
  h+=`<div class="row"><div class="lbl">${LBL[e]}</div><div class="stack" role="img" aria-label="${LBL[e]} vote share">${segs}</div></div>`});
 el.innerHTML='<h3 style="margin:0">Vote share by election / चुनाव-वार वोट हिस्सा</h3>'+h;
 el.querySelectorAll('.stack span').forEach(s=>{s.addEventListener('mousemove',e=>showTip(e,s.dataset.t));s.addEventListener('mouseleave',hideTip)});})();
// compare
const ea=document.getElementById('ea'),eb=document.getElementById('eb');
Object.keys(EL).filter(e=>EL[e].cands.length).forEach(e=>{ea.add(new Option(LBL[e],e));eb.add(new Option(LBL[e],e))});ea.value='VS2017';eb.value='VS2022';
function cmp(){const a=EL[ea.value],b=EL[eb.value];const share=(E,p)=>{const x=E.cands.filter(c=>c.p===p);return x.length?x.reduce((s,c)=>s+c.s,0):null};
 const ps=ORDER.concat(['NOTA']);let r='<div class="tw"><table><thead><tr><th>Party</th><th>'+LBL[ea.value]+'</th><th>'+LBL[eb.value]+'</th><th>Change / बदलाव (points)</th></tr></thead><tbody>';
 ps.forEach(p=>{const x=share(a,p),y=share(b,p);if(x==null&&y==null)return;const d=(x!=null&&y!=null)?(y-x):null;
  r+=`<tr><td><span class="chip s${slot(p)}">${p}</span></td><td>${x==null?'did not contest / नहीं लड़ी':x.toFixed(1)+'%'}</td><td>${y==null?'did not contest / नहीं लड़ी':y.toFixed(1)+'%'}</td><td>${d==null?'–':(d>0?'+':'')+d.toFixed(1)}</td></tr>`});
 r+=`<tr><td>Margin / अंतर</td><td>${nf(a.margin)}</td><td>${nf(b.margin)}</td><td></td></tr><tr><td>Turnout / मतदान</td><td>${a.turnout==null?'–':a.turnout+'%'}</td><td>${b.turnout==null?'–':b.turnout+'%'}</td><td></td></tr></tbody></table></div>`;
 document.getElementById('cmp').innerHTML=r}
ea.onchange=eb.onchange=cmp;cmp();
// booth explorer
const P=Object.keys(M[0]).filter(k=>k.endsWith('_22')).map(k=>k.slice(0,-3));
const cols=[['booth22','Booth 2022'],['name22','Name 2022'],['ps2026','PS 2026'],['village2026','Village 2026 / गाँव'],['electors2026','Voters 2026'],['electors22','Voters 2022'],['turnout22','Turnout 2022'],['winner22','Winner 2022'],['margin22','Margin 2022']].concat(P.map(p=>[p+'_22',p+' 2022'])).concat([['winner17','Winner 2017'],['winner12','Winner 2012']]);
document.getElementById('bxh').innerHTML=cols.map(c=>`<th data-k="${c[0]}" scope="col">${c[1]}</th>`).join('');
const fw=document.getElementById('fw'),fp=document.getElementById('fp'),fb=document.getElementById('fb'),q=document.getElementById('q');
[...new Set(M.map(r=>r.winner22))].sort().forEach(w=>fw.add(new Option(w,w)));P.forEach(p=>fp.add(new Option(p,p)));
const BANDS=[['kila','Fortress 200+',200,1e9],['mazboot','Strong 100–199',100,199],['swing','Swing lead 1–99',1,99],['flip','Can flip −1…−99',-99,-1],['hard','Hard −100…−199',-199,-100],['red','Red alert −200+',-1e9,-200]];
BANDS.forEach(b=>fb.add(new Option(b[1],b[0])));
let sk='booth22',sd=1;
const lead=(r,p)=>{const o=P.filter(x=>x!==p).map(x=>r[x+'_22']);return r[p+'_22']-Math.max(...o)};
function render(){const t=q.value.trim().toLowerCase();let rows=M.filter(r=>(!fw.value||r.winner22===fw.value)&&(!t||[r.booth22,r.name22,r.village2026,r.ps2026].join(' ').toLowerCase().includes(t)));
 if(fb.value){const b=BANDS.find(x=>x[0]===fb.value);rows=rows.filter(r=>{const l=lead(r,fp.value);return l>=b[2]&&l<=b[3]})}
 rows.sort((a,b)=>{const x=a[sk],y=b[sk];const nx=parseFloat(x),ny=parseFloat(y);if(!isNaN(nx)&&!isNaN(ny))return (nx-ny)*sd;return String(x??'').localeCompare(String(y??''))*sd});
 document.getElementById('cnt').textContent=rows.length+' booths / बूथ';
 document.getElementById('bxb').innerHTML=rows.map(r=>'<tr>'+cols.map(c=>{const v=r[c[0]];if(c[0].startsWith('winner'))return `<td>${v?`<span class="chip s${slot(v)}">${v}</span>`:'–'}</td>`;return `<td>${v==null?'–':(typeof v==='number'?nf(v):v)}</td>`}).join('')+'</tr>').join('')}
document.querySelectorAll('#bxh th').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.k;sd=(sk===k)?-sd:1;sk=k;render()}));
[q,fw,fp,fb].forEach(x=>x.addEventListener('input',render));render();
"""
    js = js.replace("__MASTER__", master).replace("__ELECT__", elect)
    title = f"{name} War Dossier 2027"
    return f"""<title>{esc(title)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Hind:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">
<style>{CSS}</style>
<div class="wrap">
<header class="top"><div class="eyebrow">Vidhan Sabha War Dossier 2027 · विधानसभा वॉर डोज़ियर 2027</div>
<h1><span class="no">{ac}</span> {esc(name)} · {esc(f.get('ac_name_hi', ''))}</h1>
<p class="sub">{esc(f.get('district_en', d['district']))} · {esc(f.get('pc', ''))} · Neutral fact sheet for all parties / सभी पार्टियों के लिए तटस्थ तथ्य-पत्र · Updated {esc(f.get('updated', ''))}</p></header>
<div class="bar"><nav aria-label="Sections">{''.join(f'<a href="#{a}">{b}</a>' for a, b in nav)}</nav>
<div class="seg" role="group" aria-label="Language"><button data-l="both" aria-pressed="true">EN + हिंदी</button><button data-l="en" aria-pressed="false">EN</button><button data-l="hi" aria-pressed="false">हिंदी</button></div></div>
{body}{explorer}{internal}
</div>
<script>{js}</script>"""


def main():
    d = json.load(open(sys.argv[1]))
    f = json.load(open(sys.argv[2]))
    pts = build(d, f)
    errors = f.get("errors", [])
    open(sys.argv[3], "w").write(page(d, f, pts, errors))


if __name__ == "__main__":
    main()
