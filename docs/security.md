# Security

## Rules

1. **No token ever enters this repo.** Tokens live in `~/.zshrc` (or `~/.claude/secrets.env`) locally and in n8n's credential store remotely. The workflow exports ship with credentials stripped; keep it that way when you re-export (n8n → Download strips credential secrets but keeps names/ids; still run the checker).
2. **YouTube OAuth values are the exception you must watch**: workflows 01 and 04 keep `YT_OAUTH_CLIENT_SECRET` / `YT_OAUTH_REFRESH_TOKEN` in a SET Variables node (n8n has no native YouTube resumable-upload node). Anyone with access to your n8n can read them. Prefer moving them into an n8n **Generic Credential (Header Auth / OAuth2)** or n8n's environment variables (`$env.YT_REFRESH_TOKEN`) once imported.
3. `.env*`, `uploads/`, profile pictures, cutouts, and media are git-ignored. Don't force-add them.
4. Run `./setup/check-secrets.sh` before every push. Install as a hook: `ln -s ../../setup/check-secrets.sh .git/hooks/pre-commit`.
5. Share this repo **private** only. It contains your brand voice, ICP language, and system design once configured.

## Token inventory (where each one lives)

| Token | Where | Scope to grant |
|---|---|---|
| `NOTION_TOKEN` | `~/.zshrc` + n8n Notion credential + n8n Header Auth | integration shared with the 4 DBs |
| `META_SYSTEM_USER_TOKEN` | `~/.zshrc` + n8n Header Auth | see meta-setup.md |
| Google OAuth client + refresh token | n8n SET Variables / n8n OAuth2 credential; `~/.zshrc` for `/schedule-content` | youtube.upload, youtube, yt-analytics.readonly, drive |
| `YT_DATA_API_KEY` | n8n SET Variables | restricted to YouTube Data API |
| S3/R2 keys | n8n S3 credential | one bucket, object read/write |
| Slack bot token | n8n Slack credential | chat:write |
| GHL private integration token | n8n Header Auth | contacts.readonly, contacts.write |
| `ELEVENLABS_API_KEY`, `PEXELS_API_KEY` | `editing-workflow/.env.local` | |
| `FATHOM_API_KEY` | `~/.zshrc` | read-only |
| Apify / OpenRouter / OpenAI / Gemini / Airtable | n8n credentials | only if you run 04/06/07/08 |

## Rotating

If a token leaks: Meta → Business Settings → System Users → revoke and regenerate. Notion → integration → refresh secret. Google → delete the OAuth client. Then update n8n credentials and `~/.zshrc`. The workflows reference credentials by name, so nothing else changes.
