from urllib.parse import urljoin
import httpx
from bs4 import BeautifulSoup
from app.core.config import settings
from app.services.website_url_validation import WebsiteFetchError, validate_public_website_url

async def fetch_website_text(url: str, max_chars: int = 4000) -> str:
    current_url = url
    headers = {"User-Agent": "Mozilla/5.0 (compatible; ProposalBot/1.0)"}

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=False) as client:
        for _ in range(settings.website_max_redirects + 1):
            await validate_public_website_url(current_url)
            async with client.stream("GET", current_url, headers=headers) as response:
                if response.is_redirect:
                    location = response.headers.get("location")
                    if not location:
                        raise WebsiteFetchError("The website returned an invalid redirect.")
                    current_url = urljoin(str(response.url), location)
                    continue

                response.raise_for_status()
                content_type = response.headers.get("content-type", "").lower()
                if not (
                    content_type.startswith("text/html")
                    or content_type.startswith("application/xhtml+xml")
                ):
                    raise WebsiteFetchError("The website did not return an HTML page.")
                content_length = response.headers.get("content-length")
                body = bytearray()
                async for chunk in response.aiter_bytes():
                    remaining = settings.website_max_response_bytes - len(body)
                    if remaining <= 0:
                        break
                    body.extend(chunk[:remaining])
                    if len(chunk) > remaining:
                        break
                # `response.encoding` may try to access an unread response body
                # when no charset header is present. We stream the body ourselves,
                # so use the header-only charset property and a safe UTF-8 fallback.
                html = body.decode(response.charset_encoding or "utf-8", errors="replace")
                break
        else:
            raise WebsiteFetchError("The website exceeded the redirect limit.")

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    text = soup.get_text(separator=" ", strip=True)
    return text[:max_chars]
