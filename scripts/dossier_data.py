"""Compute all numbers for a Vidhan Sabha dossier from the Form-20 dataset and
the 2026 polling station list. Output: JSON consumed by dossier_html.py.

usage: python3 dossier_data.py AC_NO [overrides.json] > out.json
overrides.json may give {"party": {"LS2024": {"CANDIDATE": "PARTY"}}, ...}
"""
import json
import re
import sys
from collections import Counter, defaultdict

import pandas as pd

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from skeleton import skeletons  # noqa: E402

DATA = "/home/user/rohan-kumar/data"
ELECTIONS = ["VS2012", "LS2014", "VS2017", "LS2019", "VS2022", "LS2024"]
MAJOR = ["BJP", "SP", "BSP", "INC", "NISHAD", "SBSP", "ADAL", "ADS", "RLD", "AIMIM", "ASP"]
BANDS = [("kila", 200, None), ("mazboot", 100, 199), ("swing_badhat", 1, 99),
         ("palatne_layak", -99, -1), ("kathin", -199, -100), ("red_alert", None, -200)]


# ---------------------------------------------------------------- loading
def load(ac, overrides):
    b = pd.read_csv(f"{DATA}/UP_Form20_booths.csv.gz", low_memory=False)
    b = b[b.ac_no == ac].copy()
    longs = []
    for e in ELECTIONS:
        lf = pd.read_csv(f"{DATA}/long/UP_Form20_{e}_long.csv.gz", low_memory=False)
        longs.append(lf[lf.ac_no == ac])
    v = pd.concat(longs)
    cand = pd.read_csv(f"{DATA}/UP_Form20_candidates_ac_totals.csv")
    cand = cand[cand.ac_no == ac].copy()
    # clean names: "(NAME)" -> NAME, trailing party in name
    for df in (v, cand):
        df["candidate"] = df.candidate.astype(str).str.strip().str.strip("()").str.strip()
    pmap = overrides.get("party", {})
    for e, m in pmap.items():
        m = {k.upper(): p for k, p in m.items()}
        for df in (v, cand):
            sel = (df.election == e) & df.candidate.str.upper().isin(m)
            df.loc[sel, "party_std"] = df.loc[sel, "candidate"].str.upper().map(m)
    for df in (v, cand):
        df["party_std"] = df.party_std.fillna("?").replace("", "?").replace({"NINSHAD": "NISHAD"})
    ps = pd.read_csv(f"{DATA}/polling_stations/UP_polling_stations_2026.csv.gz", dtype=str)
    ps = ps[ps.ac_no == str(ac)].copy()
    ps["ps_no"] = ps.ps_no.astype(int)
    ps["electors"] = pd.to_numeric(ps.electors, errors="coerce")
    return b, v, cand, ps


# ---------------------------------------------------------------- booth matching
MARK = [(r"\b(east|purvi)\b|पूर्वी|पूरबी", "E"), (r"\b(west|paschimi)\b|पश्चिमी|पश्‍चिमी", "W"),
        (r"\bnorth\b|उत्तरी", "N"), (r"\bsouth\b|दक्षिणी", "S"), (r"\b(extra|additional|atirikt)\b|अतिरिक्त", "X"),
        (r"\b(first|fist|i|1)\b|प्रथम|-1\b|\b1\b", "1"), (r"\b(second|ii|2)\b|द्वितीय|-2\b", "2"),
        (r"\b(third|iii|3)\b|तृतीय|-3\b", "3"), (r"\bleft\b|बायाँ|बायां", "L"), (r"\bright\b|दायाँ|दायां", "R")]


def marks(name):
    s = str(name or "").lower()
    return {m for rx, m in MARK if re.search(rx, s)}


def place(name):
    return {t for t in skeletons(name) if len(t) >= 2}


def sim(a, b):
    pa, pb = a["place"], b["place"]
    if not pa or not pb:
        return 0.0
    j = len(pa & pb) / len(pa | pb)
    ma, mb = a["marks"], b["marks"]
    m = 0.25 if ma == mb else (-0.15 if ma and mb and not (ma & mb) else 0)
    return j + m


