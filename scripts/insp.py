import json, sys, collections
sys.path.insert(0,'scripts')
from extract import booth_check
for p in sys.argv[1:]:
    R=json.load(open(p)); print('#',p,R['status'],R.get('layout'),R.get('sheet'),R.get('notes'),R.get('warnings'))
    if R['status']!='OK': print(R.get('error')); continue
    for c in R['candidates']: print('   ',c['name'][:35],'|',c['party'][:30])
    B=R['booths']; keys=collections.Counter((b['booth_no'],b['booth_suffix']) for b in B)
    cr=[booth_check(b,R['candidates']) for b in B]; chk=[x for x in cr if x is not None]; ok=sum(chk)
    print('  booths',len(B),'unique',len(keys),'dups',sum(v>1 for v in keys.values()),'postal',sum(b['is_postal'] for b in B),'chk',len(chk),'ok',ok, 'cols',R['columns'])
    for b in B[:2]+B[-2:]: print('   B',b['booth_no'],b['booth_suffix'],b['booth_name'][:25],b['votes'][:8],{k:b.get(k) for k in ('total','rejected','electors','voters_total')})
    S=[sum(b['votes'][i] or 0 for b in B) for i in range(len(R['candidates']))]; print('  cand sums',S)
    for t in R['totals'][-2:]: print('  T',t['label'],t['votes'])
