import json, os, sys, subprocess
from concurrent.futures import ThreadPoolExecutor
L = json.load(open('/home/user/ups/filelist.json'))
L = [p for p in L if not (p['path'].startswith('00_MASTER') and not p['path'].endswith('.json'))]
def get(p):
    dst = os.path.join('/home/user/ups/raw', p['path'])
    if os.path.exists(dst) and os.path.getsize(dst) > 0: return 'skip'
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    url = f"https://drive.usercontent.google.com/download?id={p['id']}&export=download&confirm=t"
    for i in range(4):
        r = subprocess.run(['curl','-sS','-L','--max-time','300','-o',dst+'.part','-w','%{http_code}',url],capture_output=True,text=True)
        if r.stdout=='200':
            with open(dst+'.part','rb') as f: h=f.read(64)
            if not h.lstrip().startswith(b'<!DOCTYPE') and not h.startswith(b'<html'):
                os.rename(dst+'.part',dst); return 'ok'
    return 'FAIL '+p['path']+' '+r.stdout+r.stderr[:100]
with ThreadPoolExecutor(12) as ex:
    res = list(ex.map(get, L))
fails=[r for r in res if r.startswith('FAIL')]
print(len(res), 'fails', len(fails)); print('\n'.join(fails[:30]))