def align(A, B, thr=0.45):
    """Monotonic alignment of two booth lists (same order on both lists mostly)."""
    n, m = len(A), len(B)
    W = [[0.0] * (m + 1) for _ in range(n + 1)]
    S = [[sim(A[i], B[j]) for j in range(m)] for i in range(n)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            best = max(W[i + 1][j], W[i][j + 1])
            if S[i][j] >= thr:
                best = max(best, S[i][j] + W[i + 1][j + 1])
            W[i][j] = best
    out, i, j = {}, 0, 0
    while i < n and j < m:
        if S[i][j] >= thr and abs(W[i][j] - (S[i][j] + W[i + 1][j + 1])) < 1e-9:
            out[i] = (j, round(S[i][j], 2))
            i += 1
            j += 1
        elif W[i][j] == W[i + 1][j]:
            i += 1
        else:
            j += 1
    return out


GENERIC_EXTRA = re.compile(r"\b(upper|parimary|primery|pratham|dwitiya|dvitiya|tritiya|extra|purvi|paschimi|pashchimi|"
                           r"uttari|dakshini|dakshni|room|schoolmeethepur|kaksh|no)\b|अतिरिक्त|कक्ष|प्रथम|द्वितीय|तृतीय", re.I)


def booth_list(df, name_col="booth_name"):
    return [dict(id=r.booth_id, no=r.booth_no, name=getattr(r, name_col),
                 place=place(GENERIC_EXTRA.sub(" ", str(getattr(r, name_col)))),
                 marks=marks(getattr(r, name_col))) for r in df.itertuples()]


def drop_common(*lists, frac=0.06):
    """Remove skeleton tokens that occur in many booths (school/room words, not place names)."""
    for lst in lists:
        df = Counter(t for x in lst for t in x["place"])
        common = {t for t, c in df.items() if c > max(4, frac * len(lst))}
        for x in lst:
            x["place"] = x["place"] - common
    return lists


# ---------------------------------------------------------------- metrics
def pct(a, b):
    return round(100.0 * a / b, 1) if b else None


def election_summary(e, b, v, cand):
    be = b[(b.election == e) & (b.is_postal == 0)]
    ce = cand[cand.election == e].sort_values("rank")
    total = int(ce.total_votes.sum())
    rows = []
    for r in ce.itertuples():
        rows.append(dict(rank=int(r.rank), candidate=r.candidate, party=r.party_std, votes=int(r.total_votes),
                         share=pct(r.total_votes, total)))
    valid = [r for r in rows if r["party"] != "NOTA"]
    win, run = valid[0], valid[1]
    el = be.electors.sum() if be.electors.notna().all() else None
    voters = be.voters_total.sum() if be.voters_total.notna().all() else None
    fem = be.voters_female.sum() if be.voters_female.notna().all() else None
    male = be.voters_male.sum() if be.voters_male.notna().all() else None
    postal = b[(b.election == e) & (b.is_postal == 1)].candidate_votes_total.sum()
    booth_sum = int(be.candidate_votes_total.sum() + be.nota.fillna(0).sum())
    return dict(election=e, booths=int(len(be)), electors=int(el) if el else None,
                voters=int(voters) if voters else None, turnout=pct(voters, el) if el and voters else None,
                female_voters=int(fem) if fem else None, male_voters=int(male) if male else None,
                female_share_of_voters=pct(fem, voters) if fem and voters else None,
                total_votes_counted=total, booth_votes_incl_nota=booth_sum, postal_votes=int(postal),
                candidates=rows, winner=win, runner_up=run, margin=win["votes"] - run["votes"],
                margin_pct=pct(win["votes"] - run["votes"], total),
                nota=next((r["votes"] for r in rows if r["party"] == "NOTA"), 0))


def booth_matrix(e, b, v):
    """booth x party votes (best candidate per party), plus booth meta."""
    ve = v[(v.election == e) & (v.booth_id != "POSTAL")]
    m = ve.pivot_table(index="booth_id", columns="party_std", values="votes", aggfunc="sum").fillna(0)
    be = b[(b.election == e) & (b.is_postal == 0)].set_index("booth_id")
    m = m.loc[[i for i in be.index if i in m.index]]
    return m, be


def party_booth_view(party, m, be):
    if party not in m.columns:
        return None
    others = m.drop(columns=[c for c in m.columns if c in (party, "NOTA")])
    best_other = others.max(axis=1)
    rival = others.idxmax(axis=1)
    tot = m.drop(columns=[c for c in m.columns if c == "NOTA"]).sum(axis=1)
    share = 100 * m[party] / tot.replace(0, pd.NA)
    lead = m[party] - best_other
    order = m.drop(columns=[c for c in m.columns if c == "NOTA"]).rank(axis=1, ascending=False, method="min")[party]
    bands = {}
    for name, lo, hi in BANDS:
        sel = pd.Series(True, index=lead.index)
        if lo is not None:
            sel &= lead >= lo
        if hi is not None:
            sel &= lead <= hi
        bands[name] = int(sel.sum())
    bands["barabar"] = int((lead == 0).sum())

    def rows(idx):
        return [dict(booth=str(i), name=str(be.loc[i, "booth_name"]) if i in be.index else "",
                     votes=int(m.loc[i, party]), share=round(float(share.loc[i]), 1) if pd.notna(share.loc[i]) else None,
                     lead=int(lead.loc[i]), rival=str(rival.loc[i])) for i in idx]

    return dict(
        party=party, votes=int(m[party].sum()), booths=int(len(m)),
        won=int((order == 1).sum()), second=int((order == 2).sum()), third=int((order == 3).sum()),
        strong_60=int((share >= 60).sum()), weak_15=int((share < 15).sum()),
        bands=bands,
        flip_votes_palatne=int((1 - lead[(lead >= -99) & (lead <= -1)]).sum()),
        cushion_swing=int(lead[(lead >= 1) & (lead <= 99)].sum()),
        top10=rows(share.sort_values(ascending=False).index[:10]),
        bottom10=rows(share.sort_values().index[:10]),
        lead=lead, share=share,
    )


def close_booths(m, be, n=15, limit=15):
    vals = m.drop(columns=[c for c in m.columns if c == "NOTA"])
    out = []
    for i, r in vals.iterrows():
        s = r.sort_values(ascending=False)
        gap = int(s.iloc[0] - s.iloc[1])
        out.append(dict(booth=str(i), name=str(be.loc[i, "booth_name"]), first=s.index[0], second=s.index[1],
                        v1=int(s.iloc[0]), v2=int(s.iloc[1]), gap=gap))
    out.sort(key=lambda x: x["gap"])
    return [x for x in out if x["gap"] <= limit][:n], out


def main():
    ac = int(sys.argv[1])
    overrides = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else {}
    b, v, cand, ps = load(ac, overrides)
    q = pd.read_csv(f"{DATA}/UP_Form20_quality_report.csv")
    q = q[q.ac_no == ac]
    out = dict(ac_no=ac, ac_name=overrides.get("ac_name") or str(q.ac_name.iloc[0]), district=str(q.district.iloc[0]),
               quality={r.election: dict(grade=r.grade, sum_check=r.sum_check_rate, flags=r.flags if isinstance(r.flags, str) else "")
                        for r in q.itertuples()})
    out["elections"] = {e: election_summary(e, b, v, cand) for e in ELECTIONS if (cand.election == e).any()}

    # -------- booth-level per party, latest VS and LS
    views, mats = {}, {}
    for e in ["VS2022", "LS2024", "VS2017", "LS2019", "VS2012"]:
        if e not in out["elections"]:
            continue
        m, be = booth_matrix(e, b, v)
        mats[e] = (m, be)
        parties = [p for p in m.columns if p not in ("NOTA", "?", "IND") and m[p].sum() >= 0.03 * m.drop(columns=["NOTA"], errors="ignore").values.sum()]
        views[e] = {p: party_booth_view(p, m, be) for p in parties}
    out["party_booths"] = {e: {p: {k: x for k, x in pv.items() if k not in ("lead", "share")} for p, pv in d.items()}
                           for e, d in views.items()}
    for e in ("VS2022", "LS2024"):
        if e in mats:
            out.setdefault("close_booths", {})[e] = close_booths(*mats[e])[0]

    # -------- booth lists over time (alignment by name)
    lists = {e: booth_list(b[(b.election == e) & (b.is_postal == 0)].sort_values("booth_no")) for e in ["VS2012", "VS2017", "VS2022", "LS2019"]}
    ps_list = [dict(id=str(r.ps_no), no=r.ps_no, name=f"{r.location} {r.building}",
                    place=place(GENERIC_EXTRA.sub(" ", f"{r.location} {r.building}")),
                    marks=marks(r.building), village=r.location, electors=r.electors) for r in ps.sort_values("ps_no").itertuples()]
    drop_common(*lists.values(), ps_list)
    links = {}
    for a, c in [("VS2022", "LS2019"), ("LS2019", "VS2017"), ("VS2022", "VS2017"), ("VS2017", "VS2012")]:
        al = align(lists[a], lists[c])
        links[(a, c)] = {lists[a][i]["id"]: lists[c][j]["id"] for i, (j, s) in al.items()}
    # 2022 (English names) -> 2017: direct match, else via LS2019 (Hindi names, same era numbering)
    via = {k: links[("LS2019", "VS2017")][v] for k, v in links[("VS2022", "LS2019")].items() if v in links[("LS2019", "VS2017")]}
    links[("VS2022", "VS2017")] = {**via, **links[("VS2022", "VS2017")]}
    al = align(lists["VS2022"], ps_list, thr=0.4)
    link_ps = {lists["VS2022"][i]["id"]: ps_list[j] for i, (j, s) in al.items()}
    al = align(lists["LS2019"], ps_list, thr=0.45)
    ps_by_19 = {lists["LS2019"][i]["id"]: ps_list[j] for i, (j, s) in al.items()}
    for k, v in links[("VS2022", "LS2019")].items():
        if k not in link_ps and v in ps_by_19:
            link_ps[k] = ps_by_19[v]
    out["booth_matching"] = {f"{a}->{c}": dict(matched=len(l), of=len(lists[a])) for (a, c), l in links.items()}
    out["booth_matching"]["VS2022->PS2026"] = dict(matched=len(link_ps), of=len(lists["VS2022"]), ps2026_total=len(ps_list))

    # -------- core / swing booths (VS 2012-2017-2022 winners on matched booths)
    m22, be22 = mats["VS2022"]
    win = {e: mats[e][0].drop(columns=["NOTA"], errors="ignore").idxmax(axis=1) for e in ("VS2012", "VS2017", "VS2022")}
    hist = []
    for bid in m22.index:
        b17 = links[("VS2022", "VS2017")].get(bid)
        b12 = links[("VS2017", "VS2012")].get(b17) if b17 else None
        hist.append(dict(booth=str(bid), w22=win["VS2022"].get(bid), w17=win["VS2017"].get(b17) if b17 else None,
                         w12=win["VS2012"].get(b12) if b12 else None, b17=b17, b12=b12))
    full = [h for h in hist if h["w17"] and h["w12"]]
    core = Counter(h["w22"] for h in full if h["w22"] == h["w17"] == h["w12"])
    core2 = Counter(h["w22"] for h in hist if h["w17"] and h["w22"] == h["w17"])
    swing = [h for h in hist if h["w17"] and h["w22"] != h["w17"]]
    out["core_swing"] = dict(booths_with_3_elections=len(full), core_3_of_3=dict(core),
                             booths_with_2017_match=sum(1 for h in hist if h["w17"]), same_winner_2017_2022=dict(core2),
                             changed_2017_2022=len(swing),
                             flows=dict(Counter(f"{h['w17']}→{h['w22']}" for h in swing).most_common(12)))

    # -------- village groups (2026 village name via matched PS) and split villages
    vill = defaultdict(list)
    for bid in m22.index:
        psr = link_ps.get(bid)
        key = psr["village"] if psr else None
        if key:
            vill[key].append(bid)
    split = []
    for vname, ids in vill.items():
        if len(ids) < 2:
            continue
        ws = Counter(win["VS2022"].get(i) for i in ids)
        if len(ws) > 1:
            split.append(dict(village=vname, booths=len(ids), winners=dict(ws), booth_ids=[str(i) for i in ids]))
    split.sort(key=lambda x: -x["booths"])
    out["villages"] = dict(villages_with_booths=len(vill), multi_booth_villages=sum(1 for x in vill.values() if len(x) > 1),
                           split_villages=split[:25], split_count=len(split))

    # -------- women: booths where more women than men voted (2022), and 2026 women-only booths
    fem = be22[(be22.voters_female.notna()) & (be22.voters_male.notna())]
    wmaj = fem[fem.voters_female > fem.voters_male]
    out["women"] = dict(booths_women_more_than_men_2022=int(len(wmaj)), of=int(len(fem)),
                        female_turnout_share_2022=out["elections"]["VS2022"]["female_share_of_voters"],
                        top=[dict(booth=str(i), name=str(r.booth_name), female=int(r.voters_female), male=int(r.voters_male),
                                  winner=str(win["VS2022"].get(i))) for i, r in
                             wmaj.assign(d=wmaj.voters_female - wmaj.voters_male).sort_values("d", ascending=False).head(10).iterrows()],
                        women_only_ps_2026=int(ps.voters_for.fillna("").str.contains("महिला").sum()))

    # -------- turnout by booth 2022 and electors growth to 2026
    t = (be22.voters_total / be22.electors * 100).dropna()
    out["turnout_2022"] = dict(min=round(t.min(), 1), median=round(t.median(), 1), max=round(t.max(), 1),
                               below_50=int((t < 50).sum()), above_70=int((t >= 70).sum()))
    out["ps2026"] = dict(polling_stations=len(ps), electors=int(ps.electors.sum()) if ps.electors.notna().all() else None,
                         list_title=ps.list_title.iloc[0], list_upload=ps.list_upload.iloc[0],
                         villages=int(ps.location.nunique()))

    # -------- per-booth master table (2022 base) for evidence / platform
    master = []
    for bid in m22.index:
        r = be22.loc[bid]
        row = dict(booth22=str(bid), name22=str(r.booth_name), electors22=None if pd.isna(r.electors) else int(r.electors),
                   turnout22=None if pd.isna(r.electors) or pd.isna(r.voters_total) or not r.electors else round(100 * r.voters_total / r.electors, 1),
                   winner22=str(win["VS2022"].get(bid)), margin22=int(r.margin) if pd.notna(r.margin) else None)
        for p in views["VS2022"]:
            row[f"{p}_22"] = int(m22.loc[bid, p])
        h = next(x for x in hist if x["booth"] == str(bid))
        row.update(booth17=h["b17"], winner17=h["w17"], booth12=h["b12"], winner12=h["w12"])
        psr = link_ps.get(bid)
        row.update(ps2026=psr["no"] if psr else None, village2026=psr["village"] if psr else None,
                   electors2026=None if not psr or pd.isna(psr["electors"]) else int(psr["electors"]))
        master.append(row)
    out["master"] = master

    # -------- cross checks
    checks = []
    for e, s in out["elections"].items():
        ce = cand[cand.election == e]
        be = b[(b.election == e) & (b.is_postal == 0)]
        cn = int(ce.total_votes.sum())
        cvt, nota = int(be.candidate_votes_total.sum()), int(be.nota.fillna(0).sum())
        incl = cn == cvt + s["postal_votes"]
        checks.append(dict(check=f"{e}: AC candidate totals (incl. NOTA) = sum of booth votes + postal",
                           ok=incl or cn == cvt + nota + s["postal_votes"],
                           detail=f"{cn} = {cvt}{'' if incl else f' + NOTA {nota}'} + postal {s['postal_votes']}"
                                  + (" (booth 'candidate_votes_total' already includes NOTA in this file)" if incl and nota else "")))
        sh = sum(c["share"] for c in s["candidates"])
        checks.append(dict(check=f"{e}: vote shares add to 100%", ok=abs(sh - 100) < 0.6, detail=f"{sh:.1f}"))
    for e, d in views.items():
        for p, pv in d.items():
            ssum = pv["won"] + pv["second"] + pv["third"]
            bsum = sum(pv["bands"].values())
            checks.append(dict(check=f"{e} {p}: margin bands sum to booths", ok=bsum == pv["booths"], detail=f"{bsum} / {pv['booths']}"))
    out["checks"] = checks
    json.dump(out, sys.stdout, ensure_ascii=False, default=lambda o: o.item() if hasattr(o, "item") else str(o), indent=1)


if __name__ == "__main__":
    main()
