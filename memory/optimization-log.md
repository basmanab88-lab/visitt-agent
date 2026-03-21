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

---

## 2026-03-21 — Page Learning: Visitors, Amenities, Documents

**Task**: Learn all actions/operations on Visitors, Amenities, and Documents pages in staging.visitt.io so future deploys/executions are faster.

**Bottlenecks**:
- Visitor form submit didn't fire mutation via interceptor — root cause: React radio click via `.click()` didn't update React state (prop type warning appeared). Workaround: use React native setter hack for all inputs, not `.click()`.
- `bookAmenity` / `deleteAmenityBooking` / `cancelAmenityBooking` return "Invalid query" (GRAPHQL_VALIDATION_FAILED) when probed directly — cannot be called via custom queries. Must use GQL interceptor from real UI flow.
- Session expired before Documents mutation capture completed — need a fresh session for that.
- Finding properties with tenants: Westside Commons (`69be7bbe633d48b012df1d7b`) has 3 tenants. Briarwood (`69be7bbe633d48b012df1d7f`) has zero — very similar IDs, easy to confuse.

**Techniques discovered**:
- Batch-checking tenant counts across properties: parallel `tenants(input: {companyId})` queries via `Promise.all` — found a property with tenants in one round-trip.
- Chunk discovery: search the main bundle for `assets/XXXX.js` patterns to find lazy-loaded chunk filenames, then fetch them directly to extract GQL templates.
- GQL probe for "does mutation exist": `mutation { mutationName }` → "Cannot query field" = NOT FOUND, "Invalid query" = EXISTS (needs proper args).
- Mutation input type discovery: `mutation M($input: FakeInputType!) { M(input: $input) { _id } }` → "Unknown type" = mutation exists with `input` arg.

**Skills updated**:
- `visitt-workflow/SKILL.md` — Added full Page Maps for Visitors, Amenities, Documents (URLs, table columns, buttons, filters, form fields, mutation signatures)
- `visitt-api/SKILL.md` — Added `createVisitor`, `setAmenity`, `archiveAmenity`, `updateAmenityBooking` with full signatures + variables. Added TODO items for remaining unknowns.
- `memory/optimization-log.md` — This entry.

**User feedback**: Session continued from previous context window — no explicit feedback during this session.

**Pending next session**:
- Documents: capture `createDocument` mutation (load page with interceptor active before clicking "+ Add document")
- `bookAmenity` input shape: load amenity booking page with interceptor, click "+ Book amenity", fill form, submit
- `arrivalTime` sub-fields for timed (non-all-day) visitor visits
- Visitor delete/cancel mutation names


---

## 2026-03-21 — Page Learning: Visitors, Amenities, Documents

**Task**: Learn all actions/operations on Visitors, Amenities, and Documents pages in staging.visitt.io so future deploys/executions are faster.

**Bottlenecks**:
- Visitor form submit didn't fire mutation via interceptor — root cause: React radio click via `.click()` didn't update React state (prop type warning appeared). Workaround: use React native setter hack for all inputs, not `.click()`.
- `bookAmenity` / `deleteAmenityBooking` / `cancelAmenityBooking` return "Invalid query" (GRAPHQL_VALIDATION_FAILED) when probed directly — cannot be called via custom queries. Must use GQL interceptor from real UI flow.
- Session expired before Documents mutation capture completed — need a fresh session for that.
- Finding properties with tenants: Westside Commons (`69be7bbe633d48b012df1d7b`) has 3 tenants. Briarwood (`69be7bbe633d48b012df1d7f`) has 0 — similar IDs, easy to confuse.

**Techniques discovered**:
- Batch-checking tenant counts across properties: parallel `tenants(input: {companyId})` via `Promise.all` — found tenanted property in one round-trip.
- Chunk discovery: search main bundle for `assets/XXXX.js` strings to find lazy-loaded chunks, then fetch directly.
- GQL probe rules: "Cannot query field" = NOT FOUND, "Invalid query" = EXISTS, "Unknown type" = mutation exists with `input` arg (type unknown).

**Skills updated**:
- `visitt-workflow/SKILL.md` — Full Page Maps for Visitors, Amenities, Documents
- `visitt-api/SKILL.md` — createVisitor, setAmenity, archiveAmenity, updateAmenityBooking + TODO items
- `memory/optimization-log.md` — This entry

**Pending next session**:
- Documents mutations: load with interceptor → click "+ Add document" → submit → capture
- `bookAmenity` input shape: interceptor → "+ Book amenity" UI flow → capture
- Visitor delete/cancel mutation names
