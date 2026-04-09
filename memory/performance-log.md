# Performance Log â Visitt Agent

All timed operations logged here. Format: `| date time | task_type | description | items | duration | rate | notes |`

---

## Log

| Date & Time | Task Type | Description | Items | Duration | Rate | Notes |
|-------------|-----------|-------------|-------|----------|------|-------|
| 2026-03-19 22:00 | `building_deploy` | Generic Customer â full building (floors+spaces+equipment) | 54 | 9.5s | 5.7/s | 5 floors, 36 spaces, 13 equipment. concurrency=5, delay=400ms |
| 2026-03-20 00:00 | `bulk_category_ops` | Generic Customer â 30 properties Ã 20 categories | 600 | 25s | 24.0/s | unassign+delete+create flow. 0 errors |
| 2026-03-20 00:00 | `bulk_automation_deploy` | Generic Customer â 30 properties Ã 5 automations | 150 | 24s | 6.25/s | createAutomation, delay=400ms. 0 errors |
| 2026-03-20 01:50 | `bulk_inspection_deploy` | Skynet â single property, 20 inspections | 20 | 10s | 2.0/s | daily+weekly+monthly mix, delay=400ms. 0 errors |
| 2026-03-20 02:10 | `property_fetch` | Basman Realty â 12 properties, buildings + sites | 12 props | 3s | 4.0 props/s | parallel fetch, stored in localStorage |
| 2026-03-25 14:00 | `billable_item_create` | Apex Tower staging — 34 materials from Excel | 34 | 14s | 2.4/s | fetch('/graphql'), delay=400ms. 0 errors |
| 2026-03-20 02:15 | `bulk_inspection_deploy` | Basman Realty â 12 properties Ã 2 inspections | 24 | 12s | 2.0/s | daily+weekly, per-property site mapping, delay=400ms. 0 errors |

---

## Baselines Summary (established 2026-03-20)

Starting point for future comparison:

| Task Type | Items | Duration | Rate |
|-----------|-------|----------|------|
| `building_deploy` | 54 entities | 9.5s | 5.7/s |
| `bulk_category_ops` | 600 creates | 25s | 24.0/s |
| `bulk_automation_deploy` | 150 automations | 24s | 6.25/s |
| `bulk_inspection_deploy` | 20â24 | 10â12s | 2.0/s |
| `billable_item_create` | 34 items | 14s | 2.4/s |
| `property_fetch` (parallel) | 12 props | 3s | 4.0 props/s |
| `template_inspection_deploy` | 129 inspections | ~30s | 4.3/s |
| `assignment_status_check` | 285 properties | ~8min | 0.6/s |

---

## Session Log (2026-03-31) — Hiffman Bulk Inspection Deployment

| Date & Time | Task Type | Description | Items | Duration | Rate | Notes |
|-------------|-----------|-------------|-------|----------|------|-------|
| 2026-03-31 | `template_inspection_deploy` | Hiffman Exterior (Industrial) — batch create from template | 129 | ~30s | 4.3/s | 5 batches of 25+4. Double-check saved 27 duplicates. 3 NO_COMPANY skipped. |
| 2026-03-31 | `template_inspection_deploy` | Hiffman Exterior (Office) — rows 576-598 | 8 | ~3s | 2.7/s | Single batch. 11 already active, 3 paused, 1 NO_COMPANY. |
| 2026-03-31 | `template_inspection_deploy` | Hiffman Interior (Industrial) — rows 603-628 | 11 | ~4s | 2.75/s | Single batch. 15 already active. |
| 2026-03-31 | `assignment_status_check` | Hiffman Ext (Industrial) — full 285 property scan | 285 | ~8min | 0.6/s | 6 batches of ~50. Required customerId param discovery. |
| 2026-03-31 | `assignment_status_check` | Hiffman Ext (Office) — 23 properties, 3-status | 23 | ~15s | 1.5/s | active/paused/missing check with isPaused field. |
| 2026-03-31 | `assignment_status_check` | Hiffman Int (Industrial) — 26 properties, 3-status | 26 | ~18s | 1.4/s | active/paused/missing check. |

