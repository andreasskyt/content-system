# Storage — public media bucket

Why: Instagram fetches media from a URL you give it. Notion file URLs expire after an hour, Google Drive links need auth or redirects. The auto-posters copy each file to a bucket with public read, post, and leave it (cheap; clean up with a lifecycle rule).

## Cloudflare R2 (recommended, free tier: 10 GB)

1. Cloudflare dashboard → R2 → Create bucket → name → `[S3_BUCKET]`.
2. Bucket → Settings → **Public access** → R2.dev subdomain → Allow. Copy the host `pub-xxxxxxxx.r2.dev` → `[S3_PUBLIC_HOST]`. (Or connect a custom domain.)
3. R2 → Manage R2 API Tokens → Create → permission **Object Read & Write**, scoped to the bucket → copy Access Key ID, Secret Access Key, and the endpoint `https://<account_id>.r2.cloudflarestorage.com`.
4. n8n → Credentials → **S3**: S3 endpoint = that URL, region `auto`, access key, secret, **Force path style = ON**, ignore SSL issues OFF.
5. Optional lifecycle rule: delete objects older than 7 days.

The workflows build the public URL as `{{S3_PUBLIC_URL}}/{{key}}`, where `S3_PUBLIC_URL` = `https://[S3_PUBLIC_HOST]`.

## AWS S3 / other S3-compatible

Same, with a bucket policy allowing `s3:GetObject` for `*` on `arn:aws:s3:::bucket/*`, and the public URL `https://bucket.s3.region.amazonaws.com`. Set `S3_REGION` accordingly in the SET Variables node.
