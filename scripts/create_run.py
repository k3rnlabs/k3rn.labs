#!/usr/bin/env python3
import argparse,hashlib,json,re,shutil
from datetime import datetime
from pathlib import Path
from PIL import Image

def slug(v): return re.sub(r"[^a-z0-9]+","-",v.lower()).strip("-") or "project"
def sha(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for c in iter(lambda:f.read(1048576),b""): h.update(c)
 return h.hexdigest()
def item(src,kind,target):
 shutil.copy2(src,target);w,h=Image.open(target).size
 return {"id":kind,"kind":kind,"path":str(target),"sha256":sha(target),"mime_type":"image/png","width_px":w,"height_px":h,"viewport_width_px":None,"readability":"unknown","notes":[]}
if __name__=="__main__":
 p=argparse.ArgumentParser();p.add_argument("--project",required=True);p.add_argument("--mode",choices=["captures","url","repository"],default="captures");p.add_argument("--desktop",type=Path,required=True);p.add_argument("--mobile",type=Path,required=True);p.add_argument("--url");p.add_argument("--repository");p.add_argument("--output",type=Path,default=Path("audit-runs"));a=p.parse_args()
 base=f"KERN-{slug(a.project).upper()}-{datetime.now():%Y%m%d}-R";n=len(list(a.output.glob(base+"*")))+1;rid=f"{base}{n:02d}";d=a.output/rid;inp=d/"inputs";inp.mkdir(parents=True)
 level="C" if a.repository else "B" if a.url else "A"
 data={"run_id":rid,"project":{"name":a.project,"product_name":None,"target_audience":None,"business_goal":None},"mode":a.mode,"evidence_level":level,"url":a.url,"repository":a.repository,"artifacts":[item(a.desktop,"desktop_capture",inp/"desktop.png"),item(a.mobile,"mobile_capture",inp/"mobile.png")],"limitations":[],"validated":False}
 (d/"input-manifest.json").write_text(json.dumps(data,indent=2),encoding="utf-8");print(d)