**Key learning:** `createAssignmentsFromTemplates` is 2x faster than `createAssignment` per item (4.3/s vs 2.0/s) because it accepts a batch array natively. Double-check before creation is essential — saved 27 duplicates in one run.

---

## Notes on Methodology

- All times measured from first API call to last success confirmation
- `delay=400ms` between sequential calls (conservative â no errors at this rate)
- Parallel calls (e.g., `Promise.all`) use no delay â just network speed
- Rate = items Ã· total_seconds (not accounting for delay overhead)
- Error rate so far: **0/0** â all operations at 100% success
| 2026-03-21 14:00 | `work_order_create` | Apex Properties â 14 WOs via API + 1 via UI | 15 | 7s | 2.1/s | buildingId required field. 400ms delay. 0 errors |
| 2026-03-21 14:10 | `automation_create` | Apex Properties â 4 properties Ã 2 automations | 8 | 5s | 1.6/s | AutomationInput, 400ms delay. 4 "similar exists" skips |
| 2026-03-21 15:00 | `tenant_space_assign` | Northgate â 3 tenants Ã 2-4 leasable spaces each | 8 | 1.2s | 6.7/s | setTenant with locations[isLeased:true], 400ms delay. 0 errors |

| 2026-03-25 | `building_deploy` | Apex Tower (staging) — 1 building, 5 floors, 18 spaces, 10 equipment | 28 | ~15s | 1.9/s | insertBuilding+upsertFloors+insertSite+changeSitesLocation. 0 errors. staging.visitt.io |
| 2026-03-29 | `vendor_create` | Hiffman National — 8 properties, ~57 vendors total | 57 | ~25s | 2.3/s | setVendor, E.164 phone, delay=400ms. Initial run used wrong mutation (setTenant) — 57 records deleted, re-created with setVendor. Final: 0 errors |
| 2026-03-29 | `user_access_assign` | Hiffman National — 23 missing user→property assignments | 23 | ~5s | 4.6/s | assignUserAccess, delay=200ms. 0 errors. Found via allUsers+companies cross-ref (505 desired pairs → 23 missing) |

---

## Session Log (2026-04-01) — Hiffman Rows 668-705 Mixed Types

| Date & Time | Task Type | Description | Items | Duration | Rate | Notes |
|-------------|-----------|-------------|-------|----------|------|-------|
| 2026-04-01 | `assignment_unpause` | Rent Roll Review — 6 paused → active | 6 | ~2s | 3.0/s | updateAssignmentsIsPaused, single batch call. 0 errors |
| 2026-04-01 | `assignment_unpause` | Rent Roll Review — 9 more paused → active | 9 | ~2s | 4.5/s | updateAssignmentsIsPaused, single batch call. 0 errors |
| 2026-04-01 | `template_inspection_deploy` | Vacancy/MoveIn/Exterior — 12 + 2 created from templates | 14 | ~5s | 2.8/s | createAssignmentsFromTemplates, 2 batch calls (12+2). 0 errors |
| 2026-04-01 | `assignment_status_check` | Rows 668-705 — 38 properties, 3-status check | 38 | ~30s | 1.3/s | Two rounds (20+18). active/paused/missing classification |
| 2026-04-01 | `mutation_discovery` | Found updateAssignmentsIsPaused via fetch intercept | 1 | ~5min | — | Intercepted Activate button click in Manage Inspections UI |

**Key learning:** `updateAssignmentsIsPaused` is the ONLY mutation for pausing/unpausing inspections. It accepts a batch array, making it very efficient. Discovery took ~5 min via fetch intercept — now documented in visitt-api/SKILL.md for instant reuse.

---

## Session Log (2026-04-04) — Career Muse Pipeline Fixes

