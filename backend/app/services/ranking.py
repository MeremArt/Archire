import re
from typing import Any, Dict, List


def compute_relevance_score(job: Dict[str, Any], keywords: List[str]) -> float:
    """
    Score a job dict against a list of keywords.
    Weights:  title ×3  |  tags ×2  |  company ×1  |  description ×0.5 (capped)
    """
    if not keywords:
        return 0.0

    text_title = (job.get("title") or "").lower()
    text_company = (job.get("company") or "").lower()
    text_desc = (job.get("description") or "").lower()
    text_location = (job.get("location") or "").lower()
    tags = " ".join(job.get("tags") or []).lower()

    score = 0.0

    for kw in keywords:
        kw = kw.lower().strip()
        if not kw:
            continue
        pattern = r"\b" + re.escape(kw) + r"\b"

        # Title
        if re.search(pattern, text_title):
            score += 3.0
        elif kw in text_title:
            score += 1.5

        # Tags
        if re.search(pattern, tags):
            score += 2.0

        # Company
        if re.search(pattern, text_company):
            score += 1.0

        # Description (frequency-capped)
        hits = len(re.findall(pattern, text_desc))
        score += min(hits * 0.3, 1.5)

        # Location
        if re.search(pattern, text_location):
            score += 0.5

    return round(score, 4)
