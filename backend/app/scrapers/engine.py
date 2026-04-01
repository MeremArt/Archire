import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, quote_plus

import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

from app.scrapers.base import BaseScraper, ScrapedJob
from app.core.config import settings
from app.core.logger import get_logger
from app.utils.retry import retry

logger = get_logger(__name__)

# Default configs directory relative to this file
DEFAULT_CONFIGS_DIR = Path(__file__).parent / "configs"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    # Do NOT set Accept-Encoding manually — requests handles decompression
    # automatically only when it negotiates the encoding itself.
}


# ---------------------------------------------------------------------------
# HTML Scraper
# ---------------------------------------------------------------------------

class UniversalHTMLScraper(BaseScraper):
    """
    Scrapes job listings from static HTML pages using CSS selectors
    defined entirely in a JSON config file. No hardcoded site logic.
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.job_list_selector = config.get("job_list_selector", "")
        self.title_selector = config.get("title_selector", "")
        self.company_selector = config.get("company_selector", "")
        self.location_selector = config.get("location_selector", "")
        self.date_selector = config.get("date_selector", "")
        self.link_selector = config.get("link_selector", "")
        self.link_prefix = config.get("link_prefix", "")
        self.description_selector = config.get("description_selector", "")
        self.tags_selector = config.get("tags_selector", "")
        self.pagination = config.get("pagination", {})

    @retry(
        max_attempts=3,
        delay=2.0,
        backoff=2.0,
        exceptions=(requests.RequestException, Exception),
    )
    def _fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        resp = requests.get(url, headers=HEADERS, timeout=settings.REQUEST_TIMEOUT)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "html.parser")

    def _text(self, element, selector: str) -> str:
        if not selector or element is None:
            return ""
        try:
            found = element.select_one(selector)
            return found.get_text(strip=True) if found else ""
        except Exception:
            return ""

    def _link(self, element, selector: str) -> str:
        if not selector or element is None:
            return ""
        try:
            found = element.select_one(selector)
            if not found:
                return ""
            href = found.get("href", "")
            if not href:
                return ""
            if href.startswith("http"):
                return href
            if href.startswith("//"):
                return "https:" + href
            return (self.link_prefix + href) if self.link_prefix else href
        except Exception:
            return ""

    def _tags(self, element, selector: str) -> List[str]:
        if not selector or element is None:
            return []
        try:
            return [
                t.get_text(strip=True)
                for t in element.select(selector)
                if t.get_text(strip=True)
            ]
        except Exception:
            return []

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        if not date_str:
            return None
        try:
            return dateparser.parse(date_str, fuzzy=True)
        except Exception:
            return None

    def scrape(self) -> List[ScrapedJob]:
        jobs: List[ScrapedJob] = []
        urls_to_visit = [self.base_url]
        max_pages = self.pagination.get("max_pages", 1)
        next_selector = self.pagination.get("next_selector", "")

        for page_num, url in enumerate(urls_to_visit):
            if page_num >= max_pages:
                break

            logger.info(f"[{self.name}] Scraping page {page_num + 1}: {url}")

            try:
                soup = self._fetch_page(url)
                if not soup:
                    continue

                elements = (
                    soup.select(self.job_list_selector)
                    if self.job_list_selector
                    else []
                )

                if not elements:
                    logger.warning(
                        f"[{self.name}] No elements matched selector: "
                        f"'{self.job_list_selector}'"
                    )
                    continue

                for el in elements:
                    link = self._link(el, self.link_selector)

                    # Fallback: check if the element itself is an anchor
                    if not link:
                        href = el.get("href", "")
                        if href:
                            link = (
                                self.link_prefix + href
                                if not href.startswith("http")
                                else href
                            )

                    raw = {
                        "title": self._text(el, self.title_selector),
                        "url": link,
                        "company": self._text(el, self.company_selector),
                        "location": self._text(el, self.location_selector),
                        "description": self._text(el, self.description_selector),
                        "date_posted": self._parse_date(
                            self._text(el, self.date_selector)
                        ),
                        "tags": self._tags(el, self.tags_selector),
                    }

                    job = self.normalize(raw)
                    if job:
                        jobs.append(job)

                # Pagination: find next-page link
                if next_selector and page_num + 1 < max_pages:
                    next_el = soup.select_one(next_selector)
                    if next_el:
                        next_href = next_el.get("href", "")
                        if next_href:
                            next_url = urljoin(self.base_url, next_href)
                            if next_url not in urls_to_visit:
                                urls_to_visit.append(next_url)

            except Exception as exc:
                logger.error(
                    f"[{self.name}] Error scraping {url}: {exc}", exc_info=True
                )

        logger.info(f"[{self.name}] Total scraped: {len(jobs)} jobs")
        return jobs


# ---------------------------------------------------------------------------
# JSON API Scraper
# ---------------------------------------------------------------------------

class JSONAPIScraper(BaseScraper):
    """
    Fetches jobs from a JSON API endpoint. Field mapping is defined
    entirely in the config — no site-specific code needed.
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.data_path = config.get("data_path", "")
        self.field_map: Dict[str, str] = config.get("field_map", {})
        self.params: Dict[str, Any] = config.get("params", {})
        self.extra_headers: Dict[str, str] = config.get("headers", {})
        self.skip_first: int = config.get("skip_first", 0)

    @retry(
        max_attempts=3,
        delay=2.0,
        backoff=2.0,
        exceptions=(requests.RequestException,),
    )
    def _fetch(self, url: str) -> Any:
        headers = {**HEADERS, **self.extra_headers}
        resp = requests.get(
            url, headers=headers, params=self.params, timeout=settings.REQUEST_TIMEOUT
        )
        resp.raise_for_status()
        return resp.json()

    def _dig(self, data: Any, path: str) -> Any:
        """Traverse a dot-separated path into nested dicts/lists."""
        if not path:
            return data
        for part in path.split("."):
            if isinstance(data, dict):
                data = data.get(part)
            elif isinstance(data, list) and part.isdigit():
                data = data[int(part)]
            else:
                return None
            if data is None:
                return None
        return data

    def _field(self, item: Dict, field: str) -> str:
        mapped = self.field_map.get(field, field)
        val = self._dig(item, mapped) if "." in mapped else item.get(mapped, "")
        return str(val).strip() if val is not None else ""

    def scrape(self) -> List[ScrapedJob]:
        logger.info(f"[{self.name}] Fetching JSON API: {self.base_url}")
        jobs: List[ScrapedJob] = []

        try:
            data = self._fetch(self.base_url)
            items = self._dig(data, self.data_path) or data

            if not isinstance(items, list):
                items = [items]

            # Skip leading metadata items (e.g. RemoteOK legal notice)
            items = items[self.skip_first:]

            for item in items:
                if not isinstance(item, dict):
                    continue

                title = self._field(item, "title")
                url = self._field(item, "url")
                company = self._field(item, "company")
                location = self._field(item, "location")
                description = self._field(item, "description")
                date_str = self._field(item, "date_posted")

                tags_key = self.field_map.get("tags", "tags")
                raw_tags = item.get(tags_key, [])
                tags = raw_tags if isinstance(raw_tags, list) else []

                date_posted: Optional[datetime] = None
                if date_str:
                    try:
                        if date_str.isdigit():
                            date_posted = datetime.fromtimestamp(
                                int(date_str), tz=timezone.utc
                            )
                        else:
                            date_posted = dateparser.parse(date_str)
                    except Exception:
                        pass

                raw = {
                    "title": title,
                    "url": url,
                    "company": company,
                    "location": location,
                    "description": description,
                    "date_posted": date_posted,
                    "tags": tags,
                }

                job = self.normalize(raw)
                if job:
                    jobs.append(job)

        except Exception as exc:
            logger.error(
                f"[{self.name}] Error fetching JSON API: {exc}", exc_info=True
            )

        logger.info(f"[{self.name}] Total fetched: {len(jobs)} jobs")
        return jobs