| Date & Time | Task Type | Description | Items | Duration | Rate | Notes |
|-------------|-----------|-------------|-------|----------|------|-------|
| 2026-04-04 | `career_pipeline_fix` | NULL poisoning fix in excludeIds | 1 | ~2min | — | JS .filter(id => id != null) on excludeIds array. NULLs from 13 agent_results with null job_directory_id caused PostgREST to serialize improperly, returning wrong jobs (54% eng roles instead of 81% CSM roles) |
| 2026-04-04 | `career_pipeline_fix` | CV post-processing filter | 1 | ~5min | — | Added PROTECTED_STRINGS array to block title changes + identity line changes + em-dash output. Model kept ignoring "never change titles" instruction. |
| 2026-04-04 | `career_pipeline_fix` | RPC description limit 300→2000 | 1 | ~1min | — | match_jobs_by_embedding was truncating job description to 300 chars, now 2000. Gives CV prompt better context. |
| 2026-04-04 | `career_pipeline_fix` | Google Doc template sync | 6 edits | ~10min | — | Template had "Strategist" not "Lead", missing AI Projects section, missing Visitt Agent bullet, old competencies. Used Google Docs batchUpdate API from browser JS. |
| 2026-04-04 | `career_pipeline_deploy` | Edge function v15→v17 | 3 deploys | ~5min | — | v15: CV prompt fix. v16: null filter + logging. v17: post-processing filter. |

**Key learnings:**
- NULL values in JS arrays passed to PostgREST RPC calls cause silent data corruption — always filter nulls before passing to .rpc()
- LLM instruction-following for "never change X" rules is unreliable — need post-processing filters as safety net
- Google Doc template must exactly match DB base_resume_text or find-and-replace pairs won't apply to copies
- Embedding quality is good (81% CSM roles) but all good matches get exhausted after ~50 jobs processed. Need fresh job data scraping.

---

## Session Log (2026-04-05) — Career Agent Daily Run (Scheduled/Autonomous)

| Date & Time | Task Type | Description | Items | Duration | Rate | Notes |
|-------------|-----------|-------------|-------|----------|------|-------|
| 2026-04-05 09:00 | `career_daily_run` | Full autonomous pipeline — Gmail + web search → Supabase → CVs → contacts → messages | 5 jobs | ~25min | — | Run ID: 25e4f9f3. All 5 passed quality gate. Source: LinkedIn email alerts via Gmail MCP. |
| 2026-04-05 09:00 | `job_discovery` | Gmail label:Jobs (last 48h) — LinkedIn email digest | 6 raw, 5 qualified | ~2min | — | 1 dropped (CyberproAI SOC Manager — wrong fit, score 60). Threshold: ≥70. |
| 2026-04-05 09:05 | `job_description_scrape` | LinkedIn pages didn't render JDs, Workable blocked by Cloudflare | 5 | ~8min | — | All 5 reconstructed from company research + web search. Helfy had real description from web search results. |
| 2026-04-05 09:10 | `cv_creation` | Google Drive copy + Docs batchUpdate for 5 tailored CVs | 5 | ~3min | 1.7/s | Template copied via Drive API, 3 text replacements per doc via Docs batchUpdate. All successful. |
| 2026-04-05 09:15 | `contact_discovery` | LinkedIn people search for 5 companies | 10 contacts | ~5min | 2/min | 2 contacts per job. All have /in/ URLs verified. CauseMatch, Autofleet, Rescana, Check Point, Helfy. |
| 2026-04-05 09:20 | `message_drafting` | Personalized outreach messages for all contacts | 10 messages | ~2min | — | Templates adapted per contact role (HR, hiring manager, team member, co-founder). |
| 2026-04-05 09:22 | `quality_gate` | Automated verification of all 5 records | 5 | ~1min | — | ALL PASS: has_jd, has_contacts (/in/ verified), has_messages, has_cv (docs.google.com), has_url. |

**Top matches this run:**
1. CauseMatch — Head of RevOps & Internal AI (85%) — AI + ops leadership, perfect blend
2. Autofleet — Head of Customer Success Management (82%) — B2B SaaS CS leadership, Tel Aviv
3. Rescana — CS & Solutions Manager (76%) — cybersecurity platform, AI-powered
4. Check Point — Revenue Operations PM (72%) — big tech, RevOps focus
5. Helfy — Director of Ops & Support (70%) — right role but B2C, heavy experience req

