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

---

## 2026-03-21 — Documents, Amenity Bookings, Visitors mutations + React slot picker

**Bottlenecks**:
- Date picker fiber: calling level-6 onChange with `new Date()` worked but display showed "Invalid date" — cosmetic bug, form still functioned
- Slot picker: coordinate clicks and `.click()` don't update React state. Fiber onClick with `nativeEvent.preventDefault` required
- `bookAmenity` and `cancelAmenityBooking` names were wrong — actual mutations: `createAmenityBooking` + `updateAmenityBookingStatus`
- `deleteVisitor` UI trigger not found — exists on server but UI access point undiscovered
- Two `self-review` + `system-learning` updates were MISSING from previous commit — fixed this session

**Skills updated**:
- `visitt-api`: Added `deleteDocuments`, `createDocumentTag`, `deleteDocumentTag`, `createAmenityBooking`, `updateAmenityBookingStatus`, `deactivateVisitor`, `deleteVisitor` (inferred)
- `visitt-workflow`: Added Amenity Booking form patterns, Documents tag sidebar, Visitor cancel permission flow
- `system-learning`: Added React date picker fiber technique, slot/range picker fiber onClick pattern, confirmation dialog interception pattern
- `self-review`: Added rules #11 (slot picker fiber) and #12 (confirmation dialogs)

**User feedback**: "לא לשכוח שמטרת העל שלנו היא לבצע כמה שיותר פועלות רוחביות על המערכת בזמן הקצר ביותר ובאופן מדויק" — maximize cross-system operations per session

---

## 2026-03-21 (session 2) — Leasable Space Assignment (Northgate Office Park)

**Task**: Connect 3 tenants to 8 leasable spaces in Northgate Office Park on staging

**Bottlenecks**:
- `tenants` plural query with `locations { siteId buildingId }` fails — must use nested `{ site { _id } building { _id } }`. Cost: 1 failed attempt.
- `buildings` query needs `limit` and `skip` even for simple lookup. Cost: 1 failed attempt.
- `/my-property/building/:id` 404s — correct path is `/building/:id#spaces`. Learned quickly.

**Skills updated**:
- `visitt-api`: Added full leasable space concept guide, buildings query syntax fix, tenants plural locations field correction, allSites with buildingId pattern
- `visitt-workflow`: Added tenant-space UI patterns, URL map, Spaces tab structure, leased vs authorized display

**Performance**: 3 setTenant mutations in ~1.2s (400ms delay). 0 errors.

**User feedback**: "understand everything about the relationship between my property and tenants, and of course update your git"

---

## 2026-03-22 — Learn Settings & Feature Flags (Apex Properties)

**Task**: Navigate to staging Apex Properties, learn all Settings pages and Feature Flags, document everything.

**Bottlenecks**:
- `git clone` failed once — tried `cd /sessions/[dir]` without permission. Fix: run from working dir directly, no cd needed.
- SPA redirect confusion — `/company-settings#general` redirected to `/company/[id]#settings` (3 wasted navigation attempts). Fix: use `get_page_text` after unexpected redirect before retrying.
- `Tenant app pages` sub-section not navigable via URL directly — sub-nav in Tenant App tab doesn't always respond to direct URL.

**What worked well**:
- `get_page_text` harvested ALL feature flags from the Super-Admin page in one call (faster than 8+ scroll+screenshot cycles)
- Screenshots used only where visual state mattered (which toggles are ON/OFF)

**Skills updated**:
- `visitt-workflow`: Added full Settings & Feature Flags map (3 levels: Customer, Property Super-Admin, Property Admin). Feature flags table with descriptions, Experiments table, URL quick reference.
- `system-learning`: Added SPA context-sensitive redirect pattern, `get_page_text` vs screenshot guidance.

**User feedback**: "קדימה תעדכן את מה שלמדת" (triggered end-of-session self-review)

---

## 2026-03-22 — Visitt+ Portal Exploration (Visitt ↔ Visitt+ Relationship)

**Task**: Understand and document the full relationship between Visitt admin (staging.visitt.io) and the Visitt+ tenant portal (portal-staging.visitt.io). Use Emma Whitfield from Apex Tower as test tenant. Create a work order from Visitt+, create an amenity, attempt to book it from Visitt+.

**What was slow / blockers**:
1. `allSites(input: { buildingId })` → `GRAPHQL_VALIDATION_FAILED` — wasted 2 attempts before switching to `building(buildingId) { sites }`. Now fixed in visitt-api skill.
2. `setTenant` mutation shape — wrong field names (`_id` instead of `tenantId`, contacts as strings instead of `[{_id}]` objects). Fixed by capturing from network interceptor.
3. **Company context drift** — navigating from Amenities to Tenants silently switched active property from Apex Tower to Northgate Office Park. Required navigating to `/company/ID#settings` to reset.
4. **Tenant App categories empty** — created request showed no categories. Root cause: each portal needs explicit category config at Admin → Company-Settings → Tenant App → Requests. Not obvious from the UI.
5. **Amenity card not showing in /book-amenity** — amenity existed in Apollo cache (`totalCount: 1`) but card wasn't rendering. Root cause (hypothesized): amenity was scheduled Friday-only, today is Sunday. Portal filters by today's schedule slots. Left unresolved — requires adding Sunday schedule to amenity.
6. **ION-BUTTON** not found via `querySelectorAll('button')` — Web Component shadow DOM. Fixed: `querySelector('ion-button').click()`.
7. **ion-textarea** value not triggering React — needed direct `.value` setter + `dispatchEvent(new Event('input', { bubbles: true }))`.

**What worked well**:
- Work order creation via Visitt+ succeeded: WO `69bfd761633d48b012df1feb` (Maintenance / Suite 201 / Apex Tower Building / open)
- Amenity creation via admin UI succeeded: "Rooftop Conference Room" `69bfd863633d48b012df1ff0`
- Apollo cache extraction for diagnosis — fast way to verify data without extra API calls

**Skills updated**:
- `visitt-workflow` — Added: gotchas #18-22 (context drift, ion-button, ion-textarea, allSites correction, amenity card visibility). Added new section: "Visitt+ Portal — Full Architecture" (dependency chain, nav map, prerequisites checklist, portal ID discovery, category config flow).
- `visitt-api` — Fixed: allSites buildingId note (was wrong, now corrected with warning). Added: `building(buildingId)` query. Added: full Amenity API section (amenity query, amenities query, setAmenity mutation with schedule shape, amenity bookings query).
- `system-learning` — Added: Web Component shadow DOM gotchas (ion-button, ion-textarea). Added: Apollo cache as instant data source pattern. Added: SPA two-system architecture pattern (admin ↔ portal context drift).

**User feedback**: "בפעם הבאה אני לא רוצה שכאילו, אחת המטרות של הלמידה היא שבפעם הבאה אתה תגיע לכל האזורים האלה ותבצע פעולות בהרבה פחות זמן" → goal is speed next session, not just documentation.

**Next session — should be faster because**:
- Full Visitt+ dependency chain documented — no more "why isn't the portal working?" debugging
- allSites vs building(buildingId) distinction is now clear — no wasted failed queries
- Amenity schedule = day of week mapping is documented — immediate fix if amenity doesn't show
- Company context drift pattern documented — instant recognition + fix
- setTenant full shape captured — no mutation failures



<!-- TEST: browser push from Cowork works - delete this line -->
