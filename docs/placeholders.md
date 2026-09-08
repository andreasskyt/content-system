# Placeholders

Every `[UPPER_SNAKE_CASE]` token in the repo, where to get its value, and how many files use it. `setup/configure.sh` fills the common ones; the rest are per-node values you paste into n8n or skill files.

| Placeholder | Value | Files |
|---|---|---|
| `[YOUR_NAME]` | Your full name | 190 |
| `[BRAND]` | Brand / company name | 95 |
| `[CONTENT_ROOT]` | Absolute path to your Marketing folder | 53 |
| `[IG_HANDLE]` | Instagram handle | 47 |
| `[WEBSITE_DOMAIN]` | Your website domain | 18 |
| `[N8N_WF_AUTOPOSTER_ID]` | n8n workflow id after import | 16 |
| `[SLACK_CHANNEL_ID]` | Slack app | 15 |
| `[BRAND_SLUG]` | lowercase brand slug | 13 |
| `[YOUR_OFFER]` | Your offer / mechanism name | 12 |
| `[N8N_HOST]` | n8n hostname | 12 |
| `[NOTION_CPP_DB_ID]` | create-databases.py output | 11 |
| `[EDITING_WORKFLOW_ROOT]` | Absolute path to editing-workflow | 7 |
| `[YT_CHANNEL_ID]` | docs/youtube-setup.md | 6 |
| `[NOTION_CPP_DATA_SOURCE_ID]` | create-databases.py output | 6 |
| `[ICP_QUALIFIER]` | ICP qualifier phrase | 6 |
| `[CLIENT]` | an example client name in copy | 6 |
| `[AIRTABLE_BASE_ID]` | optional workflow 06/08 | 6 |
| `[S3_PUBLIC_HOST]` | docs/storage-r2.md | 5 |
| `[IG_ACCOUNT_ID]` | docs/meta-setup.md | 5 |
| `[YT_OAUTH_REFRESH_TOKEN]` | docs/youtube-setup.md | 4 |
| `[YT_OAUTH_CLIENT_SECRET]` | docs/youtube-setup.md | 4 |
| `[YT_OAUTH_CLIENT_ID]` | docs/youtube-setup.md | 4 |
| `[YT_DATA_API_KEY]` | docs/youtube-setup.md | 4 |
| `[S3_BUCKET]` | docs/storage-r2.md | 4 |
| `[PLACEHOLDER]` | per-run value used inside a skill prompt | 4 |
| `[NOTION_YT_DAILY_NICHE_DB_ID]` | Optional research DB id (docs/notion-schema.md) | 4 |
| `[NOTION_IG_MY_REELS_DB_ID]` | Optional research DB id (docs/notion-schema.md) | 4 |
| `[NOTION_IG_COMPETITOR_REELS_DB_ID]` | Optional research DB id (docs/notion-schema.md) | 4 |
| `[COMPETITOR_HANDLE]` | a competitor channel for research agents | 4 |
| `[AIRTABLE_TABLE_ID]` | optional workflow 06/08 | 4 |
| `[POST_TITLE]` | per-run value used inside a skill prompt | 3 |
| `[NOTION_YT_MY_CONTENT_DB_ID]` | Notion ids (docs/notion-schema.md) | 3 |
| `[INFO]` | per-run value used inside a skill prompt | 3 |
| `[WORKSPACE_ROOT]` | Parent of CONTENT_ROOT | 2 |
| `[UPLOAD_DATE]` | per-run value used inside a skill prompt | 2 |
| `[TIMEZONE]` | IANA timezone | 2 |
| `[PLATFORMS]` | per-run value used inside a skill prompt | 2 |
| `[NOTION_YT_RESEARCH_REPORTS_DB_ID]` | Optional research DB id (docs/notion-schema.md) | 2 |
| `[NOTION_YT_COMPETITOR_LIST_DB_ID]` | Optional research DB id (docs/notion-schema.md) | 2 |
| `[NOTION_YT_COMMENTS_DATA_DB_ID]` | Optional research DB id (docs/notion-schema.md) | 2 |
| `[NOTION_PAGE_URL]` | Optional research DB id (docs/notion-schema.md) | 2 |
| `[NOTION_NICHE_OUTLIERS_DB_ID]` | Optional research DB id (docs/notion-schema.md) | 2 |
| `[NOTION_IG_RESEARCH_REPORTS_DB_ID]` | Optional research DB id (docs/notion-schema.md) | 2 |
| `[NOTION_IG_MY_CONTENT_DB_ID]` | Notion ids (docs/notion-schema.md) | 2 |
| `[NOTION_IG_COMPETITOR_LIST_DB_ID]` | Optional research DB id (docs/notion-schema.md) | 2 |
| `[NOTION_BROAD_NICHE_OUTLIERS_DB_ID]` | Optional research DB id (docs/notion-schema.md) | 2 |
| `[GOOGLE_SHEET_ID]` | optional workflow 06/08 | 2 |
| `[GHL_FIELD_SOURCE_POST_ID]` | docs/ghl-comments-to-dm.md | 2 |
| `[GHL_FIELD_LEAD_MAGNET_ID]` | docs/ghl-comments-to-dm.md | 2 |
| `[GHL_FIELD_DM_PAYLOAD_ID]` | docs/ghl-comments-to-dm.md | 2 |
| `[FOLDER_TITLE]` | per-run value used inside a skill prompt | 2 |
| `[DATE]` | per-run value used inside a skill prompt | 2 |
| `[YT_HANDLE]` | YouTube handle | 1 |
| `[YOUR_EXPERTISE]` | Your expertise phrase | 1 |
| `[YOUR_CALL_NAME]` | Name of your booked call | 1 |
| `[WARN]` | per-run value used inside a skill prompt | 1 |
| `[VIDEO_FORMAT]` | per-run value used inside a skill prompt | 1 |
| `[URL]` | per-run value used inside a skill prompt | 1 |
| `[UPPER_SNAKE_CASE]` | per-run value used inside a skill prompt | 1 |
| `[TITLE]` | per-run value used inside a skill prompt | 1 |
| `[SHARE_LINK]` | per-run value used inside a skill prompt | 1 |
| `[REMOVED_LINK]` | per-run value used inside a skill prompt | 1 |
| `[NOTION_COMMENTS_CONFIG_DB_ID]` | Notion ids (docs/notion-schema.md) | 1 |
| `[N8N_WF_STORY_AUTOPOSTER_ID]` | n8n workflow id after import | 1 |
| `[N8N_CRED_NOTION_ID]` | n8n credential id (auto after re-mapping) | 1 |
| `[N8N_CRED_NOTION_HEADER_ID]` | n8n credential id (auto after re-mapping) | 1 |
| `[GHL_LOCATION_ID]` | docs/ghl-comments-to-dm.md | 1 |
| `[FOLDER_ID]` | per-run value used inside a skill prompt | 1 |
| `[FINAL_CAPTION]` | per-run value used inside a skill prompt | 1 |
| `[COMPETITOR_NAME]` | a competitor channel for research agents | 1 |
| `[ALWAYS]` | per-run value used inside a skill prompt | 1 |