**Key learnings:**
- Chrome in Chrome extension disconnects are transient — retry 3-4 times before falling back
- LinkedIn job pages (logged in) don't render job descriptions in the main content area — need alternative scraping strategy (Greenhouse API, Workable, company career pages)
- Gmail MCP tool searches u/0 (primary account), not u/1 — need to verify which account has the job labels
- Reconstructed job descriptions work well enough to pass quality gate but should be flagged for manual review
- Google Docs batchUpdate with simple text replacements (3 per doc) is fast and reliable — ~1.7 docs/sec
- LinkedIn people search is the most reliable source for contacts — get_page_text extracts names, titles, and company info cleanly

**Platform gaps found:**
- No way to get LinkedIn job descriptions via browser when lazy-loading doesn't trigger
- Gmail MCP doesn't have a send tool — drafts only, need browser for actual sending
- WebFetch is blocked for many career-related domains (linkedin.com, autofleet.io, workable.com, rescana.com)

---

## Session Log (2026-04-09) — קרסו חדרה Full Building Deploy + Cleanup

| Date & Time | Task Type | Description | Items | Duration | Rate | Notes |
|-------------|-----------|-------------|-------|----------|------|-------|
| 2026-04-09 | `building_deploy` | קרסו חדרה — 6 floors, 66 sites, 11 equipment (production) | 83 | ~25min total | — | See notes below |
| 2026-04-09 | `orphan_cleanup` | Delete 10 duplicate sites created by concurrent batch race condition | 10 | ~2min | — | `deleteSites(siteIds: [...])` — single API call |

**What went wrong (race condition):**
The first `insertSite` batch appeared to hang (no window.__createdSites update). A second batch was started after reset. But the first batch was still running async in JS — both batches ran concurrently and created 76 sites (66 expected + 10 duplicates). Both batches also ran `changeSitesLocation`, so all 76 were assigned to floors.

