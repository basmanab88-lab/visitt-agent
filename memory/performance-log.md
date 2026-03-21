# Performance Log — Visitt Agent

All timed operations logged here. Format: `| date time | task_type | description | items | duration | rate | notes |`

---

## Log

| Date & Time | Task Type | Description | Items | Duration | Rate | Notes |
|-------------|-----------|-------------|-------|----------|------|-------|
| 2026-03-19 22:00 | `building_deploy` | Generic Customer — full building (floors+spaces+equipment) | 54 | 9.5s | 5.7/s | 5 floors, 36 spaces, 13 equipment. concurrency=5, delay=400ms |
| 2026-03-20 00:00 | `bulk_category_ops` | Generic Customer — 30 properties × 20 categories | 600 | 25s | 24.0/s | unassign+delete+create flow. 0 errors |
| 2026-03-20 00:00 | `bulk_automation_deploy` | Generic Customer — 30 properties × 5 automations | 150 | 24s | 6.25/s | createAutomation, delay=400ms. 0 errors |
| 2026-03-20 01:50 | `bulk_inspection_deploy` | Skynet — single property, 20 inspections | 20 | 10s | 2.0/s | daily+weekly+monthly mix, delay=400ms. 0 errors |
| 2026-03-20 02:10 | `property_fetch` | Basman Realty — 12 properties, buildings + sites | 12 props | 3s | 4.0 props/s | parallel fetch, stored in localStorage |
| 2026-03-20 02:15 | `bulk_inspection_deploy` | Basman Realty — 12 properties × 2 inspections | 24 | 12s | 2.0/s | daily+weekly, per-property site mapping, delay=400ms. 0 errors |

---

## Baselines Summary (established 2026-03-20)

Starting point for future comparison:

| Task Type | Items | Duration | Rate |
|-----------|-------|----------|------|
| `building_deploy` | 54 entities | 9.5s | 5.7/s |
| `bulk_category_ops` | 600 creates | 25s | 24.0/s |
| `bulk_automation_deploy` | 150 automations | 24s | 6.25/s |
| `bulk_inspection_deploy` | 20–24 | 10–12s | 2.0/s |
| `property_fetch` (parallel) | 12 props | 3s | 4.0 props/s |

---

## Notes on Methodology

- All times measured from first API call to last success confirmation
- `delay=400ms` between sequential calls (conservative — no errors at this rate)
- Parallel calls (e.g., `Promise.all`) use no delay — just network speed
- Rate = items ÷ total_seconds (not accounting for delay overhead)
- Error rate so far: **0/0** — all operations at 100% success
| 2026-03-21 14:00 | `work_order_create` | Apex Properties — 14 WOs via API + 1 via UI | 15 | 7s | 2.1/s | buildingId required field. 400ms delay. 0 errors |
| 2026-03-21 14:10 | `automation_create` | Apex Properties — 4 properties × 2 automations | 8 | 5s | 1.6/s | AutomationInput, 400ms delay. 4 "similar exists" skips |
