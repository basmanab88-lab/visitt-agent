---
name: performance-tracker
description: >
  Performance tracking and benchmarking for Visitt automation tasks.
  Triggered at the end of any bulk operation or deployment task.
  Automatically logs timing, item count, and rate to memory/performance-log.md.
  Use when the user asks "כמה זמן לקח", "השתפרנו?", "מה הביצועים", or at session end.
---

# Performance Tracker — Visitt Agent

Every time Claude completes a timed task, log it. This builds a baseline that shows
improvement across sessions. Over time, we'll know: are we getting faster? Where are
the bottlenecks? What's worth optimizing?

## How to Time a Task

Wrap every bulk operation with timing:

```javascript
const t0 = Date.now();

// ... do the work ...

const duration = ((Date.now() - t0) / 1000).toFixed(1);
const rate = (itemCount / (duration)).toFixed(1);
console.log(`✅ ${itemCount} items in ${duration}s → ${rate}/s`);
```

## What to Log

After every significant operation, add an entry to `memory/performance-log.md`.

### Task Types

| Task Type | What It Covers |
|-----------|----------------|
| `bulk_inspection_deploy` | createAssignment × N properties |
| `bulk_category_ops` | unassign + delete + create categories across N properties |
| `bulk_automation_deploy` | createAutomation × N properties |
| `building_deploy` | full building: insertBuilding + upsertFloors + insertSite × N + changeSitesLocation |
| `tenant_setup` | setTenant + addContacts per property |
| `mutation_discovery` | using localStorage interceptor to capture unknown API calls |
| `property_fetch` | companies query + buildings + sites for a customer |

### Log Entry Format

```markdown
| YYYY-MM-DD HH:MM | task_type | description | items | duration | rate | notes |
```

Example:
```markdown
| 2026-03-20 02:10 | bulk_inspection_deploy | Basman Realty 12 props × 2 | 24 | 12s | 2.0/s | 400ms delay, 0 errors |
```

## Reading the Log

At session start or when user asks about performance:

```bash
cat memory/performance-log.md
```

Look for:
- **Rate trend** per task type — is `items/s` going up?
- **Error rate** — are we getting 0 errors more consistently?
- **Time-to-first-result** — how long before the first item is created?

## Auto-Log Template

At the end of every deployment task, paste this and fill it in:

```javascript
// After task completes:
const entry = `| ${new Date().toISOString().slice(0,16).replace('T',' ')} | TASK_TYPE | DESCRIPTION | ITEM_COUNT | ${duration}s | ${rate}/s | NOTES |`;
console.log('LOG ENTRY:', entry);
// Then manually paste into memory/performance-log.md
```

## Benchmark Baselines (established 2026-03-20)

These are the starting points. Future sessions should beat these.

| Task Type | Baseline Date | Items | Duration | Rate | Notes |
|-----------|--------------|-------|----------|------|-------|
| `bulk_inspection_deploy` | 2026-03-20 | 20 | 10s | 2.0/s | Skynet, 400ms delay |
| `bulk_inspection_deploy` | 2026-03-20 | 24 | 12s | 2.0/s | Basman Realty 12 props |
| `bulk_category_ops` | 2026-03-20 | 600 | 25s | 24.0/s | 30 props, create only |
| `bulk_automation_deploy` | 2026-03-20 | 150 | 24s | 6.25/s | 30 props × 5 automations |
| `building_deploy` | 2026-03-19 | 54 | 9.5s | 5.7/s | 5 floors + 36 spaces + 13 equipment |
| `property_fetch` | 2026-03-20 | 12 props | 3s | 4.0/s | Basman Realty, buildings + sites |

## Improvement Goals

- `bulk_inspection_deploy`: get to 3+/s (reduce delay from 400ms to 200ms when error rate is 0)
- `building_deploy`: get to 8+/s (increase concurrency from 5 to 10 on insertSite)
- `property_fetch`: keep under 5s for up to 30 properties

## Session Summary Template

At end of every session that includes deployments:

```markdown
## Performance Summary — [DATE]

| Task | Items | Time | Rate | vs Baseline |
|------|-------|------|------|-------------|
| bulk_inspection_deploy | 24 | 12s | 2.0/s | = baseline |
| property_fetch | 12 props | 3s | 4.0/s | = baseline |
```
