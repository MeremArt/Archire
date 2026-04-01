from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class ScrapedJob:
    title: str
    url: str
    company: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    date_posted: Optional[datetime] = None
    source: Optional[str] = None
    tags: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "url": self.url,
            "company": self.company,
            "location": self.location,
            "description": self.description,
            "date_posted": self.date_posted,
            "source": self.source,
            "tags": self.tags,
        }


class BaseScraper(ABC):
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.name = config.get("name", "Unknown")
        self.base_url = config.get("base_url", "")

    @abstractmethod
    def scrape(self) -> List[ScrapedJob]:
        """Scrape jobs and return a list of ScrapedJob objects."""
        pass

    def normalize(self, raw: Dict[str, Any]) -> Optional[ScrapedJob]:
        """Validate and normalize raw scraped data into a ScrapedJob."""
        title = (raw.get("title") or "").strip()
        url = (raw.get("url") or "").strip()

        if not title or not url:
            return None

        # Ensure URL is absolute
        if url.startswith("//"):
            url = "https:" + url
        elif url.startswith("/"):
            from urllib.parse import urlparse
            parsed = urlparse(self.base_url)
            url = f"{parsed.scheme}://{parsed.netloc}{url}"

        return ScrapedJob(
            title=title,
            url=url,
            company=(raw.get("company") or "").strip() or None,
            location=(raw.get("location") or "").strip() or None,
            description=(raw.get("description") or "").strip() or None,
            date_posted=raw.get("date_posted"),
            source=self.name,
            tags=raw.get("tags") or [],
        )
