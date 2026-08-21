import json
import bcrypt

with open("db.json", "r", encoding="utf-8-sig") as f:
    db = json.load(f)

new_hash = bcrypt.hashpw(b"student123", bcrypt.gensalt(rounds=12)).decode("utf-8")

for u in db["users"]:
    if u["email"] == "borseraj072@gmail.com":
        u["password_hash"] = new_hash
        print(f"Reset password for {u['email']} (role: {u['role']})")
        break

with open("db.json", "w", encoding="utf-8") as f:
    json.dump(db, f, indent=2, ensure_ascii=False)

print("Done")