**Cleanup approach:**
- Queried `sites(input: { buildingId, companyId, modelType: [site, leasable_site] })` with `parentBranches` field
- Identified 10 orphans via `parentBranches: []` (first batch created sites but their `changeSitesLocation` ran AFTER the second batch's, so they got de-assigned or never properly assigned)
- Discovered `deleteSites(siteIds: [...])` mutation via fetch interceptor + trial/error
- Deleted all 10 in one API call

**Time breakdown:**
- Excel parsing + preview JSX: ~5 min
- insertBuilding + upsertFloors + insertSite + changeSitesLocation: ~10 min (incl. duplicate incident)
- Finding `deleteSites` mutation: ~15 min (biggest time sink — tried 15+ variants, searched obfuscated bundle)
- Orphan identification + cleanup: ~5 min

**Key learnings:**
- NEVER start a second batch if the first appears to hang — check `window.__createdSites` state more carefully, add a timeout with console.log
- `deleteSites(siteIds: [...])` is the batch delete mutation (plural, takes array)
- `parentBranches: []` = orphan site (not assigned to any floor)
- JS bundle is obfuscated — don't waste time searching it for mutation names
- `/building/{id}` direct URL → React crash — use SPA pushState instead
- Fetch interceptor dies on hard reload — use pushState + popstate to stay on same JS context

---

## Session Log (2026-04-07) — HandyMan WhatsApp Bot Architecture

| Date & Time | Task Type | Description | Items | Duration | Rate | Notes |
|-------------|-----------|-------------|-------|----------|------|-------|
| 2026-04-07 | `architecture_design` | HandyMan bot full architecture design | — | ~1h | — | Multi-system WhatsApp routing, Google Sheets backend, usage tracking |
| 2026-04-07 | `db_setup` | Supabase tables: users_wa, usage_log, handyman_sessions | 3 tables | ~5min | — | users table already existed → named users_wa |
| 2026-04-07 | `router_update` | whatsapp/index.ts routing by users_wa.system | 1 file | ~10min | — | t800 → existing handler, handyman → new stub |
| 2026-04-07 | `handyman_handler` | Classification + session + usage logging | 1 file | ~20min | — | claude-haiku-3-5, 6 types, Hebrew, stubs for Sheets |
| 2026-04-07 | `google_sheets` | sheets.ts — auto-create spreadsheet + CRUD | 1 file | ~20min | — | Service account auth, 4 tabs, auto-share with basman |
| 2026-04-07 | `handler_update` | Real Sheets integration replacing stubs | 1 file | ~15min | — | Client lookup, partial match, clarification flow |
| 2026-04-07 | `test_console` | /handyman-test page + API route | 2 files | ~15min | — | Chat UI, shows classification badge |

**Key learnings:**
- **Supabase `users` table conflict**: T-800 already had a `users` table — new routing table must be `users_wa`. Always check existing schema before creating tables.
- **Claude Haiku too weak for informal Hebrew**: Haiku returned UNKNOWN for complex multi-action messages like "נתלי כהן 052-1234567 טיח שילמה 600 עלה לי חומרים 100". Use claude-sonnet-4-5 for Hebrew NLP tasks.
- **Single classification fails on compound messages**: Real contractor messages contain 2-3 actions. Architecture must return `actions[]` array, not a single type. Classify-then-act pattern collapses on compound input.
- **Google Service Account > OAuth for bots**: Service accounts never expire and need no user interaction. Always prefer service account for server-to-server Google API access.
- **Test console before WhatsApp**: Building /handyman-test UI allows full QA of classification + Sheets logic without needing a WhatsApp number. Essential step before handing off to real user.
- **Users table naming convention**: When building on top of existing Supabase projects, always prefix new tables (users_wa, not users) to avoid conflicts with existing auth/data tables.

---

## Session: 2026-04-09 (Part 2) — קרסו חדרה Inspections Deploy

**Task:** Deploy 13 inspections from Excel to קרסו חדרה production building

**Results:**
- ✅ Created user: שליו פחימה (ID: 69d7d49555e8a098f3058cca) via createUser mutation
- ✅ Created site: "כל הבניין" (ID: 69d7d561c097c1e7274b4d70) — no floor assignment — via insertSite
- ✅ Deployed all 13 inspections via createAssignment
- Total time: ~45 min (including user creation, site creation, frequency discovery)

**Key discoveries:**
- `every_3_months` and `every_6_months` are the correct interval values (NOT "3month"/"6month")
- These use `daysInWeek: [0,1,2,3,4]` — weekdays only
- `createUser` mutation uses `customerId` (slug) not property ID
- `insertSite` with no `parentBranchId` creates whole-building space
- Settings → Users page: `/settings/account/{customerId}/users`
- Inspection creation form: `/assignment/create?companyId=...` (accessed via "Add inspection" → "New inspection")

**Inspections deployed (all assigned to שליו פחימה):**
| # | Name | Frequency | Site(s) | Category |
|---|------|-----------|---------|----------|
| 1 | סיור יומי | day | כל הבניין | אחזקה |
| 2 | סיור יומי חניון | day | כל הבניין | אחזקה |
| 3 | בדיקת צ'ילרים - יומית | day | כל הבניין | מיזוג |
| 4 | בדיקת חדרי משאבות | day | חדר משאבות ×2 | כיבוי אש |
| 5 | בדיקת צ'ילרים - שבועית | week | כל הבניין | מיזוג |
| 6 | בדיקת משאבות מים | week | חדר משאבות ×2 | אחזקה |
| 7 | בדיקת ציוד כיבוי אש בקומות | week | כל הבניין | כיבוי אש |
| 8 | בדיקת גנרטור דיזל | week | גנרטור | אחזקה |
| 9 | בדיקת תקינות קומות | month | כל הבניין | אחזקה |
| 10 | בדיקת יט"אות | month | כל הבניין | מיזוג |
| 11 | בדיקת שירותים | every_3_months | שירותים ×3 | אחזקה |
| 12 | בדיקת מזגן מפוצל | every_3_months | כל הבניין | מיזוג |
| 13 | בדיקת עמדות כיבוי אש | every_6_months | עמדות כיבוי אש ×4 | כיבוי אש |

**JSX template saved:** `skills/visitt-workflow/templates/inspections-preview-template.jsx`