# ---------------------------------------------------------------------------
# RSS / Atom Feed Scraper
# ---------------------------------------------------------------------------

class RSSFeedScraper(BaseScraper):
    """Scrapes job listings from RSS or Atom feeds."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)

    @retry(
        max_attempts=3,
        delay=2.0,
        backoff=2.0,
        exceptions=(requests.RequestException,),
    )
    def _fetch(self) -> BeautifulSoup:
        resp = requests.get(
            self.base_url, headers=HEADERS, timeout=settings.REQUEST_TIMEOUT
        )
        resp.raise_for_status()
        return BeautifulSoup(resp.content, "xml")

    def scrape(self) -> List[ScrapedJob]:
        logger.info(f"[{self.name}] Fetching RSS: {self.base_url}")
        jobs: List[ScrapedJob] = []

        try:
            soup = self._fetch()
            items = soup.find_all("item") or soup.find_all("entry")

            for item in items:
                title_tag = item.find("title")
                title = title_tag.get_text(strip=True) if title_tag else ""

                link_tag = item.find("link")
                if link_tag:
                    url = link_tag.get("href") or link_tag.get_text(strip=True)
                else:
                    url = ""

                if not url:
                    guid = item.find("guid")
                    url = guid.get_text(strip=True) if guid else ""

                desc_tag = item.find("description") or item.find("summary")
                description = desc_tag.get_text(strip=True) if desc_tag else ""

                # Extract company from common RSS title patterns:
                #   "Company: Job Title"  (We Work Remotely)
                #   "Job Title at Company" / "Job Title @ Company"
                company = ""
                if ": " in title and not title.startswith("http"):
                    # "Company: Title" pattern — company comes first
                    parts = title.split(": ", 1)
                    if len(parts) == 2 and len(parts[0]) < 80:
                        company = parts[0].strip()
                        title = parts[1].strip()
                else:
                    for sep in (" at ", " @ ", " | "):
                        if sep.lower() in title.lower():
                            idx = title.lower().rfind(sep.lower())
                            company = title[idx + len(sep):].strip()
                            title = title[:idx].strip()
                            break

                pub_date = (
                    item.find("pubDate")
                    or item.find("published")
                    or item.find("updated")
                )
                date_posted: Optional[datetime] = None
                if pub_date:
                    try:
                        date_posted = dateparser.parse(pub_date.get_text(strip=True))
                    except Exception:
                        pass

                raw = {
                    "title": title,
                    "url": url,
                    "company": company,
                    "location": "",
                    "description": description[:1000],
                    "date_posted": date_posted,
                    "tags": [],
                }

                job = self.normalize(raw)
                if job:
                    jobs.append(job)

        except Exception as exc:
            logger.error(
                f"[{self.name}] Error fetching RSS: {exc}", exc_info=True
            )

        logger.info(f"[{self.name}] Total fetched: {len(jobs)} jobs")
        return jobs


# ---------------------------------------------------------------------------
# Greenhouse ATS Scraper
# ---------------------------------------------------------------------------

class GreenhouseScraper(BaseScraper):
    """
    Scrapes jobs from Greenhouse ATS boards for a configurable list of
    company slugs.  Public API — no auth required.
    API: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
    """

    BASE = "https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.companies: List[str] = config.get("companies", [])

    @staticmethod
    def _strip_html(raw: str) -> str:
        """Unescape HTML entities then strip tags, returning plain text."""
        if not raw:
            return ""
        import html as html_mod, re
        # First unescape entities: &lt; → <, &amp; → &, etc.
        unescaped = html_mod.unescape(raw)
        # Then strip all HTML tags
        plain = re.sub(r"<[^>]+>", " ", unescaped)
        # Collapse whitespace
        return re.sub(r"\s+", " ", plain).strip()

    @staticmethod
    def _clean_dept_name(name: str) -> str:
        """Strip leading numeric IDs from department names (e.g. '1650 AI GTM…' → 'AI GTM…')."""
        import re
        return re.sub(r"^\d+\s+", "", name).strip()

    @retry(max_attempts=3, delay=1.5, backoff=2.0, exceptions=(requests.RequestException,))
    def _fetch_company(self, slug: str) -> List[ScrapedJob]:
        url = self.BASE.format(slug=slug)
        resp = requests.get(url, headers=HEADERS, timeout=settings.REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("jobs", [])

        jobs: List[ScrapedJob] = []
        for item in items:
            loc_raw = item.get("location", {})
            location = (
                loc_raw.get("name", "") if isinstance(loc_raw, dict) else str(loc_raw)
            )

            # Clean department names — strip leading numeric IDs (Stripe-style "1650 AI GTM…")
            depts = item.get("departments", [])
            tags = [
                self._clean_dept_name(d["name"])
                for d in depts
                if d.get("name") and not d["name"].strip().isdigit()
            ]
            tags = [t for t in tags if t]  # remove empties after cleaning

            date_posted: Optional[datetime] = None
            updated = item.get("updated_at", "")
            if updated:
                try:
                    date_posted = dateparser.parse(updated)
                except Exception:
                    pass

            # Format company name from slug (e.g. "stripe" → "Stripe")
            company_name = slug.replace("-", " ").replace("_", " ").title()

            # Strip HTML from description and truncate
            raw_desc = self._strip_html(item.get("content") or "")

            raw = {
                "title": (item.get("title") or "")[:490],
                "url": item.get("absolute_url", ""),
                "company": company_name[:490],
                "location": location[:490],
                "description": raw_desc[:2000],
                "date_posted": date_posted,
                "tags": tags,
                "source": "Greenhouse",
            }
            job = self.normalize(raw)
            if job:
                jobs.append(job)
        return jobs

    def scrape(self) -> List[ScrapedJob]:
        all_jobs: List[ScrapedJob] = []
        for slug in self.companies:
            logger.info(f"[Greenhouse] Scraping: {slug}")
            try:
                jobs = self._fetch_company(slug)
                all_jobs.extend(jobs)
                logger.info(f"[Greenhouse/{slug}] {len(jobs)} jobs")
            except Exception as exc:
                logger.error(f"[Greenhouse/{slug}] Failed: {exc}")
            time.sleep(0.4)
        logger.info(f"[Greenhouse] Total: {len(all_jobs)} jobs")
        return all_jobs


# ---------------------------------------------------------------------------
# Lever ATS Scraper
# ---------------------------------------------------------------------------

class LeverScraper(BaseScraper):
    """
    Scrapes jobs from Lever ATS boards for a configurable list of company
    slugs.  Public API — no auth required.
    API: https://api.lever.co/v0/postings/{slug}?mode=json
    """

    BASE = "https://api.lever.co/v0/postings/{slug}?mode=json"

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.companies: List[str] = config.get("companies", [])

    @retry(max_attempts=3, delay=1.5, backoff=2.0, exceptions=(requests.RequestException,))
    def _fetch_company(self, slug: str) -> List[ScrapedJob]:
        url = self.BASE.format(slug=slug)
        resp = requests.get(url, headers=HEADERS, timeout=settings.REQUEST_TIMEOUT)
        resp.raise_for_status()
        items = resp.json()
        if not isinstance(items, list):
            return []

        jobs: List[ScrapedJob] = []
        for item in items:
            categories = item.get("categories", {})
            location = categories.get("location", "")
            if not location and isinstance(categories.get("allLocations"), list):
                locs = categories["allLocations"]
                location = locs[0] if locs else ""

            tags = [t for t in [
                categories.get("team", ""),
                categories.get("department", ""),
            ] if t and not str(t).strip().isdigit()]

            created_ms = item.get("createdAt", 0)
            date_posted: Optional[datetime] = None
            if created_ms:
                try:
                    date_posted = datetime.fromtimestamp(created_ms / 1000, tz=timezone.utc)
                except Exception:
                    pass

            company_name = slug.replace("-", " ").replace("_", " ").title()

            raw = {
                "title": (item.get("text") or "")[:490],
                "url": item.get("hostedUrl", ""),
                "company": company_name[:490],
                "location": location[:490],
                "description": (item.get("descriptionPlain") or "")[:2000],
                "date_posted": date_posted,
                "tags": tags,
                "source": "Lever",
            }
            job = self.normalize(raw)
            if job:
                jobs.append(job)
        return jobs

    def scrape(self) -> List[ScrapedJob]:
        all_jobs: List[ScrapedJob] = []
        for slug in self.companies:
            logger.info(f"[Lever] Scraping: {slug}")
            try:
                jobs = self._fetch_company(slug)
                all_jobs.extend(jobs)
                logger.info(f"[Lever/{slug}] {len(jobs)} jobs")
            except Exception as exc:
                logger.error(f"[Lever/{slug}] Failed: {exc}")
            time.sleep(0.4)
        logger.info(f"[Lever] Total: {len(all_jobs)} jobs")
        return all_jobs


# ---------------------------------------------------------------------------
# Search Scraper  (keyword/location substituted into a URL template)
# ---------------------------------------------------------------------------

class SearchScraper(UniversalHTMLScraper):
    """
    Like UniversalHTMLScraper but the URL is built from a template by
    substituting {keyword} and {location} with URL-encoded search terms.

    Used for Indeed, LinkedIn, Glassdoor, and any other search-driven board.
    """

    def __init__(
        self,
        config: Dict[str, Any],
        keyword: str = "",
        location: str = "",
    ):
        cfg = dict(config)
        template = cfg.get("url_template", cfg.get("base_url", ""))
        cfg["base_url"] = template.replace(
            "{keyword}", quote_plus(keyword)
        ).replace(
            "{location}", quote_plus(location)
        )
        super().__init__(cfg)
        self.search_keyword = keyword
        self.search_location = location
        self.request_delay = float(cfg.get("request_delay", 1.5))
        self.requires_js = cfg.get("requires_js", False)

    def scrape(self) -> List[ScrapedJob]:
        if self.requires_js:
            # Try anyway with requests; warn the user if empty
            logger.warning(
                f"[{self.name}] requires_js=true — results may be empty without "
                "Selenium. Install selenium + chromedriver for full support."
            )

        jobs = super().scrape()

        # Polite delay after scraping this source
        if self.request_delay > 0:
            time.sleep(self.request_delay)

        return jobs


# ---------------------------------------------------------------------------
# Result container for targeted (per-source) scrape runs
# ---------------------------------------------------------------------------

@dataclass
class SourceResult:
    source: str
    count: int = 0
    error: Optional[str] = None
    jobs: List[ScrapedJob] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "count": self.count,
            "error": self.error,
        }


# ---------------------------------------------------------------------------
# Factory + runner
# ---------------------------------------------------------------------------

SCRAPER_TYPE_MAP: Dict[str, type] = {
    "html": UniversalHTMLScraper,
    "json_api": JSONAPIScraper,
    "rss": RSSFeedScraper,
    "search_html": UniversalHTMLScraper,  # base class; SearchScraper used explicitly
    "greenhouse": GreenhouseScraper,
    "lever": LeverScraper,
}


def load_scraper_configs(
    configs_dir: Optional[str] = None,
    include_search: bool = False,
) -> List[Dict[str, Any]]:
    """
    Load enabled JSON config files from the configs directory.
    By default, search_html configs (Indeed, LinkedIn, Glassdoor) are excluded
    from regular scheduled runs (they need keyword/location context).
    Pass include_search=True to include them.
    """
    path = Path(configs_dir) if configs_dir else DEFAULT_CONFIGS_DIR

    if not path.exists():
        logger.warning(f"Scraper configs directory not found: {path}")
        return []

    configs: List[Dict[str, Any]] = []
    for file_path in sorted(path.glob("*.json")):
        try:
            with open(file_path, "r", encoding="utf-8") as fh:
                cfg = json.load(fh)
            if not cfg.get("enabled", True):
                continue
            if cfg.get("type") == "search_html" and not include_search:
                continue
            configs.append(cfg)
            logger.info(f"Loaded config: {cfg.get('name', file_path.stem)}")
        except Exception as exc:
            logger.error(f"Failed to load config {file_path}: {exc}")

    return configs


def get_config_by_name(name: str) -> Optional[Dict[str, Any]]:
    """Look up a single scraper config by name (case-insensitive)."""
    for cfg in load_scraper_configs(include_search=True):
        if cfg.get("name", "").lower() == name.lower():
            return cfg
    return None


def get_scraper(config: Dict[str, Any]) -> BaseScraper:
    """Return an appropriate scraper instance for the given config."""
    scraper_type = config.get("type", "html")
    cls = SCRAPER_TYPE_MAP.get(scraper_type, UniversalHTMLScraper)
    return cls(config)


def run_all_scrapers(
    configs_dir: Optional[str] = None,
) -> List[ScrapedJob]:
    """Load all non-search configs, run every scraper, return deduplicated results."""
    configs = load_scraper_configs(configs_dir, include_search=False)
    all_jobs: List[ScrapedJob] = []
    seen_urls: set = set()

    for cfg in configs:
        try:
            scraper = get_scraper(cfg)
            for job in scraper.scrape():
                if job.url and job.url not in seen_urls:
                    seen_urls.add(job.url)
                    all_jobs.append(job)
        except Exception as exc:
            logger.error(
                f"Scraper '{cfg.get('name')}' failed: {exc}", exc_info=True
            )

    logger.info(f"run_all_scrapers total: {len(all_jobs)} unique jobs")
    return all_jobs


def run_targeted_scrape(
    keyword: str,
    location: str,
    source_names: List[str],
) -> List[SourceResult]:
    """
    Run a targeted scrape for specific keyword+location across named sources.
    Returns per-source SourceResult objects (count, error, jobs list).
    """
    all_configs = load_scraper_configs(include_search=True)
    config_map = {cfg.get("name", "").lower(): cfg for cfg in all_configs}

    results: List[SourceResult] = []
    seen_urls: set = set()

    for name in source_names:
        cfg = config_map.get(name.lower())
        if not cfg:
            results.append(SourceResult(source=name, error=f"Unknown source: {name}"))
            continue

        sr = SourceResult(source=cfg.get("name", name))
        try:
            if cfg.get("type") == "search_html":
                scraper = SearchScraper(cfg, keyword=keyword, location=location)
            else:
                # For generic sources (RemoteOK, WWR, Remotive) run as-is
                scraper = get_scraper(cfg)

            jobs = scraper.scrape()
            for job in jobs:
                if job.url and job.url not in seen_urls:
                    seen_urls.add(job.url)
                    sr.jobs.append(job)

            sr.count = len(sr.jobs)
        except Exception as exc:
            sr.error = str(exc)
            logger.error(f"Targeted scrape '{name}' failed: {exc}", exc_info=True)

        results.append(sr)

    return results
