import time
from collections import OrderedDict
from copy import deepcopy
from urllib.parse import urlsplit, urlunsplit
from app.core.config import settings

_cache: OrderedDict[str, tuple[float, dict]] = OrderedDict()


def normalize_website_url(url: str) -> str:
    parsed = urlsplit(url.strip())
    return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), parsed.path.rstrip("/"), "", ""))


def research_cache_key(company_name: str | None, website_url: str | None) -> str:
    if website_url:
        return f"website:{normalize_website_url(website_url)}"
    return f"company:{' '.join((company_name or '').lower().split())}"


def get_cached_research(key: str) -> tuple[dict | None, int | None]:
    item = _cache.get(key)
    if not item:
        return None, None
    created_at, value = item
    age_seconds = int(time.time() - created_at)
    if age_seconds >= settings.research_cache_ttl_seconds:
        _cache.pop(key, None)
        return None, None
    _cache.move_to_end(key)
    return deepcopy(value), age_seconds


def store_cached_research(key: str, value: dict) -> None:
    _cache[key] = (time.time(), deepcopy(value))
    _cache.move_to_end(key)
    while len(_cache) > settings.research_cache_max_entries:
        _cache.popitem(last=False)
