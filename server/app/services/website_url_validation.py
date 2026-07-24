import asyncio
import ipaddress
import socket
from urllib.parse import urlsplit


class WebsiteFetchError(ValueError):
    pass


def _validate_url_shape(url: str) -> str:
    try:
        parsed = urlsplit(url)
        port = parsed.port
    except ValueError as exc:
        raise WebsiteFetchError("The website URL contains an invalid port.") from exc
    if parsed.scheme not in {"http", "https"}:
        raise WebsiteFetchError("Website URLs must use http or https.")
    if not parsed.hostname or parsed.username or parsed.password:
        raise WebsiteFetchError("The website URL is invalid.")
    if port not in (None, 80, 443):
        raise WebsiteFetchError("Website URLs must use the standard HTTP or HTTPS port.")
    return parsed.hostname


def _resolve_public_ips(hostname: str) -> list[str]:
    try:
        records = socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise WebsiteFetchError("The website hostname could not be resolved.") from exc
    ips = list({record[4][0] for record in records})
    if not ips:
        raise WebsiteFetchError("The website hostname could not be resolved.")
    for value in ips:
        try:
            address = ipaddress.ip_address(value)
        except ValueError as exc:
            raise WebsiteFetchError("The website hostname resolved to an invalid address.") from exc
        if not address.is_global:
            raise WebsiteFetchError("Private or reserved website addresses are not allowed.")
    return ips


async def validate_public_website_url(url: str) -> None:
    hostname = _validate_url_shape(url)
    await asyncio.to_thread(_resolve_public_ips, hostname)
