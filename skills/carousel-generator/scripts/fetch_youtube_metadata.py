#!/usr/bin/env python3
"""Fetch a YouTube video's metadata via the YouTube Data API v3.

Returns title, description, channel, duration, publishedAt, and best thumbnail URL.
Reads YOUTUBE_API_KEY from the ceo-dashboard .env.local. Caches per-video to disk
so repeated runs against the same URL are free.

Usage:
    python3 fetch_youtube_metadata.py <url>                # JSON to stdout
    python3 fetch_youtube_metadata.py <url> --no-cache     # bypass disk cache
    python3 fetch_youtube_metadata.py <url> --field title  # print just one field

Library:
    from fetch_youtube_metadata import fetch_metadata
    meta = fetch_metadata("https://youtu.be/dQw4w9WgXcQ")
    # → {"video_id": "...", "title": "...", "description": "...",
    #    "channel_title": "...", "channel_id": "...", "published_at": "...",
    #    "duration_iso": "PT3M34S", "duration_seconds": 214,
    #    "thumbnail_url": "...", "video_url": "..."}
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fetch_youtube_thumbnail import extract_video_id  # reuse URL parser

ENV_PATH = Path(
    "[WORKSPACE_ROOT]/Code Projects/ceo-dashboard/.env.local"
)
CACHE_DIR = Path(__file__).parent.parent / ".cache" / "metadata"

ISO_DURATION_RE = re.compile(
    r"^P(?:(?P<days>\d+)D)?T?(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?$"
)


def _load_api_key() -> str:
    env_key = os.environ.get("YOUTUBE_API_KEY")
    if env_key:
        return env_key.strip()
    if not ENV_PATH.exists():
        raise RuntimeError(
            f"YOUTUBE_API_KEY not in env and {ENV_PATH} not found.\n"
            "Set YOUTUBE_API_KEY in your shell or in ceo-dashboard/.env.local."
        )
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("YOUTUBE_API_KEY="):
            value = line.split("=", 1)[1].strip().strip('"').strip("'")
            if value:
                return value
    raise RuntimeError(
        f"YOUTUBE_API_KEY not found in {ENV_PATH}. Check the file."
    )


def _iso_duration_to_seconds(iso: str) -> int:
    m = ISO_DURATION_RE.match(iso or "")
    if not m:
        return 0
    parts = {k: int(v) for k, v in m.groupdict(default="0").items()}
    return (
        parts["days"] * 86400
        + parts["hours"] * 3600
        + parts["minutes"] * 60
        + parts["seconds"]
    )


def _best_thumbnail(thumbnails: dict) -> str:
    for q in ("maxres", "standard", "high", "medium", "default"):
        if q in thumbnails and thumbnails[q].get("url"):
            return thumbnails[q]["url"]
    return ""


def _cache_path(video_id: str) -> Path:
    return CACHE_DIR / f"{video_id}.json"


def _read_cache(video_id: str):
    p = _cache_path(video_id)
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def _write_cache(video_id: str, meta: dict) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    _cache_path(video_id).write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")


def fetch_metadata(url: str, cache: bool = True) -> dict:
    video_id = extract_video_id(url)
    if cache:
        cached = _read_cache(video_id)
        if cached is not None:
            return cached

    api_key = _load_api_key()
    params = urllib.parse.urlencode({
        "part": "snippet,contentDetails",
        "id": video_id,
        "key": api_key,
    })
    api_url = f"https://www.googleapis.com/youtube/v3/videos?{params}"

    req = urllib.request.Request(api_url, headers={"User-Agent": "yt-carousel/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"YouTube API HTTP {e.code}: {body}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"YouTube API network error: {e}")

    items = payload.get("items") or []
    if not items:
        raise RuntimeError(f"Video not found or unavailable: {video_id}")

    item = items[0]
    snippet = item.get("snippet", {})
    content = item.get("contentDetails", {})

    duration_iso = content.get("duration", "")
    meta = {
        "video_id": video_id,
        "video_url": f"https://www.youtube.com/watch?v={video_id}",
        "title": snippet.get("title", "").strip(),
        "description": snippet.get("description", "").strip(),
        "channel_title": snippet.get("channelTitle", "").strip(),
        "channel_id": snippet.get("channelId", "").strip(),
        "published_at": snippet.get("publishedAt", ""),
        "duration_iso": duration_iso,
        "duration_seconds": _iso_duration_to_seconds(duration_iso),
        "thumbnail_url": _best_thumbnail(snippet.get("thumbnails", {})),
    }

    if cache:
        _write_cache(video_id, meta)
    return meta


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("url", help="YouTube video URL or 11-char video ID")
    parser.add_argument("--no-cache", dest="no_cache", action="store_true",
                        help="Bypass local metadata cache")
    parser.add_argument("--field", help="Print only this field (e.g. title)")
    args = parser.parse_args()

    try:
        meta = fetch_metadata(args.url, cache=not args.no_cache)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        sys.exit(1)

    if args.field:
        if args.field not in meta:
            print(f"error: unknown field '{args.field}'. Available: {', '.join(meta)}", file=sys.stderr)
            sys.exit(1)
        sys.stdout.write(str(meta[args.field]))
    else:
        sys.stdout.write(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
