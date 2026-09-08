import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { ElevenLabsTranscript } from "./types";
import { reviewTranscript } from "./transcript-review";

const ELEVENLABS_API_URL =
  "https://api.elevenlabs.io/v1/speech-to-text";

const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";

export async function transcribeAudio(
  audioPath: string
): Promise<ElevenLabsTranscript> {
  let transcript: ElevenLabsTranscript;
  try {
    transcript = await transcribeWithScribe(audioPath);
  } catch (scribeErr) {
    console.log(
      `  Scribe failed (${(scribeErr as Error).message.slice(0, 120)}…) — falling back to OpenAI Whisper`
    );
    try {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
      transcript = await transcribeWithWhisper(audioPath);
    } catch (whisperErr) {
      console.log(
        `  OpenAI Whisper failed (${(whisperErr as Error).message.slice(0, 120)}…) — falling back to local mlx-whisper`
      );
      transcript = transcribeWithLocalWhisper(audioPath);
    }
  }

  // Every transcript is proofread before anything downstream (edit plan, subs)
  // consumes it — STT mishearings otherwise get burned into subtitles.
  return reviewTranscript(transcript);
}

async function transcribeWithScribe(
  audioPath: string
): Promise<ElevenLabsTranscript> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  const formData = new FormData();
  const audioBuffer = fs.readFileSync(audioPath);
  const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
  formData.append("file", audioBlob, "audio.mp3");
  formData.append("model_id", "scribe_v1");
  formData.append("timestamps_granularity", "word");
  formData.append("diarize", "false");

  const response = await fetch(ELEVENLABS_API_URL, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${text}`);
  }

  const data = await response.json();

  return {
    text: data.text ?? "",
    words: (data.words ?? []).map(
      (w: {
        text: string;
        start: number;
        end: number;
        type?: string;
        speaker_id?: string;
      }) => ({
        text: w.text,
        start: w.start,
        end: w.end,
        type: w.type ?? "word",
        speaker_id: w.speaker_id,
      })
    ),
    language_code: data.language_code,
    language_probability: data.language_probability,
  };
}

async function transcribeWithWhisper(
  audioPath: string
): Promise<ElevenLabsTranscript> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const formData = new FormData();
  const audioBuffer = fs.readFileSync(audioPath);
  const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
  formData.append("file", audioBlob, "audio.mp3");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");

  const response = await fetch(WHISPER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI Whisper API error ${response.status}: ${text}`);
  }

  const data = await response.json();

  return {
    text: data.text ?? "",
    words: (data.words ?? []).map(
      (w: { word: string; start: number; end: number }) => ({
        text: w.word,
        start: w.start,
        end: w.end,
        type: "word" as const,
      })
    ),
    language_code: data.language,
  };
}

function transcribeWithLocalWhisper(audioPath: string): ElevenLabsTranscript {
  const root = path.resolve(__dirname, "..", "..");
  const python = path.join(root, ".venv-whisper", "bin", "python");
  const script = path.join(root, "scripts", "local-whisper.py");
  if (!fs.existsSync(python)) {
    throw new Error(
      "Local whisper venv missing — run: /usr/bin/python3 -m venv .venv-whisper && .venv-whisper/bin/pip install mlx-whisper"
    );
  }
  const stdout = execFileSync(python, [script, audioPath], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    // First run downloads the ~1.6GB model; transcription itself is fast.
    timeout: 30 * 60 * 1000,
  });
  return JSON.parse(stdout) as ElevenLabsTranscript;
}
