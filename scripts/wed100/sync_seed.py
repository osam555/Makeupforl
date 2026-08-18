#!/usr/bin/env python3
"""Firestore wed100_questions → src/data/wed100.json 동기화.
배포 빌드가 시드로 폴백해도 사이트 내용이 DB 와 같도록, 푸시 전에 실행한다.
  GOOGLE_APPLICATION_CREDENTIALS=<키> python3 scripts/wed100/sync_seed.py
"""
import json, os, sys
from google.cloud import firestore
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P=os.path.join(ROOT,'src/data/wed100.json')
seed=json.load(open(P,encoding='utf-8'))
db=firestore.Client(project='makeupforl')
docs=[d.to_dict() for d in db.collection('wed100_questions').stream()]
docs.sort(key=lambda x:(x['part'],x['n']))
FIELDS=['id','slug','part','partTitle','n','question','question_en','answer','cues','keywords',
        'questionAudio','audio','duration','heroImage','thumbImage','photo','photoAuto','published']
items=[]
for x in docs:
    row={k:x.get(k) for k in FIELDS if x.get(k) is not None}
    row['cues']=[{k:v for k,v in c.items() if v is not None} for c in x.get('cues',[])]
    items.append(row)
seed['items']=items
open(P,'w',encoding='utf-8').write(json.dumps(seed,ensure_ascii=False,indent=1))
print(f'synced {len(items)} items → {P}')
