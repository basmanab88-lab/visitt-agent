# ROUTING.md — Task Routing Table

This file maps user intents to the correct skill files and sections.
Claude reads this file at the START of every session to know where to find
the right knowledge for any given task.

## How to read this table

| Column | Meaning |
|--------|---------|
| Intent Pattern | What the user might say (English or Hebrew) |
| Skill | Which skill file to read |
| Section | Which section within that skill |
| Key Mutation/Query | The primary API call involved |
| Notes | Gotchas, prerequisites, important context |

## Routing Table

| Intent Pattern | Load File | Key Mutation/Query | Notes |
|---|---|---|---|
| "unpause inspections" / "activate paused" / "הפעל ביקורות" | `visitt-api/sections/inspections.md` | `updateAssignmentsIsPaused` | Batch call, needs assignmentIds array + isPaused: false |
| "pause inspections" / "השהה ביקורות" | `visitt-api/sections/inspections.md` | `updateAssignmentsIsPaused` | isPaused: true |
| "create inspections from template" / "צור ביקורות" | `visitt-api/sections/inspections.md` + `visitt-api/sections/hiffman.md` | `createAssignmentsFromTemplates` | Needs templateId + companyId + siteIds |
| "delete inspections" / "מחק ביקורות" | `visitt-api/sections/inspections.md` | `deleteAssignments` | Param is assignmentIds (NOT ids) |
| "check inspection status" / "מה מצב הביקורות" | `visitt-api/sections/inspections.md` + `visitt-api/sections/queries.md` | `assignments` query | MUST include customerId or returns empty |
| "add space to inspection" / "הוסף ספייס לביקורת" | `visitt-api/sections/inspections.md` + `visitt-api/sections/buildings-spaces.md` | `updateAssignment` | items field NOT required — omit to preserve tasks |
| "list templates" / "הצג תבניות" | `visitt-api/sections/inspections.md` | `templates` query | Requires TemplateSearchInput with customerId |
| "deploy a building" / "הטמע בניין" | `visitt-api/sections/buildings-spaces.md` + `visitt-workflow` | Multiple mutations | MUST visualize first (React JSX tree). dummy_id_N format. |
| "create spaces" / "צור יחידות" | `visitt-api/sections/buildings-spaces.md` | `insertSite` | modelType: leasable_site for rentable; use InsertSiteInput |
| "create equipment" / "הוסף ציוד" | `visitt-api/sections/buildings-spaces.md` | `createEquipment` | Needs buildingId + floorId + siteId |
| "add vendors" / "הוסף ספקים" | `visitt-api/sections/vendors.md` | `setVendor` | E.164 phone format required; vendors ≠ tenants module |
| "create tenants" / "הוסף דיירים" | `visitt-api/sections/tenants-contacts.md` | Various | Can use Partner API or Internal API |
| "deploy tenants from screenshot/spreadsheet" / "הטמע דיירים מתמונה" / "הטמע אנשי קשר" | `visitt-api/sections/tenants-contacts.md` + `system-learning/SKILL.md` → "Image Parsing" | `setTenant` + `addContacts` (verify orphans after) | Added 2026-04-26. ALWAYS show extracted data as table for user verification BEFORE deploy. setTenant accepts regular `site` modelType (not just leasable). Verify no orphan contacts via tenants query post-deploy. |
| "rename tenants" / "שנה שם דייר" / "שנה שם דירה" / "rename spaces" | `visitt-api/sections/tenants-contacts.md` | `setTenant` + `updateSite` | See "Rename tenant + rename space pattern" (2026-04-19). updateSite accepts minimal `{name}`. setTenant replaces entire tenant - include all locations+contacts. |
| "assign user to inspection" / "שייך עובד לביקורת" | `visitt-api/sections/inspections.md` | `updateAssignment` | Must pass all required fields + assignedUserIds |
| "assign user to all daily inspections" / "שייך עובד לכל המשימות היומיות" | `visitt-api/sections/inspections.md` + `visitt-api/sections/queries.md` | `assignments` query → batch `updateAssignment` | Filter by interval:"day", then loop. Use Promise.all for speed. |
| "update settings" / "עדכן הגדרות" | `visitt-workflow` | N/A (UI-based) | Usually requires browser automation |
| "add categories" / "הוסף קטגוריות" / "הטמע קטגוריות" | `visitt-api/sections/misc.md` | `createCategory` | Input type is `CreateCategoryInput!` NOT `CategoryInput!`. Use `shouldUpdateSingleCompany: true` + `parentCategoryId` for subs. deleteCategory must return `{ _id __typename }`. Batch 10-15 at a time. |
| "update categories" / "עדכן קטגוריות" | `visitt-api/sections/misc.md` + `visitt-workflow` | N/A (UI-based) | Bulk updates benefit from JS automation |
| "create work orders" / "פתח קריאות" | `visitt-api/sections/misc.md` | `createWorkOrder` | Can use Partner API |
| "import data" / "ייבא נתונים" | `visitt-import` | N/A | For bulk data loads from CSV |
| "generate report" / "הפק דוח" | `visitt-api/sections/queries.md` | Various queries | May need new skill if complex reporting |
| "list buildings / spaces / users" / "הצג בניינים" | `visitt-api/sections/queries.md` | `allBuildings`, `allSites`, `allUsers` | Pagination: skip/limit pattern |
| "partner API" / "external integration" | `visitt-api/sections/partner-api.md` | Various | Bearer token auth, partner-api.visitt.io |
| "הטמע מסמכים" / "create documents" / "documents with tags" | `visitt-api/sections/misc.md` | `createDocument` + `createDocumentTag` + `updateDocumentTags` | tagIds accepted in createDocument — one-pass possible. startDate NOT supported at creation. |
| "find companyId / property ID" / "מצא נכס" / "איזה נכס" | `system-learning/SKILL.md` (Apollo cache keys) + `visitt-api/sections/queries.md` | `allCompanies { _id name }` → bypass blocked `_id` via Apollo cache key `Company:ID` | Added 2026-04-20 (בית במושבה = `6368fd67331a596467b622f7`) |
| "add subspaces" / "הוסף תתי אתרים" / "הטמעת מחסנים וחניות" / "מחסן+חניה לדירה" | `visitt-api/sections/buildings-spaces.md` → "Subspace Deploy Pattern" | `insertSite` (one-shot with `parentSiteId`) | Added 2026-04-26. modelType=leasable_site, type=דירה. Garden apt naming reverses (`1G` Excel ↔ `G1` Visitt). Split comma-separated values into multiple subspaces. |
| "fix display" / "השם נראה הפוך" / "bidi rendering" / "האות נפרדת מהמספר" | `visitt-api/sections/buildings-spaces.md` → "Bidi Display Fix" + `system-learning/SKILL.md` → "DOM-First Methodology" | `updateSite` (wrap name with RLI/PDI: `⁧...⁩` = U+2067/U+2069) | Added 2026-04-26. ALWAYS inspect the actual DOM first (CSS direction, unicode-bidi, per-char pixel positions via Range.getBoundingClientRect). Don't guess fixes. |

