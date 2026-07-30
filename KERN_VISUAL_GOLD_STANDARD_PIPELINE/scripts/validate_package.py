#!/usr/bin/env python3
import json
from pathlib import Path
from jsonschema import Draft202012Validator
ROOT=Path(__file__).resolve().parents[1]
def load(p): return json.loads((ROOT/p).read_text(encoding="utf-8"))
pairs=[("schemas/input-manifest.schema.json","examples/mirava/input-manifest.json"),("schemas/page-map.schema.json","examples/mirava/page-map.json"),("schemas/scorecard.schema.json","examples/mirava/scorecard.json"),("schemas/prompt-package.schema.json","examples/mirava/prompt-package.json")]
fail=0
for s,d in pairs:
 e=list(Draft202012Validator(load(s)).iter_errors(load(d)));print(("FAIL " if e else "PASS ")+d);fail+=bool(e)
v=Draft202012Validator(load("schemas/finding.schema.json"))
for i,x in enumerate(load("examples/mirava/findings.json")):
 e=list(v.iter_errors(x));print(("FAIL " if e else "PASS ")+f"findings[{i}]");fail+=bool(e)
raise SystemExit(1 if fail else 0)
