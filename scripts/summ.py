import json, glob, collections, sys
sys.path.insert(0,'scripts')
from extract import booth_check
st=collections.Counter(); bad=[]
for p in sorted(glob.glob('work/parsed/*.json')):
    R=json.load(open(p)); e=R['election']
    if R['status']!='OK': st[(e,R['status'])]+=1; bad.append((p,R['status'],R.get('error',''))); continue
    cr=[booth_check(b,R['candidates']) for b in R['booths']]; c=[x for x in cr if x is not None]
    rate = sum(c)/len(c) if c else None
    noname = sum(1 for x in R['candidates'] if not x['name'])
    cls = 'nocheck' if rate is None else ('ok' if rate>=0.95 else ('mid' if rate>=0.5 else 'low'))
    if noname: cls+='+noname'
    st[(e,cls)]+=1
    if cls!='ok': bad.append((p,cls,round(rate,2) if rate is not None else None, len(R['booths']), len(R['candidates']), R['layout'], R['sheet']))
for k,v in sorted(st.items()): print(k,v)
json.dump(bad, open('work/bad.json','w'), ensure_ascii=False, indent=0)
