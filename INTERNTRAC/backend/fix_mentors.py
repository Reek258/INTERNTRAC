import json

with open("db.json", "r", encoding="utf-8") as f:
    db = json.load(f)

GHRCE = "8a2ff344-9c09-4cd2-b3db-242e68682e43"
GCCE  = "aa03e465-0786-4e34-a4fc-770ebc69c4ff"

domain_to_inst = {
    "https://ghrcemj.raisoni.net/": GHRCE,
    "https://www.gfgcoe.ac.in/": GCCE,
}

fixed = 0
for p in db["institute_profiles"]:
    if p.get("institute_role") == "FACULTY_MENTOR" and "institute_id" not in p:
        inst_id = domain_to_inst.get(p.get("domain", ""))
        if inst_id:
            p["institute_id"] = inst_id
            fixed += 1
            print(f"Fixed: {p['name']} -> institute_id = {inst_id}")

with open("db.json", "w", encoding="utf-8") as f:
    json.dump(db, f, indent=4, ensure_ascii=False)

print(f"\nFixed {fixed} mentor profiles")
