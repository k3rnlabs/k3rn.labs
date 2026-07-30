#!/usr/bin/env python3
import argparse
from pathlib import Path
from PIL import Image

def segment(source:Path,out:Path,label:str,height:int,overlap:int):
 if height<=overlap: raise ValueError("segment-height must exceed overlap")
 im=Image.open(source);out.mkdir(parents=True,exist_ok=True);top=0;i=1;files=[]
 while top<im.height:
  bottom=min(top+height,im.height);crop=im.crop((0,top,im.width,bottom));target=out/f"{label}-seg-{i:02d}-{top}-{bottom}.png";crop.save(target,optimize=True);files.append(target)
  if bottom==im.height: break
  top=bottom-overlap;i+=1
 return files
if __name__=="__main__":
 p=argparse.ArgumentParser();p.add_argument("source",type=Path);p.add_argument("output_dir",type=Path);p.add_argument("--label",default="capture");p.add_argument("--segment-height",type=int,default=1600);p.add_argument("--overlap",type=int,default=200);a=p.parse_args()
 for f in segment(a.source,a.output_dir,a.label,a.segment_height,a.overlap): print(f)