## Hiffman-Specific Routes

| Intent Pattern | Load File | Key Info |
|---|---|---|
| "Hiffman inspections" / "ביקורות הילמן" | `visitt-api/sections/hiffman.md` + `visitt-api/sections/inspections.md` | customerId: "hiffman_national" |
| "Hiffman rent roll" | `visitt-api/sections/hiffman.md` + `visitt-api/sections/inspections.md` | templateId: 6971c3893ac06b4ffceec582 |
| "Hiffman vacancy" | `visitt-api/sections/hiffman.md` + `visitt-api/sections/inspections.md` | Industrial/Office/Retail templates — see template table in hiffman.md |

## Template ID Reference (Hiffman, verified 2026-04-01)

| Template Name | Template ID |
|---|---|
| Association/Land | 6971c307efbab709fcd6a56e |
| Exterior (Industrial) | 6971c307efbab709fcd6a570 |
| Exterior (Office) | 6971c307efbab709fcd6a571 |
| Exterior (Retail) | 6971c307efbab709fcd6a572 |
| Interior (Industrial) | 6971c307efbab709fcd6a573 |
| Interior (Office) | 6971c307efbab709fcd6a56f |
| Move In/Move Out (Industrial) - UPDATED | 6971c30c7a546d2b7cf4479f |
| Move In/Move Out (Office) - UPDATED | 6971c30c7a546d2b7cf447a1 |
| Move In/Move Out (Retail) - UPDATED | 6971c30c7a546d2b7cf447a2 |
| Rent Roll Review | 6971c3893ac06b4ffceec582 |
| Vacancy (Industrial) - UPDATED | 6971c3a07a546d2b7cf4483f |
| Vacancy (Office) - UPDATED | 6971c3bb3ac06b4ffceec5a5 |
| Vacancy (Retail) - UPDATED | 6971c3c07a546d2b7cf4485d |
| Portfolio Info Update | 699def58b3b7cb375a9d4e30 |

## No Match Found?

If the user's request doesn't match any row above:
1. Proceed without a pre-existing skill
2. Use the fetch interceptor to discover needed mutations
3. Execute the task
4. During self-review, ADD a new row to this table for the discovered pattern

## Building Deploy — Mandatory Visual Preview Rule (added 2026-04-06)
Every building deploy MUST follow this exact sequence:
1. Collect info (env, property, building name, floor count, spaces per floor, equipment)
2. Show React JSX interactive tree preview (editable: rename, delete, restore, add floor)
3. Wait for explicit approval
4. Deploy via API
5. Verify entity counts match
See `visitt-api/sections/buildings-spaces.md` → "Mandatory Visual Preview" section for full spec.
