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

---

## 2026-03-20 (Session 2) — Inspections + Tenants/Contacts/Spaces/My Property Exploration

**Tasks**:
- Explored Visitt Inspections (Assignments) section A-Z: captured `createAssignment` mutation
- Created 20 bulk inspections for Skynet property via API (20/20 success, ~10s)
- Built React JSX Visual Builder for inspection preview (pre-deploy visualization)
- Explored Tenants & Contacts: captured `addContacts`, `setTenant`, `contacts` query
- Explored Spaces in tenant detail: captured `setTenant` with `locations[{siteId,isLeased}]`
- Explored My Property (`/building/<id>`): captured `insertSite` for spaces + equipment, `sitesSearch`, `buildingStructure`

**Bottlenecks & fixes**:
- **Ariakit SelectCombobox took 4 attempts**: Tried react-select selectors first. Root cause: two different dropdown libraries in the same app. Rule added: inspect component class before trying selectors. Ariakit = `button.SelectComboboxValue` + `[role="option"]`.
- **localStorage interceptor re-install**: Required 3+ times per session after SPA navigation. Expected — document pattern and just do it automatically every time.
- **`activeSideMenuItem=spaces` is wrong**: The Spaces tab in tenant detail is actually `locations`. Wasted one navigation attempt.
- **`/my-property` returns 404**: Correct URL is `/building/current` → redirects to `/building/<id>`. Now documented.
- **github-config.json missing (2nd session in a row)**: 2 commits waiting locally (ec7e2ac + 8d96f4b). Push blocked. User must create this file to unblock.

**Skills updated**:
- `visitt-api`: setTenant full input (locations+contacts), addContacts with tenants[] field, new queries (tenants, tenant, contacts, sitesSearch, allSites), insertSite equipment variant
- `visitt-workflow`: Tenants/Contacts URL patterns, Ariakit SelectCombobox pattern, My Property section, new gotchas #11-13
- `system-learning`: Ariakit vs react-select distinction, setTenant replace-all pattern, insertSite dual-purpose, /building/current shortcut, new Visitt entries

**User feedback**: No explicit feedback this session — autonomous completion.

**Pending**: Push 2 commits to GitHub once github-config.json is restored.

---

## 2026-03-21 — Tenant Bulk Import (מרום ים)

**Task**: Create 25 fictional tenants + 50 contacts + space assignments in מרום ים staging property.

**Bottlenecks**:
- Repo clone failed (no github-config.json) → fell back to outdated local plugin skill → re-discovered patterns already in the repo (setTenant format, contact-tenant linking). Cost: ~20min.
- Phone validation: `addContacts` rejects unallocated Israeli number ranges (e.g. 052-1XXXXXX). Discovered by trial and error. Test contacts created during probing blocked real batch (duplicate check). Cost: ~10min.
- `window.__vars` lost on SPA navigation → had to re-query tenant IDs from API after page change.
- Chrome extension disconnected mid-session → space assignment step incomplete.

**Result**: 25 tenants ✅, 50 contacts ✅, space assignments ⏳ (pending next session).

**Skills updated**:
- `visitt-api`: phone validation rules, `tenants` query format (TenantSearchInput), Apollo cache fallback for leasable sites
- `system-learning`: test data pollution pattern, session bootstrap failure impact

**User feedback**: "נראה טוב" on visual preview. Protocol update added for git push flow.

**Pending next session**: Assign leasable spaces to tenants via `setTenant` with `locations[{buildingId, siteId, isLeased}]`. Format is in the skill — just need Chrome reconnected.
