"""Scraper link validation test.

Ensures every scraped listing carries a valid, working platform URL so the
student 'Apply' redirect never 404s. Live listings are spot-checked against
the real platforms.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.scraper import ScraperService

results = []


def record(name, ok, extra=""):
    results.append((name, ok))
    print(f"[{'PASS' if ok else 'FAIL'}] {name} {extra}")


ALLOWED_DOMAINS = ("unstop.com", "wellfound.com", "www.ycombinator.com", "ycombinator.com", "www.workatastartup.com")

listings = ScraperService.scrape_explore_internships()
record("scraper returns listings", len(listings) > 0, f"-> {len(listings)} listings")

# Every listing must have a valid link on an allowed platform domain
bad = [l for l in listings if not l.get("link") or not l["link"].startswith("https://")
       or not any(d in l["link"] for d in ALLOWED_DOMAINS)]
record("all listings have valid platform URLs", not bad,
       f"-> bad={[(l['title'], l.get('link')) for l in bad][:3]}")

# No fake deep links (the old bug): unstop links must be browse pages or real slug-id deep links
import re
fake_unstop = [l["link"] for l in listings
               if "unstop.com" in l["link"]
               and l["link"] != "https://unstop.com/internships"
               and not re.match(r"^https://unstop\.com/internships/[a-z0-9-]+-\d+$", l["link"])]
record("no fabricated Unstop deep links", not fake_unstop, f"-> {fake_unstop[:3]}")

real_unstop = [l for l in listings if re.match(r"^https://unstop\.com/internships/[a-z0-9-]+-\d+$", l.get("link") or "")]
print(f"       real Unstop deep links: {len(real_unstop)}")

# Live YC listings have real deep-link format
yc = [l for l in listings if l["scraped_from"] == "YC Startup Jobs" and "/companies/" in l["link"]]
print(f"       live YC deep links: {len(yc)}")

# Live Wellfound listings have real job IDs
wf = [l for l in listings if l["scraped_from"] == "Wellfound" and "/jobs/" in l["link"] and any(c.isdigit() for c in l["link"].split("/jobs/")[1][:10])]
print(f"       live Wellfound deep links: {len(wf)}")

# Source filter still works
filtered = ScraperService.scrape_explore_internships(source_filter="Unstop")
record("source filter works", all(l["scraped_from"] == "Unstop" for l in filtered) and len(filtered) > 0,
       f"-> {len(filtered)} Unstop listings")

# Spot-check live links + one real Unstop deep link against the platforms
import requests
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"}
live_links = [l["link"] for l in yc[:1]] + [l["link"] for l in wf[:1]] + [l["link"] for l in real_unstop[:2]]
ok_links = 0
for url in live_links:
    try:
        r = requests.head(url, headers=H, timeout=15, allow_redirects=True)
        status = r.status_code
    except Exception:
        try:
            r = requests.get(url, headers=H, timeout=15, allow_redirects=True, stream=True)
            status = r.status_code
            r.close()
        except Exception as e:
            status = f"ERR {e}"
    print(f"       {status} {url[:80]}")
    if status in (200, 301, 302):
        ok_links += 1
if live_links:
    record("live links resolve on platform (spot check)", ok_links == len(live_links),
           f"-> {ok_links}/{len(live_links)} OK")
else:
    print("[SKIP] no live links returned (offline?) — curated fallbacks verified above")

passed = sum(1 for _, ok in results if ok)
print(f"\nRESULT: {passed}/{len(results)} tests passed")
sys.exit(0 if passed == len(results) else 1)
