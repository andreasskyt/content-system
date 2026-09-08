#!/usr/bin/env python3
"""Fetch a YouTube video's thumbnail and return it as a base64 data URI.

YouTube exposes thumbnails at predictable public URLs — no API key needed:
  https://img.youtube.com/vi/{video_id}/{quality}.jpg

Quality fallback order: maxresdefault → sddefault → hqdefault.
hqdefault is always available; the higher qualities may 404 or return a
120x90 gray placeholder (~900 bytes) for videos that don't have them.

Usage:
    python3 fetch_youtube_thumbnail.py <url>              # prints data URI to stdout
    python3 fetch_youtube_thumbnail.py <url> --out f.jpg  # also writes raw JPEG to f.jpg

Library:
    from fetch_youtube_thumbnail import fetch_thumbnail_data_uri, extract_video_id
    data_uri = fetch_thumbnail_data_uri("https://youtu.be/dQw4w9WgXcQ")
"""

from __future__ import annotations

import argparse
import base64
import re
import sys
import urllib.request
from pathlib import Path

QUALITIES = ["maxresdefault", "sddefault", "hqdefault"]
MIN_VALID_BYTES = 5000  # the gray placeholder is ~900 bytes

VIDEO_ID_PATTERNS = [
    re.compile(r"(?:youtube\.com/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})"),
    re.compile(r"(?:youtu\.be/)([A-Za-z0-9_-]{11})"),
    re.compile(r"(?:youtube\.com/shorts/)([A-Za-z0-9_-]{11})"),
    re.compile(r"(?:youtube\.com/embed/)([A-Za-z0-9_-]{11})"),
    re.compile(r"(?:youtube\.com/live/)([A-Za-z0-9_-]{11})"),
]


def extract_video_id(url: str) -> str:
    for pattern in VIDEO_ID_PATTERNS:
        m = pattern.search(url)
        if m:
            return m.group(1)
    # Last resort: a bare 11-char ID
    m = re.fullmatch(r"[A-Za-z0-9_-]{11}", url.strip())
    if m:
        return url.strip()
    raise ValueError(f"Could not extract YouTube video ID from: {url}")


def _try_fetch(video_id: str, quality: str) -> bytes | None:
    url = f"https://img.youtube.com/vi/{video_id}/{quality}.jpg"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
    except urllib.error.HTTPError:
        return None
    except urllib.error.URLError:
        return None
    if len(data) < MIN_VALID_BYTES:
        return None
    return data


def fetch_thumbnail_bytes(url: str) -> tuple[bytes, str]:
    """Return (jpeg_bytes, quality_used)."""
    video_id = extract_video_id(url)
    for quality in QUALITIES:
        data = _try_fetch(video_id, quality)
        if data is not None:
            return data, quality
    raise RuntimeError(f"No thumbnail available for video ID {video_id}")


def fetch_thumbnail_data_uri(url: str) -> str:
    data, _ = fetch_thumbnail_bytes(url)
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("url", help="YouTube video URL or 11-char video ID")
    parser.add_argument("--out", help="Optional path to also save the raw JPEG", default=None)
    args = parser.parse_args()

    try:
        data, quality = fetch_thumbnail_bytes(args.url)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        sys.exit(1)

    if args.out:
        Path(args.out).expanduser().resolve().write_bytes(data)
        print(f"saved {args.out} ({len(data)} bytes, quality={quality})", file=sys.stderr)

    b64 = base64.b64encode(data).decode("ascii")
    sys.stdout.write(f"data:image/jpeg;base64,{b64}")


if __name__ == "__main__":
    main()
