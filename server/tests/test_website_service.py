import socket
import unittest
from unittest.mock import patch

from app.services.website_url_validation import WebsiteFetchError, validate_public_website_url


class WebsiteUrlValidationTests(unittest.IsolatedAsyncioTestCase):
    async def test_rejects_private_resolved_ip(self):
        records = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 0))]
        with patch("app.services.website_url_validation.socket.getaddrinfo", return_value=records):
            with self.assertRaises(WebsiteFetchError):
                await validate_public_website_url("https://example.com")

    async def test_accepts_public_resolved_ip(self):
        records = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0))]
        with patch("app.services.website_url_validation.socket.getaddrinfo", return_value=records):
            await validate_public_website_url("https://example.com")

    async def test_rejects_non_http_scheme_and_nonstandard_port(self):
        with self.assertRaises(WebsiteFetchError):
            await validate_public_website_url("file:///etc/passwd")
        with self.assertRaises(WebsiteFetchError):
            await validate_public_website_url("https://example.com:8080")
