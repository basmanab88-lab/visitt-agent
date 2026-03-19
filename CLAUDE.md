# Visitt Agent — Cross-Session Context

## Who & What

- **User**: Basman (basman@visitt.io) — product manager at Visitt
- **Project**: AI agent for automating work on the Visitt property management platform (app.visitt.io)
- **Language**: Hebrew for conversation, English for code and technical content

## What This Agent Does

Automates tasks on Visitt: building deployment (floors, spaces, equipment, tenants), bulk operations via GraphQL API, browser automation via Chrome, and self-optimization between sessions.

## Non-Negotiable Rules

1. **Visualize before deploy** — Never deploy to Visitt without showing a React JSX preview and getting explicit approval. Flow: Parse → Visualize → Approve → Deploy.
2. **Self-review after every task** — Invoke `self-review` skill after completing any task. Don't wait to be asked.
3. **Automate after 2-3 repetitions** — Switch to JavaScript/API after doing the same manual action 2-3 times.
4. **dummy_id_N format** — When creating floors via `upsertFloors`, IDs must be `dummy_id_0`, `dummy_id_1`, etc. Other formats silently fail.

## Skills (load when relevant)

| Skill | When to use |
|---|---|
| `visitt-api` | Any GraphQL / programmatic Visitt work |
| `visitt-workflow` | Browser automation, UI navigation, bulk settings |
| `system-learning` | Starting work on any new/unfamiliar web system |
| `self-review` | End of session, optimization, "תשמור מה שלמדנו" |

## GitHub Backup

Config: `/sessions/kind-awesome-mendel/mnt/.claude/github-config.json`
Repo: `https://github.com/basmanab88-lab/visitt-agent`
Trigger: when user says "תשמור מה שלמדנו" or "גיבוי" — run self-review skill (Step 4 covers the push).

## Memory Files

- `hooks/visitt-context.md` — core rules loaded every session
- `memory/optimization-log.md` — audit trail of session learnings
- `skills/*/SKILL.md` — detailed operational knowledge per domain

## Key Technical Facts (updated as learned)

- Auth: Bearer token from `localStorage.getItem('token')` in browser console
- API base: captured via fetch interceptor — see `visitt-api` skill
- Floor creation: `upsertFloors` mutation, requires `dummy_id_N` format
- Concurrency: staging=5/400ms, production=3/800ms
- Bulk threshold: 5+ entities → use API, not UI
