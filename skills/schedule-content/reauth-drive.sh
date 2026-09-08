#!/bin/bash
# Google OAuth Re-Authorization — Calendar + Drive + Sheets
# Uses localhost redirect (no OOB). Requires http://localhost:8888 in Google Console authorized URIs.
# Run once. Updates ~/.zshrc and ~/.claude/secrets.env automatically.

source ~/.claude/secrets.env

if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "ERROR: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not found."
  echo "Check ~/.claude/secrets.env"
  exit 1
fi

echo ""
echo "========================================"
echo "  Google OAuth Re-Authorization"
echo "  Scopes: Calendar + Drive + Sheets"
echo "========================================"
echo ""
echo "PREREQUISITE: In Google Cloud Console, make sure"
echo "  http://localhost:8888"
echo "is listed under Authorized Redirect URIs for this OAuth client."
echo ""
echo "Press Enter when ready, or Ctrl+C to cancel."
read

# Run the Python auth flow
python3 - <<PYEOF
import http.server
import urllib.parse
import webbrowser
import threading
import json
import urllib.request

CLIENT_ID = "$GOOGLE_CLIENT_ID"
CLIENT_SECRET = "$GOOGLE_CLIENT_SECRET"
REDIRECT_URI = "http://localhost:8888"
SCOPES = " ".join([
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
])

auth_code = None

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        if "code" in params:
            auth_code = params["code"][0]
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(b"<h2>Authorized. You can close this tab.</h2>")
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"<h2>Error: no code received.</h2>")
        threading.Thread(target=self.server.shutdown).start()

    def log_message(self, format, *args):
        pass  # suppress request logs

# Build auth URL
params = urllib.parse.urlencode({
    "client_id": CLIENT_ID,
    "redirect_uri": REDIRECT_URI,
    "response_type": "code",
    "scope": SCOPES,
    "access_type": "offline",
    "prompt": "consent",
})
auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{params}"

print(f"Opening browser...")
print(f"URL: {auth_url}\n")
webbrowser.open(auth_url)

# Start local server to capture redirect
server = http.server.HTTPServer(("localhost", 8888), Handler)
print("Waiting for Google to redirect back...")
server.serve_forever()

if not auth_code:
    print("ERROR: No authorization code received.")
    exit(1)

# Exchange code for tokens
data = urllib.parse.urlencode({
    "code": auth_code,
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "redirect_uri": REDIRECT_URI,
    "grant_type": "authorization_code",
}).encode()

req = urllib.request.Request(
    "https://oauth2.googleapis.com/token",
    data=data,
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    method="POST"
)

with urllib.request.urlopen(req) as resp:
    token_data = json.loads(resp.read())

refresh_token = token_data.get("refresh_token")
if not refresh_token:
    print(f"ERROR: No refresh token in response: {token_data}")
    exit(1)

print(f"\n========================================")
print(f"  Success! All scopes granted.")
print(f"========================================")
print(f"\nRefresh token: {refresh_token}\n")
print("Run these commands to save it permanently:\n")
print(f"  sed -i '' 's|export GOOGLE_REFRESH_TOKEN=.*|export GOOGLE_REFRESH_TOKEN={refresh_token}|' ~/.zshrc")
print(f"  sed -i '' 's|export GOOGLE_REFRESH_TOKEN=.*|export GOOGLE_REFRESH_TOKEN={refresh_token}|' ~/.claude/secrets.env")
print(f"\nOr just run the sed commands printed above — they update both files at once.")
PYEOF
