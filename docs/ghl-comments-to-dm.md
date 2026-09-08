# Comment → DM lead engine (GoHighLevel + n8n + Notion)

One dumb GHL workflow, one n8n brain, one Notion config table. Adding a lead magnet = one Notion row, zero workflow edits.

```
IG comment "KEYWORD" ──► GHL trigger ──► n8n webhook ──► Notion config lookup
                                                              │ match
                                              GHL contact: fields + tags (dm-ready)
                                                              │
                        GHL: wait 60s → if dm-ready → send IG DM {{contact.dm_payload}} → remove tag
                                                              │
                        n8n: wait 90s → tag gone? → public comment reply → Slack
```

## GHL side

1. **Connect Instagram**: Settings → Integrations → Facebook/Instagram → connect the Page + IG account (needs the same Business Portfolio as in meta-setup).
2. **Custom fields** (Settings → Custom Fields, Contact): `dm_payload` (text, multi-line), `lead_magnet` (text), `source_post` (text). Copy their ids into the n8n node `Write DM Fields` (`[GHL_FIELD_DM_PAYLOAD_ID]`, `[GHL_FIELD_LEAD_MAGNET_ID]`, `[GHL_FIELD_SOURCE_POST_ID]`).
3. **Private Integration token**: Settings → Private Integrations → create with scopes `contacts.readonly`, `contacts.write`. → n8n Header Auth "GHL" (`Authorization: Bearer pit-…`). The HTTP nodes already send `Version: 2021-07-28`.
4. **Workflow "IG Comments to DM"**:
   - Trigger: *Instagram Comment* (any post) — filters none.
   - Action: *Webhook* → `POST https://[N8N_HOST]/webhook/ig-comment-dm`, custom data `comment_text = {{trigger.comment}}`. GHL also sends the full trigger payload (`triggerData.igCommentOnPost.ig.body / commentId / permalinkUrl`, `contact_id`, `full_name`), which n8n reads.
   - Action: *Wait* 60 seconds.
   - Action: *If/Else* → contact has tag `dm-ready`.
     - Yes: *Send Instagram DM* → message `{{contact.dm_payload}}` → then *Remove tag* `dm-ready`.
     - No: end.
   - Settings: **Allow re-entry = ON** (same person, several comments).
   Order matters: DM before tag removal. A contact still carrying `dm-ready` after a minute means the DM failed; n8n alerts on that.

## n8n side (`03-ig-comment-to-dm.json`)

- Word-boundary keyword match against Active rows in *Comments to DM Config*. No match = clean stop (no tags).
- Writes `dm_payload` = DM Text with `{{link}}` → `https://[WEBSITE_DOMAIN]/{slug}?utm_source=ig&utm_medium=dm&utm_campaign={slug}&utm_content={post shortcode}`.
- Tags: `ig-lead`, `kw-{keyword lowercase}`, `dm-ready`.
- After 90 s: if `dm-ready` is gone → `POST graph.facebook.com/v24.0/{commentId}/replies` with the row's *Comment Reply* (default "sent, you got it?"). Slack thread with status either way.

## Notion config row

| Keyword | DM Text | Landing Slug | Lead Magnet | Comment Reply | Active |
|---|---|---|---|---|---|
| GUIDE | Here's the guide: {{link}} | guide | Systems Guide | sent, check your DMs | ☑ |

Rules: UPPERCASE, ≤7 chars, one word, never reuse a keyword for a different magnet. Landing page live BEFORE the post goes out.

## Testing without a real comment

```bash
curl -X POST https://[N8N_HOST]/webhook/ig-comment-dm -H 'Content-Type: application/json' -d '{
  "contact_id": "<a test contact id>", "full_name": "Test Person",
  "triggerData": {"igCommentOnPost": {"ig": {"body": "GUIDE please", "commentId": "1789…", "permalinkUrl": "https://www.instagram.com/p/XXXX/"}}}
}'
```
Remove the `dm-ready` tag from the test contact by hand within 90 s to simulate GHL sending the DM.

## Without GoHighLevel

Keep the webhook + Notion lookup + keyword match. Replace the four GHL HTTP nodes with your CRM, or send the DM straight from n8n via `POST /{comment_id}/private_replies` (Meta app needs `instagram_manage_messages` and the messaging product). Trigger from Meta comment webhooks instead of GHL (see meta-setup.md §5).

## Story replies

Not covered: story replies are DMs, not comments. Handle manually or with a DM-inbox automation.
