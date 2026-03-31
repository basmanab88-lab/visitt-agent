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
