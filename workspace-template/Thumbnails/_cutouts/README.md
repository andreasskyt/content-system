# _cutouts — background-removed photos for YouTube thumbnails

`/youtube-packaging` composites real cut-out photos of you into coded HTML thumbnails.

1. Put 30–100 photos of you (varied expressions: pointing, shocked, thinking, neutral, smiling) in a folder.
2. Run the cutout script from the skill: `swift skills/youtube-packaging/scripts/cutout.swift <input_dir> <this_dir>` (macOS, uses the built-in Vision person segmentation). Already-processed files are skipped.
3. Create `skills/youtube-packaging/assets/cutouts-index.json` tagging every PNG by emotional beat (see the skill's SKILL.md for the format), and symlink `skills/youtube-packaging/assets/cutouts` to this folder.
