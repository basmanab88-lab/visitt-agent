# Visitt Agent — Session Bootstrap

## Identity
- **User**: Basman (basman@visitt.io) — Product at Visitt
- **Language**: Hebrew for conversation, English for code
- **Platform**: Visitt property management (app.visitt.io / staging.visitt.io)

## GitHub Token
Token is stored in your local memory/CLAUDE.md — do NOT commit it here.
Get it from: `claude_desktop_config` or ask Basman directly.

## Session Start — MANDATORY (no exceptions)

When the user mentions anything related to Visitt, run this BEFORE doing any work:

```bash
cd /sessions/$(ls /sessions/ | head -1)
rm -rf visitt-agent-live
git clone https://<GITHUB_TOKEN>@github.com/basmanab88-lab/visitt-agent visitt-agent-live 2>&1 | tail -1
```

If git clone fails (proxy/network), read the skills via browser from:
`https://github.com/basmanab88-lab/visitt-agent/blob/main/skills/`

Then read these files — in this order — before doing anything else:
1. `visitt-agent-live/skills/self-review/SKILL.md` — session rules, write protocol
2. `visitt-agent-live/skills/visitt-api/SKILL.md` — all API mutations and queries
3. `visitt-agent-live/skills/visitt-workflow/SKILL.md` — UI patterns, URL map, gotchas
4. `visitt-agent-live/memory/performance-log.md` — benchmarks baseline

The repo is the **single source of truth**. Ignore any locally installed plugin versions — they are outdated.

## Session End — when user says "תשמור מה שלמדנו"

1. Run self-review (defined in `self-review/SKILL.md`)
2. Update relevant skill files in `visitt-agent-live/` (append only, never delete lines)
3. Follow the Write Protocol:
   - `git pull --rebase` before writing
   - Check for duplicates before adding
   - Use `[supersedes YYYY-MM-DD]` tag if updating existing info
   - `git pull --rebase` again before push
   - `git push`
4. If git push fails (proxy), offer to push via browser or ask user to relay to Claude Code

## Non-Negotiable Rules

1. **Visualize before deploy** — React JSX preview + explicit user approval before ANY deployment to Visitt
2. **Self-review after every task** — defined in self-review/SKILL.md, follow exactly
3. **Automate after 2-3 repetitions** — switch to API/JS after doing the same manual action 2-3 times
4. **dummy_id_N format** — upsertFloors IDs must be `dummy_id_0`, `dummy_id_1`, etc.
5. **Write protocol** — read self-review/SKILL.md before every push to the repo

## Key Terms (Basman's shorthand)
- **פרוס / יאללה** = deploy approved, go ahead
- **עצור** = stop immediately
- **תתייעל** = run self-review now
- **תשמור מה שלמדנו** = end-of-session review + push to GitHub
- **מעולה!** = positive signal, keep doing what you're doing

## Known Property IDs (Staging)
- Skynet customer: companyId = `69bacea93772df3673fb6f57`, customerId = `skynet`
- Apex Properties customer slug: `apex_properties`
- Westside Commons: companyId = `69be7bbe633d48b012df1d7b` (3 tenants)
- מגדלי ארלוזרוב: companyId = `5JQSqoQ3vKxNtg3Ko` (9 tenants)
- Staging Apex Tower portalId: `69bfd1a7633d48b012df1fb5`
