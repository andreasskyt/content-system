// ── Pipeline Stage ────────────────────────────────────────────────────────────

export type PipelineStage =
  | "idle"
  | "uploading"
  | "uploaded"
  | "extracting_audio"
  | "audio_extracted"
  | "transcribing"
  | "transcribed"
  | "segment_selecting"
  | "segments_selected"
  | "building_final_transcript"
  | "final_transcript_ready"
  | "extracting_clips"
  | "clips_extracted"
  | "concatenating"
  | "concatenated"
  | "generating_broll_cues"
  | "broll_cues_ready"
  | "rendering_broll"
  | "broll_rendered"
  | "compositing_broll"
  | "broll_complete"
  | "error";

// ── Job State ─────────────────────────────────────────────────────────────────

export interface PipelineJob {
  id: string;
  createdAt: string;
  updatedAt: string;
  stage: PipelineStage;
  error?: string;
  stageProgress?: number; // 0–100

  // Absolute path to the job's content folder (in Content/{Reels|YouTube}/{title}/)
  contentFolder?: string;

  // File paths (relative to content folder)
  originalVideoPath?: string;
  originalVideoName?: string;
  audioPath?: string;
  transcriptPath?: string;
  segmentsPath?: string;
  finalTranscriptPath?: string;

  // Video metadata
  videoDurationSec?: number;
  videoWidth?: number;
  videoHeight?: number;

  // Populated after extract-clips
  rawClips?: RawClip[];

  // Populated after concat
  outputVideoPath?: string;

  // Populated after b-roll cue generation
  brollCuesPath?: string;

  // Populated after b-roll composition
  brollOutputPath?: string;
}

// ── ElevenLabs Scribe ─────────────────────────────────────────────────────────

export interface ElevenLabsWord {
  text: string;
  start: number; // seconds
  end: number;
  type: "word" | "spacing" | "audio_event";
  speaker_id?: string;
}

export interface ElevenLabsTranscript {
  text: string;
  words: ElevenLabsWord[];
  language_code?: string;
  language_probability?: number;
  /** Set by src/lib/transcript-review.ts once Claude has proofread the words. */
  reviewed?: boolean;
}

// ── Segments ──────────────────────────────────────────────────────────────────

export interface TimeRange {
  start: number;
  end: number;
}

export type SelectedSegments = TimeRange[];

// ── Final Transcript ──────────────────────────────────────────────────────────

export interface FinalTranscriptWord {
  text: string; // verbatim from ElevenLabs — NEVER modified
  start: number;
  end: number;
  type: "word" | "spacing" | "audio_event";
  segmentIndex: number;
  speaker_id?: string;
}

export interface FinalTranscript {
  words: FinalTranscriptWord[];
  segments: SelectedSegments;
  totalDurationSec: number;
}

// ── Subtitles ────────────────────────────────────────────────────────────────

export interface EditTimelineWord {
  text: string;
  start: number; // seconds in edit timeline (not source video)
  end: number;
}

// ── Raw Clips ─────────────────────────────────────────────────────────────────

export interface RawClip {
  segmentIndex: number;
  filename: string;
  start: number;
  end: number;
  durationSec: number;
}

// ── B-Roll ────────────────────────────────────────────────────────────────────

export type BRollTemplate = "counter" | "statement" | "typewriter" | "comparison" | "list" | "illustration" | "showcase" | "code" | "particles" | "staggered";

export interface BRollAnimationSpec {
  template: BRollTemplate;
  bgColor: string;
  headline?: string;
  subtext?: string;
  number?: string;
  numberPrefix?: string;
  numberPostfix?: string;
  beforeValue?: string;
  afterValue?: string;
  listItems?: string[];
  typewriterText?: string;
  imageKey?: string;
  imageKeys?: string[];
  codeSnippet?: string;
  codeLanguage?: string;
  visualIcons?: string[];
  visualLayout?: "single" | "pair" | "sequence";
  sceneItems?: string[];
  sceneStyle?: "carousel" | "card-stack" | "cube" | "orbit" | "flyover" | "terminal" | "elements";
  particleStyle?: "fireflies" | "rising" | "confetti" | "snow" | "grid" | "flying-words";
  staggerStyle?: "fracture" | "grid-stagger" | "mosaic" | "list-reveal" | "card-stack-3d";
  staggerItems?: string[];
}

export interface BRollCue {
  id: string;
  previewStart: number;
  previewEnd: number;
  durationSec: number;
  description: string;
  transcriptContext: string;
  animationSpec: BRollAnimationSpec;
}

export interface BRollCueSet {
  cues: BRollCue[];
  previewDurationSec: number;
  generatedAt: string;
}
