# YouTube setup — uploads + analytics

## 1. Google Cloud project

1. console.cloud.google.com → New project (e.g. "content-system").
2. APIs & Services → Library → enable **YouTube Data API v3**, **YouTube Analytics API**, and **Google Drive API** (if `/schedule-content` hands videos off through Drive).
3. OAuth consent screen → External → app name, support email → scopes: add `…/auth/youtube.upload`, `…/auth/youtube`, `…/auth/yt-analytics.readonly`, `…/auth/drive` → Test users: add the channel's Google account.
4. Credentials → Create → **OAuth client ID** → Web application → Authorised redirect URIs: `http://localhost:8888` and `https://developers.google.com/oauthplayground`. Note client id + secret.
5. Credentials → Create → **API key** (restrict to YouTube Data API v3). This is `[YT_DATA_API_KEY]` (read-only stats, used by 04 and 08).

## 2. Refresh token

Option A: `skills/schedule-content/reauth-drive.sh` (reads `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` from `~/.claude/secrets.env`, opens the browser, prints the refresh token, writes it to `~/.zshrc`). Edit the SCOPES list in the script if you want YouTube scopes included in the same token.

Option B: OAuth Playground → gear icon → "Use your own OAuth credentials" → paste id/secret → select the YouTube scopes → Authorize → Exchange code for tokens → copy the **refresh token**.

Put client id, secret and refresh token into the **SET Variables** node of workflows 01 and 04. The workflows exchange the refresh token for an access token on every run (`POST https://oauth2.googleapis.com/token`).

## 3. Channel id

YouTube Studio → Settings → Channel → Advanced settings → Channel ID (`UC…`) → `[YT_CHANNEL_ID]`.

## 4. Things that bite

- **Testing mode = 7-day refresh tokens.** Publish the app (OAuth consent screen → Publish). For your own channel, verification is not required to publish; Google shows an "unverified app" warning during consent, that's all.
- **Unverified apps and privacy status:** uploads from apps that haven't completed the YouTube API compliance audit may be set to Private automatically. If that happens, either request the audit (free, ~1–2 weeks) or accept setting videos public manually in Studio.
- **Quota:** 10,000 units/day by default. Upload = 1,600 units, search = 100, videos.list = 1. Workflow 04's daily search is cheap; 6 uploads/day fits.
- Shorts are ordinary uploads: vertical, ≤ 3 min. Nothing special in the API.
