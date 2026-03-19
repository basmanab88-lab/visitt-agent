# Optimization Log

Audit trail of session learnings. The real value lives in the updated skill files — this is just a record of what changed and when.

---

## 2026-03-19 — Initial Setup

**Task**: Set up GitHub backup and cross-session memory architecture

**Changes made**:
- Added GitHub backup (Step 4) to `self-review` skill
- Created `CLAUDE.md` as cross-session context file
- Created this log file
- Synced all plugin files to GitHub repo

**Architecture decisions**:
- `CLAUDE.md` = lean cross-session context, max ~1-2 pages
- Skill files = detailed operational knowledge per domain
- `memory/optimization-log.md` = audit trail only
- GitHub = single source of truth, colleague-ready

**GitHub config**: stored at `/sessions/kind-awesome-mendel/mnt/.claude/github-config.json` (not committed)

---

## 2026-03-20 — Bulk Visitt Operations + Visual Builder + Stacking Plan

**Tasks**:
- Bulk category deployment: deleted 8 categories, created 20 new ones across 30 Generic Customer properties (600 total)
- Bulk automation deployment: 5 automations × 30 properties = 150 automations
- Stacking plan visual + API deployment for Generic Properties 1–5 (5 buildings, 23 floors, 104 spaces)
- Cross-session bootstrap (CLAUDE.md + GitHub clone) implemented and tested

**Bottlenecks & fixes**:
- `companies` query: wasted 5 calls trying `data`, `results`, `nodes` — field is `companies`. Now documented.
- Visual Builder "Done" button: tried localhost server, localStorage, Electron fs — all blocked. Correct: Claude populates JSX → user reviews visually → says "פרוס" in chat → Claude deploys. Now documented.
- Wrong companyId in JSX: Property 1 got Property 2's ID by copy-paste mistake → deployed to wrong property. Fix: always query API for IDs before populating JSX.
- Tree view shown AFTER deployment instead of before: user corrected this. Rule added: always tree view BEFORE deploy.
- `javascript_tool` async: documented correct `.then()` chain + window.__ pattern.
- Cross-session file access: discovered `session_info` MCP as workaround.

**Skills updated**:
- `visitt-api`: companies query syntax, category mutations, automation rules
- `visitt-workflow`: Visual Builder pattern, tree-view-first rule, companyId verification, bulk category/automation flows, 8 new gotchas
- `system-learning`: javascript_tool async pattern, cross-session access workaround, Visitt bulk operation benchmarks

**User feedback**: "מה שהיית אמור להציג לי לפני זה זה איזה ויז'ואל בילדר עם תצוגת עץ נקייה קליקבילית" — clear correction on tree view before deployment.
