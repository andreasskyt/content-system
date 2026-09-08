"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { BRollCue, PipelineJob, TimeRange } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SegmentData {
  segments: TimeRange[];
  segmentCount: number;
  totalSelectedSec: number;
}

interface FinalTranscriptData {
  segmentTexts: string[];
  segments: TimeRange[];
  totalDurationSec: number;
  wordCount: number;
  segmentCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${m}:${String(s).padStart(4, "0")}`;
}

// ── Stepper ───────────────────────────────────────────────────────────────────

const STEPS = [
  "Upload",
  "Extract Audio",
  "Transcribe",
  "AI Selection",
  "Preview",
  "Extract Clips",
  "B-Roll",
];

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        marginBottom: 40,
        overflowX: "auto",
        paddingBottom: 4,
      }}
    >
      {STEPS.map((label, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                background:
                  i < currentStep
                    ? "var(--success)"
                    : i === currentStep
                    ? "var(--accent)"
                    : "rgba(255,255,255,0.08)",
                color: i <= currentStep ? "#fff" : "var(--muted)",
                transition: "all 0.2s",
              }}
            >
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span
              style={{
                fontSize: 11,
                color: i === currentStep ? "var(--text)" : "var(--muted)",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              style={{
                width: 40,
                height: 1,
                background:
                  i < currentStep
                    ? "var(--success)"
                    : "rgba(255,255,255,0.08)",
                margin: "0 4px",
                marginBottom: 22,
                transition: "background 0.2s",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 28,
      }}
    >
      {children}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────

function Btn({
  onClick,
  disabled,
  loading,
  children,
  variant = "primary",
}: {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: "10px 20px",
        borderRadius: 8,
        border: "none",
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.5 : 1,
        background: variant === "primary" ? "var(--accent)" : "rgba(255,255,255,0.06)",
        color: "#fff",
        transition: "opacity 0.15s",
      }}
    >
      {loading ? "Working..." : children}
    </button>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      style={{
        background: "rgba(239,68,68,0.12)",
        border: "1px solid rgba(239,68,68,0.3)",
        borderRadius: 8,
        padding: "12px 16px",
        color: "#fca5a5",
        fontSize: 13,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        marginTop: 16,
      }}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 16, padding: 0 }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ label }: { label: string }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: 14 }}>
      <div
        style={{
          width: 16,
          height: 16,
          border: "2px solid rgba(255,255,255,0.1)",
          borderTop: "2px solid var(--accent)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      {label}{dots}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Segment Review ────────────────────────────────────────────────────────────

function SegmentReview({
  segments,
  videoDurationSec,
  loading,
  onApprove,
}: {
  segments: TimeRange[];
  videoDurationSec: number;
  loading: boolean;
  onApprove: (segments: TimeRange[]) => void;
}) {
  const [local, setLocal] = useState<TimeRange[]>(segments);

  function update(i: number, field: "start" | "end", val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    setLocal((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: num } : s))
    );
  }

  function remove(i: number) {
    setLocal((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totalLocal = local.reduce((acc, s) => acc + (s.end - s.start), 0);
  const reductionPct = videoDurationSec
    ? Math.round((1 - totalLocal / videoDurationSec) * 100)
    : 0;

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
        Claude selected these timestamp ranges. Adjust start/end times or remove segments, then approve to see the final transcript preview.
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          {local.length} segments · {formatDuration(totalLocal)} selected · {reductionPct}% cut
        </div>
        <Btn onClick={() => onApprove(local)} loading={loading}>
          Approve &amp; Preview Transcript
        </Btn>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {local.map((seg, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 1fr 80px 28px",
              alignItems: "center",
              gap: 10,
              background: "rgba(255,255,255,0.03)",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
            }}
          >
            <span style={{ color: "var(--muted)", fontSize: 11 }}>#{i + 1}</span>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: "var(--muted)", fontSize: 10 }}>START (s)</span>
              <input
                type="number"
                step="0.1"
                value={seg.start}
                onChange={(e) => update(i, "start", e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: "var(--muted)", fontSize: 10 }}>END (s)</span>
              <input
                type="number"
                step="0.1"
                value={seg.end}
                onChange={(e) => update(i, "end", e.target.value)}
                style={inputStyle}
              />
            </label>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>
              {formatDuration(seg.end - seg.start)}
            </span>
            <button
              onClick={() => remove(i)}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: 14,
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Final Transcript Preview ──────────────────────────────────────────────────

function FinalTranscriptPreview({
  data,
  videoDurationSec,
  loading,
  onExtract,
}: {
  data: FinalTranscriptData;
  videoDurationSec: number;
  loading: boolean;
  onExtract: () => void;
}) {
  const reductionPct = videoDurationSec
    ? Math.round((1 - data.totalDurationSec / videoDurationSec) * 100)
    : 0;

  return (
    <div>
      {/* Summary bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          {data.segmentCount} segments · {formatDuration(data.totalDurationSec)} · {data.wordCount} words · {reductionPct}% of original cut
        </div>
        <Btn onClick={onExtract} loading={loading}>
          Looks good — Extract Clips
        </Btn>
      </div>

      {/* Segment text blocks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.segments.map((seg, i) => (
          <div
            key={i}
            style={{
              borderRadius: 10,
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}
          >
            {/* Segment header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 14px",
                background: "rgba(255,255,255,0.04)",
                borderBottom: "1px solid var(--border)",
                fontSize: 12,
              }}
            >
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                Segment {i + 1}
              </span>
              <span style={{ color: "var(--muted)" }}>
                {formatTime(seg.start)} → {formatTime(seg.end)}
              </span>
              <span style={{ color: "var(--muted)" }}>
                {formatDuration(seg.end - seg.start)}
              </span>
            </div>
            {/* Spoken text */}
            <div
              style={{
                padding: "12px 14px",
                fontSize: 14,
                lineHeight: 1.65,
                color: data.segmentTexts[i] ? "var(--text)" : "var(--muted)",
                fontStyle: data.segmentTexts[i] ? "normal" : "italic",
              }}
            >
              {data.segmentTexts[i] || "(no words in this segment)"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── B-Roll Cue List ───────────────────────────────────────────────────────────

function BRollCueList({ cues }: { cues: BRollCue[] }) {
  const totalBRoll = cues.reduce((acc, c) => acc + c.durationSec, 0);
  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
        {cues.length} cues · {formatDuration(totalBRoll)} of b-roll planned
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cues.map((cue) => (
          <div
            key={cue.id}
            style={{
              borderRadius: 10,
              border: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 14px",
                background: "rgba(255,255,255,0.04)",
                borderBottom: "1px solid var(--border)",
                fontSize: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>{cue.id}</span>
              <span style={{ color: "var(--muted)" }}>
                {formatTime(cue.previewStart)} → {formatTime(cue.previewEnd)}
              </span>
              <span style={{ color: "var(--muted)" }}>{cue.durationSec}s</span>
              <span
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 11,
                  color: "var(--text)",
                }}
              >
                {cue.animationSpec.template}
              </span>
            </div>
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
                {cue.description}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  fontStyle: "italic",
                  lineHeight: 1.5,
                }}
              >
                &ldquo;{cue.transcriptContext}&rdquo;
              </div>
              {cue.animationSpec && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 6,
                    padding: "6px 10px",
                    marginTop: 2,
                  }}
                >
                  {cue.animationSpec.template}
                  {cue.animationSpec.headline && ` · "${cue.animationSpec.headline}"`}
                  {cue.animationSpec.number && ` · ${cue.animationSpec.numberPrefix ?? ""}${cue.animationSpec.number}${cue.animationSpec.numberPostfix ?? ""}`}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  padding: "5px 8px",
  fontSize: 13,
  width: "100%",
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<PipelineJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [segmentData, setSegmentData] = useState<SegmentData | null>(null);
  const [finalTranscriptData, setFinalTranscriptData] = useState<FinalTranscriptData | null>(null);
  const [transcribeResult, setTranscribeResult] = useState<{
    wordCount: number;
    languageCode?: string;
    previewText: string;
  } | null>(null);
  const [clipCount, setClipCount] = useState<number | null>(null);
  const [concatLoading, setConcatLoading] = useState(false);
  const [brollCues, setBrollCues] = useState<BRollCue[] | null>(null);
  const [brollLoading, setBrollLoading] = useState(false);
  const [brollRenderLoading, setBrollRenderLoading] = useState(false);
  const [brollCompositeLoading, setBrollCompositeLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Derive current step from job stage
  const currentStep = (() => {
    if (!job) return 0;
    const s = job.stage;
    if (s === "idle" || s === "uploading") return 0;
    if (s === "uploaded") return 1;
    if (s === "extracting_audio" || s === "audio_extracted") return 2;
    if (s === "transcribing" || s === "transcribed") return 3;
    if (s === "segment_selecting" || s === "segments_selected") return 3;
    if (s === "building_final_transcript" || s === "final_transcript_ready") return 4;
    if (s === "extracting_clips") return 5;
    if (s === "clips_extracted" || s === "concatenating" || s === "concatenated") return 6;
    if (s === "generating_broll_cues" || s === "broll_cues_ready" || s === "rendering_broll" || s === "broll_rendered" || s === "compositing_broll" || s === "broll_complete") return 7;
    return 0;
  })();

  // ── Polling ──────────────────────────────────────────────────────────────

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/job/${id}`);
      if (res.ok) {
        const updated: PipelineJob = await res.json();
        setJob(updated);
        const activeStages = [
          "uploading",
          "extracting_audio",
          "transcribing",
          "segment_selecting",
          "building_final_transcript",
          "extracting_clips",
          "generating_broll_cues",
          "rendering_broll",
          "compositing_broll",
        ];
        if (!activeStages.includes(updated.stage)) {
          clearInterval(pollRef.current!);
        }
      }
    }, 1500);
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── API calls ─────────────────────────────────────────────────────────────

  async function createJob(): Promise<string> {
    const res = await fetch("/api/job", { method: "POST" });
    const data = await res.json();
    setJobId(data.jobId);
    setJob(data.job);
    return data.jobId;
  }

  async function handleFileSelect(file: File) {
    setError(null);
    setLoading(true);
    try {
      const id = await createJob();
      const fd = new FormData();
      fd.append("jobId", id);
      fd.append("video", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = await fetch(`/api/job/${id}`).then((r) => r.json());
      setJob(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleExtractAudio() {
    if (!jobId) return;
    setError(null);
    setLoading(true);
    try {
      startPolling(jobId);
      const res = await fetch("/api/extract-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = await fetch(`/api/job/${jobId}`).then((r) => r.json());
      setJob(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleTranscribe() {
    if (!jobId) return;
    setError(null);
    setLoading(true);
    try {
      startPolling(jobId);
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTranscribeResult(data);
      const updated = await fetch(`/api/job/${jobId}`).then((r) => r.json());
      setJob(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectSegments() {
    if (!jobId) return;
    setError(null);
    setLoading(true);
    try {
      startPolling(jobId);
      const res = await fetch("/api/segment-select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSegmentData(data);
      const updated = await fetch(`/api/job/${jobId}`).then((r) => r.json());
      setJob(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveSegments(segments: TimeRange[]) {
    if (!jobId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/final-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, segments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Store the preview data — this is what the user will read before cutting
      setFinalTranscriptData(data);
      const updated = await fetch(`/api/job/${jobId}`).then((r) => r.json());
      setJob(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleConcat() {
    if (!jobId) return;
    setError(null);
    setConcatLoading(true);
    try {
      startPolling(jobId);
      const res = await fetch("/api/concat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = await fetch(`/api/job/${jobId}`).then((r) => r.json());
      setJob(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setConcatLoading(false);
    }
  }

  async function handleExtractClips() {
    if (!jobId) return;
    setError(null);
    setLoading(true);
    try {
      startPolling(jobId);
      const res = await fetch("/api/extract-clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClipCount(data.clips?.length ?? 0);
      const updated = await fetch(`/api/job/${jobId}`).then((r) => r.json());
      setJob(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateBRollCues() {
    if (!jobId) return;
    setError(null);
    setBrollLoading(true);
    try {
      const res = await fetch("/api/broll-cues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBrollCues(data.cues);
      const updated = await fetch(`/api/job/${jobId}`).then((r) => r.json());
      setJob(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setBrollLoading(false);
    }
  }

  async function handleRenderBRoll() {
    if (!jobId) return;
    setError(null);
    setBrollRenderLoading(true);
    try {
      const res = await fetch("/api/broll-render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = await fetch(`/api/job/${jobId}`).then((r) => r.json());
      setJob(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setBrollRenderLoading(false);
    }
  }

  async function handleCompositeBRoll() {
    if (!jobId) return;
    setError(null);
    setBrollCompositeLoading(true);
    try {
      const res = await fetch("/api/broll-composite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = await fetch(`/api/job/${jobId}`).then((r) => r.json());
      setJob(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setBrollCompositeLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeStages = [
    "uploaded", "audio_extracted", "transcribed", "segments_selected",
    "final_transcript_ready", "extracting_clips", "clips_extracted",
    "concatenating", "concatenated",
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>editing-workflow</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
          YouTube video pipeline · upload → transcribe → AI selects → preview → clip
        </p>
      </div>

      <Stepper currentStep={currentStep} />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* STEP 0 — Upload */}
        <Card>
          <h2 style={stepHeader}>1 · Upload Video</h2>
          {!job || job.stage === "idle" ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed var(--border)",
                borderRadius: 10,
                padding: "40px 24px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)")
              }
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>↑</div>
              <div style={{ fontSize: 14, color: "var(--muted)" }}>
                Drop video here or click to browse
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                mp4 · mov · avi · mkv · webm
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mov,.avi,.mkv,.webm"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
            </div>
          ) : (
            <div style={successRow}>
              <span style={checkmark}>✓</span>
              <div>
                <div style={{ fontSize: 14 }}>{job.originalVideoName}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {job.videoDurationSec ? formatDuration(job.videoDurationSec) : ""}
                  {job.videoWidth ? ` · ${job.videoWidth}×${job.videoHeight}` : ""}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* STEP 1 — Extract Audio */}
        {job && job.stage !== "idle" && (
          <Card>
            <h2 style={stepHeader}>2 · Extract Audio</h2>
            {job.stage === "uploaded" ? (
              <Btn onClick={handleExtractAudio} loading={loading}>
                Extract Audio
              </Btn>
            ) : job.stage === "extracting_audio" ? (
              <Spinner label="Extracting audio" />
            ) : (
              <div style={successRow}>
                <span style={checkmark}>✓</span>
                <span style={{ fontSize: 14 }}>audio.mp3 ready (16kHz mono)</span>
              </div>
            )}
          </Card>
        )}

        {/* STEP 2 — Transcribe */}
        {job && activeStages.slice(1).includes(job.stage) && (
          <Card>
            <h2 style={stepHeader}>3 · Transcribe with ElevenLabs Scribe</h2>
            {job.stage === "audio_extracted" ? (
              <Btn onClick={handleTranscribe} loading={loading}>
                Transcribe
              </Btn>
            ) : job.stage === "transcribing" ? (
              <Spinner label="Transcribing with ElevenLabs Scribe" />
            ) : (
              <div>
                <div style={successRow}>
                  <span style={checkmark}>✓</span>
                  <div style={{ fontSize: 14 }}>
                    Transcription complete
                    {transcribeResult?.wordCount ? ` · ${transcribeResult.wordCount} words` : ""}
                    {transcribeResult?.languageCode ? ` · ${transcribeResult.languageCode}` : ""}
                  </div>
                </div>
                {transcribeResult?.previewText && (
                  <div
                    style={{
                      marginTop: 12,
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 8,
                      padding: "12px 14px",
                      fontSize: 13,
                      color: "var(--muted)",
                      lineHeight: 1.6,
                      maxHeight: 90,
                      overflow: "hidden",
                    }}
                  >
                    {transcribeResult.previewText}
                    {transcribeResult.previewText.length >= 300 ? "…" : ""}
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* STEP 3 — AI Segment Selection + Review */}
        {job && ["transcribed", "segment_selecting", "segments_selected", "building_final_transcript", "final_transcript_ready", "extracting_clips", "clips_extracted"].includes(job.stage) && (
          <Card>
            <h2 style={stepHeader}>4 · AI Segment Selection</h2>
            {job.stage === "transcribed" ? (
              <div>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  Claude will read the full transcript and select only the most relevant segments by timestamp. No text is modified.
                </p>
                <Btn onClick={handleSelectSegments} loading={loading}>
                  Run AI Selection
                </Btn>
              </div>
            ) : job.stage === "segment_selecting" ? (
              <Spinner label="Claude is analyzing your transcript" />
            ) : job.stage === "segments_selected" && segmentData ? (
              <SegmentReview
                segments={segmentData.segments}
                videoDurationSec={job.videoDurationSec ?? 0}
                loading={loading}
                onApprove={handleApproveSegments}
              />
            ) : job.stage === "building_final_transcript" ? (
              <Spinner label="Building final transcript" />
            ) : (
              <div style={successRow}>
                <span style={checkmark}>✓</span>
                <span style={{ fontSize: 14 }}>Segments approved</span>
              </div>
            )}
          </Card>
        )}

        {/* STEP 4 — Final Transcript Preview */}
        {job && ["final_transcript_ready", "extracting_clips", "clips_extracted"].includes(job.stage) && (
          <Card>
            <h2 style={stepHeader}>5 · Final Transcript Preview</h2>
            {finalTranscriptData && job.stage === "final_transcript_ready" ? (
              <FinalTranscriptPreview
                data={finalTranscriptData}
                videoDurationSec={job.videoDurationSec ?? 0}
                loading={loading}
                onExtract={handleExtractClips}
              />
            ) : job.stage === "extracting_clips" ? (
              <div>
                <Spinner label={`Cutting clips${job.stageProgress != null ? ` (${job.stageProgress}%)` : ""}`} />
                {job.stageProgress != null && (
                  <div
                    style={{
                      marginTop: 12,
                      height: 4,
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${job.stageProgress}%`,
                        background: "var(--accent)",
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                )}
              </div>
            ) : job.stage === "clips_extracted" ? (
              <div style={successRow}>
                <span style={checkmark}>✓</span>
                <div>
                  <div style={{ fontSize: 14 }}>
                    {clipCount ?? job.rawClips?.length ?? 0} clips extracted
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {job.rawClips?.map((c) => (
                      <span key={c.segmentIndex}>
                        #{c.segmentIndex + 1} {formatTime(c.start)}–{formatTime(c.end)} ({c.durationSec}s)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // final_transcript_ready but page was reloaded (no in-memory preview data)
              <div>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px" }}>
                  Final transcript is ready. Cut the clips from the selected segments.
                </p>
                <Btn onClick={handleExtractClips} loading={loading}>
                  Extract Clips
                </Btn>
              </div>
            )}
          </Card>
        )}

        {/* Done / Concat */}
        {job && ["clips_extracted", "concatenating", "concatenated"].includes(job.stage) && (
          <Card>
            <h2 style={stepHeader}>6 · Preview Full Edit (temporary)</h2>
            {job.stage === "clips_extracted" ? (
              <div>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  Concatenate all clips into one video to review the AI selection end-to-end.
                </p>
                <Btn onClick={handleConcat} loading={concatLoading}>
                  Build Preview Video
                </Btn>
              </div>
            ) : job.stage === "concatenating" ? (
              <Spinner label="Concatenating clips" />
            ) : (
              <div>
                <div style={successRow}>
                  <span style={checkmark}>✓</span>
                  <div>
                    <div style={{ fontSize: 14, marginBottom: 12 }}>Preview video ready</div>
                    <a
                      href={`/api/download/${jobId}`}
                      download
                      style={{
                        display: "inline-block",
                        padding: "10px 20px",
                        borderRadius: 8,
                        background: "var(--success)",
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Download preview.mp4
                    </a>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* STEP 7 — B-Roll */}
        {job && ["concatenated", "generating_broll_cues", "broll_cues_ready", "rendering_broll", "broll_rendered", "compositing_broll", "broll_complete"].includes(job.stage) && (
          <Card>
            <h2 style={stepHeader}>7 · B-Roll</h2>

            {/* Plan */}
            {job.stage === "concatenated" ? (
              <div>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  Claude will analyze the final transcript and plan where to place b-roll visuals,
                  which inspiration image to use, and which animation style to apply.
                </p>
                <Btn onClick={handleGenerateBRollCues} loading={brollLoading}>
                  Generate B-Roll Plan
                </Btn>
              </div>
            ) : job.stage === "generating_broll_cues" ? (
              <Spinner label="Claude is planning b-roll cues" />
            ) : (
              <>
                {/* Plan ready */}
                <div style={{ ...successRow, marginBottom: 12 }}>
                  <span style={checkmark}>✓</span>
                  <span style={{ fontSize: 14 }}>B-roll plan ready</span>
                </div>
                {brollCues && <BRollCueList cues={brollCues} />}

                {/* Render */}
                {job.stage === "broll_cues_ready" && (
                  <div style={{ marginTop: 16 }}>
                    <Btn onClick={handleRenderBRoll} loading={brollRenderLoading}>
                      Render B-Roll Clips
                    </Btn>
                  </div>
                )}
                {job.stage === "rendering_broll" && (
                  <Spinner label="Rendering Remotion clips" />
                )}

                {/* Composite */}
                {["broll_rendered", "compositing_broll", "broll_complete"].includes(job.stage) && (
                  <div style={{ ...successRow, marginBottom: 12, marginTop: 8 }}>
                    <span style={checkmark}>✓</span>
                    <span style={{ fontSize: 14 }}>B-roll clips rendered</span>
                  </div>
                )}
                {job.stage === "broll_rendered" && (
                  <div style={{ marginTop: 8 }}>
                    <Btn onClick={handleCompositeBRoll} loading={brollCompositeLoading}>
                      Composite onto Preview
                    </Btn>
                  </div>
                )}
                {job.stage === "compositing_broll" && (
                  <Spinner label="Compositing b-roll onto preview" />
                )}
                {job.stage === "broll_complete" && (
                  <div style={{ marginTop: 8 }}>
                    <div style={successRow}>
                      <span style={checkmark}>✓</span>
                      <span style={{ fontSize: 14 }}>B-roll complete</span>
                    </div>
                    {job.brollOutputPath && (
                      <div style={{ marginTop: 12 }}>
                        <a
                          href={`/api/download/${job.id}?file=${encodeURIComponent(job.brollOutputPath)}`}
                          style={{ fontSize: 13, color: "var(--accent)" }}
                        >
                          Download b-roll video
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        {/* Errors */}
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
        {job?.stage === "error" && job.error && (
          <ErrorBanner message={`Pipeline error: ${job.error}`} onDismiss={() => {}} />
        )}
      </div>
    </div>
  );
}

const stepHeader: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  margin: "0 0 16px",
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const successRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
};

const checkmark: React.CSSProperties = {
  color: "var(--success)",
  fontSize: 16,
  lineHeight: 1.4,
};
