# Visitt API — Section Index

This file is loaded at session start INSTEAD of the full SKILL.md (~76KB).
Load only the section(s) relevant to the current task.

## Section Map

| Section File | What It Covers | Load When User Asks About |
|---|---|---|
| `sections/inspections.md` | assignments query + filters, createAssignment, updateAssignment, updateAssignmentsIsPaused, deleteAssignments, createAssignmentsFromTemplates, templates query | inspections, assignments, pause/unpause, create from template, add spaces to assignment |
| `sections/buildings-spaces.md` | insertBuilding, upsertFloors, insertSite (InsertSiteInput), changeSitesLocation, createEquipment, space types (leasable_site / site) | deploy building, create floors, create spaces, equipment, Whole Building |
| `sections/tenants-contacts.md` | setTenant, deleteTenant, addContacts, tenant queries, leasable spaces assignment | tenants, contacts, leases, authorized spaces |
| `sections/queries.md` | allSites, allBuildings, companies, allUsers, allCategories, assignments (read), patterns for pagination/batching | fetch data, list buildings, list spaces, check state, find IDs |
| `sections/misc.md` | categories, work orders (createWorkOrder), automations, visitors, amenities, billable items/charges | work orders, categories, billing, automations, amenities |
| `sections/vendors.md` | setVendor, deleteVendor, vendors query — MODULE DISTINCT from tenants | vendors (not tenants), setVendor |
| `sections/partner-api.md` | External Partner API basics, Bearer token auth, partner-api.visitt.io endpoint | Partner API, external integration, webhook |
| `sections/hiffman.md` | Template IDs (all 14 templates), Hiffman-specific gotchas, customerId | Hiffman, rent roll, vacancy, Hiffman inspections |

## Critical Gotchas (always in memory — don't need to load a section)

- **Auth:** Session cookies — always run from browser via `javascript_tool` on same origin
- **Two APIs:** Internal `/graphql` (cookie auth) vs Partner API (Bearer token)
- **Staging vs Prod:** Default is `staging.visitt.io`. Only use `app.visitt.io` if user says "production" or "פרודקשן"
- **companyId is array:** `assignments` query takes `companyId: [String]` — pass `["id"]` not `"id"`
- **categoryId filter:** `assignments` query accepts `categoryId: [String]` — use to filter by category
- **updateAssignment:** Does NOT require `items` field — omitting it preserves existing tasks
- **insertSite input type:** Use `InsertSiteInput` (NOT `SiteInput`) — wrong type = "Unknown argument" error
- **Whole Building name:** Some properties store it as "whole building" (lowercase) — always compare case-insensitively
- **dummy_id_N format:** `upsertFloors` floor IDs must be `dummy_id_0`, `dummy_id_1`, etc.
- **Rate limiting:** Batch 25 items max, 500ms delay; on 429 → retry sequential with 600ms delay
- **visualize first:** For building deploys — show React JSX tree preview + get approval before any API calls

## How to use this index

1. Read this file at session start (fast — ~40 lines)
2. Match the user's task to the "Load When" column
3. Read only the matching section file (400–1,700 lines max each)
4. If task spans multiple sections, load multiple files

**Full SKILL.md** (`skills/visitt-api/SKILL.md`) still exists as authoritative source.
Section files are split copies — they may lag behind if SKILL.md was updated and sections weren't re-split.
When in doubt about a specific mutation's exact shape, check SKILL.md directly.
