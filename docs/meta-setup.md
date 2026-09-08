# Meta setup — Instagram publishing, comments, DMs

Goal: one long-lived token that can publish reels/carousels/stories, read insights, reply to comments, and (optionally) send DMs. Plus your IG account id.

## 1. Accounts

1. Instagram account → Settings → Account type → switch to **Professional (Business)**.
2. Create or pick a **Facebook Page** and link the IG account to it (IG settings → Business tools → Connect a Facebook Page, or from the Page's settings → Linked accounts).
3. Make sure the Page is owned by a **Meta Business Manager / Business Portfolio** (business.facebook.com → Settings → Pages → add). If not, "Add a Page" and claim it.

## 2. Developer app

1. developers.facebook.com → My Apps → Create App → type **Business** → attach it to the Business Portfolio.
2. Add products: **Instagram Graph API** (or "Instagram" → API setup with Facebook login) and **Messenger** (Instagram messaging) if you want DM automation.
3. App Settings → Basic: note the **App ID**, set a privacy policy URL (any page on your site), set the app to **Live** mode (top switch). Live mode is needed for stable tokens; for your own accounts no App Review is required as long as the users have a role on the app or the assets belong to the same Business.

## 3. System User token (never expires)

1. Business Settings → Users → **System Users** → Add → Admin system user.
2. Assign assets: the **App** (full control), the **Page** (full control), the **Instagram account** (full control).
3. Generate New Token → select the app → token expiration **Never** → scopes:
   `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights`, `instagram_manage_messages`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `pages_manage_engagement`, `pages_messaging`, `business_management`.
4. Copy the token once. Store it: `export META_SYSTEM_USER_TOKEN=EAA...` in `~/.zshrc`. In n8n: Header Auth credential, name `Meta Graph API`, header `Authorization` = `Bearer EAA...`.

Verify:
```bash
curl -s "https://graph.facebook.com/v24.0/me/accounts?access_token=$META_SYSTEM_USER_TOKEN"
# → your Page id. Then:
curl -s "https://graph.facebook.com/v24.0/<PAGE_ID>?fields=instagram_business_account&access_token=$META_SYSTEM_USER_TOKEN"
# → {"instagram_business_account":{"id":"1784..."}}  ← [IG_ACCOUNT_ID]
```

## 4. Publishing rules the workflows rely on

- Media must be at a **public URL** (`video_url` / `image_url`). Hence the S3/R2 staging step.
- Reels: MP4/MOV, H.264, AAC, 9:16 recommended, ≤ 1 GB, 3 s–15 min. Container creation is async: poll `GET /{container_id}?fields=status_code` until `FINISHED`, then `POST /{ig_id}/media_publish`.
- Carousels: 2–10 items, each first created with `is_carousel_item=true`, then a parent container `media_type=CAROUSEL&children=id1,id2,…`.
- Stories: `media_type=STORIES`, image or video, no stickers/links/polls via API.
- Rate limit: 100 API-published posts per 24 h per account (`GET /{ig_id}/content_publishing_limit`).
- Comment replies: `POST /{comment_id}/replies?message=…` needs `instagram_manage_comments`.

## 5. Comment webhooks (only for comment-to-DM)

Two options:
- **GoHighLevel** (what the shipped workflow uses): connect the IG account in GHL → Integrations, then a GHL workflow with trigger "Instagram Comment" posts to the n8n webhook. No Meta webhook setup needed.
- **Meta webhooks directly**: App → Webhooks → Instagram → subscribe to `comments` with your n8n webhook URL + a verify token; then adapt the `IG Comment In` node's field mapping.

## 6. DMs (optional)

Sending DMs via the Instagram Messaging API requires `instagram_manage_messages` and, for replying to comments privately, the `private_replies` edge (`POST /{comment_id}/private_replies`). The shipped flow sends the DM through GHL, which already has this permission, and only uses the Graph API for the public comment reply.

## Troubleshooting

- `(#10) Application does not have permission` → the system user is missing the asset or the scope; regenerate the token.
- `Media ID is not available` on publish → container not `FINISHED` yet; the workflows wait and retry.
- `The video file you selected is in a format that we don't support` → re-encode: `ffmpeg -i in.mp4 -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -c:a aac -movflags +faststart out.mp4`.
