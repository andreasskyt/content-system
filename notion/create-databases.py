#!/usr/bin/env python3
"""Create the four Notion databases of the content system under a parent page.

Usage:
    export NOTION_TOKEN=ntn_...            # internal integration token
    python3 notion/create-databases.py <parent_page_id>

Creates (in this order, because of relations):
    1. Content Production Pipeline   (schema: content-production-pipeline.schema.json)
    2. IG My Content                 (relation → CPP)
    3. YT My Content                 (relation → CPP)
    4. Comments to DM Config

Prints every database id + data source id at the end. Copy them into setup/configure.sh answers.

What the API cannot do (do these by hand afterwards, see docs/notion-schema.md):
    - Status property options/groups (the DB is created with a default Status; edit its options in the UI)
    - Views (board / table / calendar)
    - Page templates
"""
import json, os, sys, time, urllib.request, pathlib

TOKEN = os.environ.get("NOTION_TOKEN")
if not TOKEN or len(sys.argv) < 2:
    sys.exit(__doc__)
PARENT = sys.argv[1].replace("-", "")
HERE = pathlib.Path(__file__).parent
H = {"Authorization": f"Bearer {TOKEN}", "Notion-Version": "2022-06-28", "Content-Type": "application/json"}


def api(method, path, body=None):
    req = urllib.request.Request("https://api.notion.com/v1" + path, method=method, headers=H,
                                 data=json.dumps(body).encode() if body else None)
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} → {e.code}: {e.read().decode()[:500]}")


def to_api_props(schema, relations):
    props = {}
    for name, p in schema["properties"].items():
        t = p["type"]
        if t in ("select", "multi_select"):
            props[name] = {t: {"options": p[t]["options"]}}
        elif t == "status":
            props[name] = {"status": {}}          # options must be configured in the UI
        elif t == "relation":
            target = relations.get(name)
            if not target:
                continue                          # relation target not created yet → skip
            props[name] = {"relation": {"database_id": target, "single_property": {}}}
        elif t == "formula":
            props[name] = {"formula": {"expression": p["formula"]["expression"]}}
        elif t == "number":
            props[name] = {"number": {"format": p["number"].get("format") or "number"}}
        elif t in ("created_time", "last_edited_time", "last_edited_by", "created_by"):
            props[name] = {t: {}}
        else:
            props[name] = {t: {}}
    return props


def create(schema_file, relations=None):
    schema = json.load(open(HERE / schema_file))
    body = {
        "parent": {"type": "page_id", "page_id": PARENT},
        "title": [{"type": "text", "text": {"content": schema["title"]}}],
        "properties": to_api_props(schema, relations or {}),
    }
    if schema.get("description"):
        body["description"] = [{"type": "text", "text": {"content": schema["description"][:2000]}}]
    db = api("POST", "/databases", body)
    ds = (db.get("data_sources") or [{}])[0].get("id", "(fetch via API 2025-09-03 to see data source id)")
    print(f"✅ {schema['title']}\n   database id:    {db['id']}\n   data source id: {ds}\n   url: {db['url']}")
    time.sleep(0.4)
    return db["id"]


cpp = create("content-production-pipeline.schema.json")
ig = create("ig-my-content.schema.json", {"Content Piece": cpp})
yt = create("yt-my-content.schema.json", {"Content Piece": cpp})
cfg = create("comments-to-dm-config.schema.json")

print("\nNext: open the Content Production Pipeline in Notion and configure Status options, views and templates (docs/notion-schema.md).")
print("Then run setup/configure.sh with the ids above.")
