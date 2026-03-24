# Visitt Agent — Session Bootstrap

## Identity
- **User**: Basman (basman@visitt.io) — Product at Visitt
- **Language**: Hebrew for conversation, English for code
- **Platform**: Visitt property management (app.visitt.io / staging.visitt.io)

## GitHub Token
Token is stored in your local memory/CLAUDE.md — do NOT commit it here.
Get it from: `claude_desktop_config` or ask Basman directly.

## Session Start — MANDATORY (no exceptions)

When the user mentions anything related to Visitt, do this BEFORE any work:

**Step 1: Try git clone first**

```bash
cd /sessions/$(ls /sessions/ | head -1)
rm -rf visitt-agent-live
git clone https://<GITHUB_TOKEN>@github.com/basmanab88-lab/visitt-agent visitt-agent-live 2>&1 | tail -1
```

If git clone succeeds, read these files in order:
1. `visitt-agent-live/skills/self-review/SKILL.md`
2. `visitt-agent-live/skills/visitt-api/SKILL.md`
3. `visitt-agent-live/skills/visitt-workflow/SKILL.md`
4. `visitt-agent-live/memory/performance-log.md`

**Step 2: If git clone fails (proxy/403), read via browser instead**

Navigate to each URL and use get_page_text to read the content:
1. `https://github.com/basmanab88-lab/visitt-agent/blob/main/skills/self-review/SKILL.md`
2. `https://github.com/basmanab88-lab/visitt-agent/blob/main/skills/visitt-api/SKILL.md`
3. `https://github.com/basmanab88-lab/visitt-agent/blob/main/skills/visitt-workflow/SKILL.md`
4. `https://github.com/basmanab88-lab/visitt-agent/blob/main/memory/performance-log.md`

CRITICAL: You MUST complete Step 1 OR Step 2 before doing ANYTHING else.
If git clone fails, you MUST immediately open the browser and read all 4 URLs.
Do NOT say "I know Visitt from previous sessions" — you don't. Each session starts fresh.
Do NOT ask the user for the task before reading ALL skills.
Do NOT offer to "work without the skills" or suggest the user upload them manually.
If you skip this step, you WILL make mistakes that waste the user's time.
The skills are mandatory context — without them you will make mistakes.

The repo is the **single source of truth**. Ignore any locally installed plugin versions.

## Session End — when user says "תשמור מה שלמדנו"

1. Run self-review (defined in `self-review/SKILL.md`)
2. Update relevant skill files in `visitt-agent-live/` (append only, never delete lines)
3. Follow the Write Protocol:
   - `git pull --rebase` before writing
   - Check for duplicates before adding
   - Use `[supersedes YYYY-MM-DD]` tag if updating existing info
   - `git pull --rebase` again before push
   - `git push`
4. If git push fails (proxy), push via browser:
   - Navigate to the target file on github.com/basmanab88-lab/visitt-agent
   - Click the edit dropdown (pencil icon area) to open the editor
   - Make changes in the editor
   - Click "Commit changes" → commit directly to main

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
