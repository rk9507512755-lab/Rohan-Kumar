import sys, json, glob, collections
sys.path.insert(0, 'scripts')
from parties import std_party
for e in sys.argv[1:] or ['VS2012', 'VS2017', 'VS2022']:
    wins = collections.Counter(); n = 0; unk = []; empty = 0; allc = 0
    for p in glob.glob(f'work/parsed/{e}_*.json'):
        R = json.load(open(p))
        if R['status'] != 'OK':
            continue
        C = R['candidates']
        tot = [sum(b['votes'][i] or 0 for b in R['booths']) for i in range(len(C))]
        idx = [i for i in range(len(C)) if not C[i]['is_nota']]
        allc += len(idx); empty += sum(1 for i in idx if not C[i]['party'])
        w = max(idx, key=lambda i: tot[i]); ps = std_party(C[w]['party']); wins[ps or '?'] += 1; n += 1
        if not ps or len(ps) > 8:
            unk.append((R['ac'], C[w]['name'][:15], C[w]['party'][:25]))
    print(e, n, 'cands without party', empty, '/', allc, wins.most_common(12))
    print('   odd winners:', unk[:10])
