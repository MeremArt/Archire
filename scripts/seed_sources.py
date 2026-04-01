#!/usr/bin/env python3
"""
Display all configured scraper sources.

Usage (from project root):
    python scripts/seed_sources.py
"""
import os
import sys

sys.path.insert(
    0,
    os.path.normpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend")
    ),
)

from app.scrapers.engine import load_scraper_configs


def main() -> None:
    configs = load_scraper_configs()

    print(f"\n{'='*60}")
    print(f"  {len(configs)} scraper source(s) configured")
    print(f"{'='*60}")

    for i, cfg in enumerate(configs, 1):
        status = "✓ enabled" if cfg.get("enabled", True) else "✗ disabled"
        print(f"\n  {i}. {cfg.get('name', 'Unknown')}")
        print(f"     Type    : {cfg.get('type', 'html')}")
        print(f"     URL     : {cfg.get('base_url', 'N/A')}")
        print(f"     Status  : {status}")

    print(f"\n{'='*60}\n")
    print("To add a new source, drop a JSON file into:")
    print("  backend/app/scrapers/configs/\n")


if __name__ == "__main__":
    main()
