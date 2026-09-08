#!/usr/bin/env python3
"""Fetch a YouTube video's transcript using captions YouTube already made.

Primary path: `youtube-transcript-api` (pip) — pulls human-made captions first,
falls back to YouTube's auto-generated captions. Zero AI on our side for both.

Fallback path (opt-in, --whisper): download audio via yt-dlp and run local
Whisper. Slower, but works for videos with captions disabled.

Prereqs:
    pip3 install --user youtube-transcript-api     (always)
    pip3 install --user yt-dlp openai-whisper      (only for --whisper fallback)

Usage:
    python3 fetch_youtube_transcript.py <url>                    # plain text, [mm:ss] per segment
    python3 fetch_youtube_transcript.py <url> --json             # JSON segments
    python3 fetch_youtube_transcript.py <url> --out t.txt        # write to file
    python3 fetch_youtube_transcript.py <url> --whisper          # enable Whisper fallback
    python3 fetch_youtube_transcript.py <url> --no-cache         # bypass local cache

Library:
    from fetch_youtube_transcript import fetch_transcript
    segments = fetch_transcript("https://youtu.be/dQw4w9WgXcQ")
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fetch_youtube_thumbnail import extract_video_id  # reuse URL parser

CACHE_DIR = Path(__file__).parent.parent / ".cache" / "transcripts"


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


def _write_cache(video_id: str, segments: list) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    _cache_path(video_id).write_text(json.dumps(segments, ensure_ascii=False), encoding="utf-8")


def _try_transcript_api(video_id: str) -> list | None:
    """Primary path: pull captions via youtube-transcript-api.

    Prefers human-made captions. Falls back to auto-generated.
    Returns None if the video has no captions at all.
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
    except ImportError:
        raise RuntimeError(
            "youtube-transcript-api not installed. Run:\n"
            "  pip3 install --user youtube-transcript-api"
        )

    api = YouTubeTranscriptApi()
    try:
        fetched = api.fetch(video_id, languages=["en", "en-US", "en-GB"])
    except (TranscriptsDisabled, NoTranscriptFound):
        return None
    except Exception as e:
        # Any other failure → treat as "no captions" so fallbacks can try
        print(f"warning: transcript-api failed: {e}", file=sys.stderr)
        return None

    segments = []
    for s in fetched:
        text = s.text.strip().replace("\n", " ")
        if not text:
            continue
        segments.append({
            "start": round(s.start, 2),
            "end": round(s.start + s.duration, 2),
            "text": text,
        })
    return segments or None


def _try_whisper(url: str, video_id: str) -> list | None:
    """Fallback: download audio via yt-dlp, transcribe locally with Whisper.

    Slow (minutes), opt-in only. Useful when captions are disabled/missing.
    """
    if shutil.which("yt-dlp") is None:
        raise RuntimeError("yt-dlp not installed. Run: pip3 install --user yt-dlp")
    if shutil.which("whisper") is None:
        raise RuntimeError("whisper not installed. Run: pip3 install --user openai-whisper")

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        audio_path = tmpdir / f"{video_id}.mp3"

        dl = subprocess.run(
            ["yt-dlp", "-x", "--audio-format", "mp3", "--no-warnings",
             "-o", str(tmpdir / "%(id)s.%(ext)s"), url],
            capture_output=True, text=True,
        )
        if dl.returncode != 0 or not audio_path.exists():
            raise RuntimeError(f"audio download failed: {dl.stderr.strip()[-500:]}")

        tr = subprocess.run(
            ["whisper", str(audio_path), "--model", "small",
             "--output_format", "json", "--output_dir", str(tmpdir),
             "--language", "en", "--verbose", "False"],
            capture_output=True, text=True,
        )
        if tr.returncode != 0:
            raise RuntimeError(f"whisper failed: {tr.stderr.strip()[-500:]}")

        json_path = tmpdir / f"{video_id}.json"
        if not json_path.exists():
            return None
        raw = json.loads(json_path.read_text(encoding="utf-8"))
        return [
            {"start": round(s["start"], 2), "end": round(s["end"], 2), "text": s["text"].strip()}
            for s in raw.get("segments", [])
            if s.get("text", "").strip()
        ]


def fetch_transcript(url: str, whisper: bool = False, cache: bool = True) -> list:
    """Return a list of {start, end, text} segments.

    Priority: youtube-transcript-api (captions) → optional Whisper fallback.
    """
    video_id = extract_video_id(url)

    if cache:
        cached = _read_cache(video_id)
        if cached is not None:
            return cached

    segments = _try_transcript_api(video_id)
    if not segments and whisper:
        segments = _try_whisper(url, video_id)
    if not segments:
        hint = "" if whisper else "  (re-run with --whisper to transcribe audio locally)"
        raise RuntimeError(f"no captions available for video {video_id}{hint}")

    if cache:
        _write_cache(video_id, segments)
    return segments


def _fmt_timestamp(seconds: float) -> str:
    total = int(seconds)
    return f"{total // 60:02d}:{total % 60:02d}"


def format_plain(segments: list) -> str:
    return "\n".join(f"[{_fmt_timestamp(s['start'])}] {s['text']}" for s in segments)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("url", help="YouTube video URL or 11-char video ID")
    parser.add_argument("--json", dest="as_json", action="store_true", help="Output JSON segments instead of plain text")
    parser.add_argument("--out", help="Write output to this file instead of stdout", default=None)
    parser.add_argument("--whisper", action="store_true", help="Fall back to local Whisper if captions unavailable (slow)")
    parser.add_argument("--no-cache", dest="no_cache", action="store_true", help="Bypass local transcript cache")
    args = parser.parse_args()

    try:
        segments = fetch_transcript(args.url, whisper=args.whisper, cache=not args.no_cache)
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        sys.exit(1)

    body = json.dumps(segments, ensure_ascii=False, indent=2) if args.as_json else format_plain(segments)

    if args.out:
        Path(args.out).expanduser().resolve().write_text(body, encoding="utf-8")
        print(f"wrote {args.out} ({len(segments)} segments)", file=sys.stderr)
    else:
        sys.stdout.write(body)


if __name__ == "__main__":
    main()
