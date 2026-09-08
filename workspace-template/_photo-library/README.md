# _photo-library

Real photos of you, used by carousels (photo style), stories, and thumbnails. Skills pick photos by reading `photos.json`, never by guessing filenames.

1. Drop 20–50 real photos here (JPG/PNG). Portrait and landscape both work.
2. Copy `photos.example.json` to `photos.json` and describe every photo with the same fields:
   - `file` exact filename · `desc` one-line description · `tags` free keywords · `focal` where you sit in the frame (left/right/center) · `text_space` where text can go · `grade` A/B/C quality · `orientation`.
3. Tip: ask Claude Code to write `photos.json` for you by reading the images ("describe every photo in _photo-library and write photos.json in the example format").

Keep a square profile picture at `_photo-library/profile.png` (used as the avatar on carousels and motion reels).
