"""Local Whisper transcription via mlx-whisper (Apple Silicon GPU).

Usage: .venv-whisper/bin/python scripts/local-whisper.py <audio_path>
Prints ElevenLabsTranscript-shaped JSON to stdout. Model downloads to
~/.cache/huggingface on first run (~1.6GB).
"""

import json
import sys

import mlx_whisper

MODEL = "mlx-community/whisper-large-v3-turbo"


def main() -> None:
    audio_path = sys.argv[1]
    result = mlx_whisper.transcribe(
        audio_path,
        path_or_hf_repo=MODEL,
        word_timestamps=True,
        verbose=None,
    )

    words = []
    for segment in result.get("segments", []):
        for w in segment.get("words", []):
            words.append(
                {
                    "text": w["word"].strip(),
                    "start": round(float(w["start"]), 3),
                    "end": round(float(w["end"]), 3),
                    "type": "word",
                }
            )

    print(
        json.dumps(
            {
                "text": result.get("text", "").strip(),
                "words": words,
                "language_code": result.get("language"),
            }
        )
    )


if __name__ == "__main__":
    main()
