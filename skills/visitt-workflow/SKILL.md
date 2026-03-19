---
name: visitt-workflow
description: "Best practices for working with the Visitt property management system (app.visitt.io). Use this skill whenever the user asks to update settings, categories, or configurations across multiple properties in Visitt. Triggers on: Visitt, tenant app, property settings, request categories, bulk property updates, company-settings. Also use for any repetitive browser-based task involving the Visitt platform, even if the specific page or flow isn't documented here yet — the general principles apply."
---

# Visitt Property Management - Workflow Best Practices

## Core Principle: Auto-Optimize Repetitive Actions

When performing any repetitive task (clicking, navigating, filling forms, selecting items across multiple properties), follow this escalation path automatically — don't wait for the user to say "this is too slow":

1. **First 2-3 repetitions**: Do it manually via browser clicks to learn the pattern — understand the DOM structure, element selectors, and page behavior
2. **After 2-3 repetitions**: Stop and build automation (JavaScript via `javascript_tool`, batch scripts, etc.) to handle the remaining items
3. **After the task is done**: Update this skill file with the new technique, including working selectors and code snippets, so future sessions start fast from the first item

The reason this matters: manual clicking through Chrome takes ~3-5 seconds per action. A JavaScript script can do hundreds of actions in seconds. The investment in writing the script pays off almost immediately.

### Reusable Patterns Across Pages

Many pages in Visitt share similar UI components (dropdowns, checkboxes, tables, modals). When you discover a technique that works on one page, note the general approach here so it can be adapted for similar components on other pages. The specific CSS selectors may differ, but the strategy (e.g., "find all checkboxes, filter by label, toggle") transfers.

## Deployment Flow: ALWAYS Visualize → Approve → Deploy

**CRITICAL**: Before ANY deployment to Visitt, you MUST:
1. Parse the data source (Excel, manual input, etc.)
2. Generate a **React JSX visualization** showing the building structure
3. Present it to the user for approval
4. **Only after explicit approval** — deploy via API

Never skip the visualization step. Never deploy without user approval.

---

## Internal GraphQL API

Visitt uses a GraphQL API at `staging.visitt.io/graphql` (production: `app.visitt.io/graphql`).

### Authentication

All API calls use session cookie authentication. When using `javascript_tool` in the browser, cookies are automatically included. For fetch calls:

```javascript
const response = await fetch('https://staging.visitt.io/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include'  // IMPORTANT: includes session cookies
  body: JSON.stringify({ query, variables })
});
```

### Key Mutations

#### 1. Create Building

```graphql
mutation CreateBuilding($input: BuildingInput!) {
  createBuilding(input: $input) {
    _id
    name
  }
}
```

Variables:
```json
{
  "input": {
    "name": "Building Name",
    "companyId": "<company_id>",
    "address": "123 Main St"
  }
}
```

#### 2. Upsert Floors (Add floors to building)

```graphql
mutation UpsertFloors($buildingId: String!, $floors: [FloorInput!]!) {
  upsertFloors(buildingId: $buildingId, floors: $floors) {
    _id
    name
    level
  }
}
```

Variables:
```json
{
  "buildingId": "<building_id>",
  "floors": [
    { "_id": "dummy_id_0", "name": "Ground Floor", "level": 0 },
    { "_id": "dummy_id_1", "name": "First Floor", "level": 1 },
    { "_id": "dummy_id_2", "name": "Second Floor", "level": 2 }
  ]
}
```

**IMPORTANT:** The `_id` format MUST be `dummy_id_N` (e.g., `dummy_id_0`, `dummy_id_1`, `dummy_id_2`). Other formats like `dummy_0`, `dummy_N`, or `d0` will **silently fail** — the API returns an empty array with no error message. This was discovered through debugging and is not documented anywhere.

#### 3. Create Space (Site)

```graphql
mutation CreateSite($input: SiteInput!) {
  createSite(input: $input) {
    _id
    name
    modelType
  }
}
```

Variables:
```json
{
  "input": {
    "name": "Suite 100",
    "buildingId": "<building_id>",
    "floorId": "<floor_id>",
    "modelType": "leasable_site",
    "companyId": "<company_id>"
  }
}
```

#### 4. Create Equipment

```graphql
mutation CreateEquipment($input: EquipmentInput!) {
  createEquipment(input: $input) {
    _id
    name
  }
}
```

Variables:
```json
{
  "input": {
    "name": "HVAC Unit 1",
    "buildingId": "<building_id>",
    "floorId": "<floor_id>",
    "siteId": "<site_id>",
    "modelType": "equipment",
    "companyId": "<company_id>"
  }
}
```

### Key Queries

#### List Buildings (Paginated)

```graphql
query Buildings($companyId: String!, $limit: Int!, $skip: Int!) {
  buildings(companyId: $companyId, limit: $limit, skip: $skip) {
    buildings {
      _id
      name
      address
    }
    total
  }
}
```

**Note:** Response is nested: `data.buildings.buildings[]`. Always use `limit` and `skip` for pagination.

#### Get Building Details (with floors and sites)

```graphql
query Building($id: String!) {
  building(id: $id) {
    _id
    name
    floors {
      _id
      name
      level
      sites {
        _id
        name
        modelType
      }
    }
  }
}
```

### Model Types (Entity Taxonomy)

| modelType | Hebrew | Description | Example |
|-----------|--------|-------------|---------|
| `site` | מרחב | Base space (non-rentable) | Lobby, Hallway, Stairwell |
| `leasable_site` | יחידה להשכרה | Rentable unit | Suite 100, Office 201 |
| `equipment` | ציוד | Equipment/asset | HVAC, Elevator, Generator |
| `floor` | קומה | Floor level | Ground Floor, Floor 1 |

### Space Classification Rules

When parsing building data (from Excel or other sources), classify spaces as follows:

- **Suites / Offices / Units** → `leasable_site`
- **Lobby, Hallway, Corridor, Stairwell, Elevator Lobby** → `site` (common area)
- **Mechanical Room, Electrical Room, Server Room, Storage** → `site` (technical/utility)
- **Restroom, Kitchen, Break Room** → `site` (amenity)
- **Parking spaces** → `site` with appropriate naming
- **HVAC, Elevator, Generator, Fire Panel** → `equipment`

---

## Optimized Bulk Creation Pattern

For deploying buildings with many entities, use this single-script pattern with batched concurrency:

```javascript
const CONCURRENCY = 5;      // max parallel requests (safe for staging; use 3 for production)
const DELAY_MS = 400;        // ms between batches (safe for staging; use 800 for production)

const gql = async (query, variables) => {
  const r = await fetch('https://staging.visitt.io/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables })
  });
  return r.json();
};

const runBatched = async (taskFns) => {
  const results = [];
  for (let i = 0; i < taskFns.length; i += CONCURRENCY) {
    const chunk = taskFns.slice(i, i + CONCURRENCY);
    const res = await Promise.all(chunk.map(fn => fn()));
    results.push(...res);
    if (i + CONCURRENCY < taskFns.length) await new Promise(r => setTimeout(r, DELAY_MS));
  }
  return results;
};
```

### Two-Phase Space Creation

Spaces that have parent-child relationships (e.g., a suite containing rooms) must be created in two phases:

1. **Phase 1 — Independent spaces**: Create all spaces that don't depend on other spaces (directly under floors)
2. **Phase 2 — Sub-spaces**: Create spaces that reference parent space IDs (need Phase 1 results)

```javascript
// Phase 1: Create independent spaces (suites, common areas)
const phase1Tasks = independentSpaces.map(space => () => gql(CREATE_SITE, { input: space }));
const phase1Results = await runBatched(phase1Tasks);

// Build parent ID map from Phase 1 results
const parentMap = {};
phase1Results.forEach((r, i) => {
  parentMap[independentSpaces[i].name] = r.data.createSite._id;
});

// Phase 2: Create sub-spaces with parent references
const phase2Tasks = subSpaces.map(space => () => gql(CREATE_SITE, {
  input: { ...space, parentSiteId: parentMap[space.parentName] }
}));
const phase2Results = await runBatched(phase2Tasks);
```

---

## Excel-to-Visitt Building Deployment Flow

### Step 1: Parse Excel Implementation Sheet

Visitt uses a standard Excel template ("Implementation Sheet") with these tabs:

- **Buildings** — building name, address, company
- **Floors** — floor names and levels per building
- **Spaces** — all spaces with floor assignment and type
- **Equipment** — equipment with location assignment
- **Tenants** — tenant info and unit assignment

Parse with Python:

```python
import openpyxl

wb = openpyxl.load_workbook('implementation_sheet.xlsx', data_only=True)

# Read Buildings tab
buildings_ws = wb['Buildings']
buildings = []
for row in buildings_ws.iter_rows(min_row=2, values_only=True):
    if row[0]:  # has name
        buildings.append({'name': row[0], 'address': row[1]})

# Read Floors tab
floors_ws = wb['Floors']
floors = []
for row in floors_ws.iter_rows(min_row=2, values_only=True):
    if row[0]:
        floors.append({'name': row[0], 'level': row[1], 'building': row[2]})

# Read Spaces tab — classify by type
spaces_ws = wb['Spaces']
spaces = []
for row in spaces_ws.iter_rows(min_row=2, values_only=True):
    if row[0]:
        space_type = classify_space(row[0], row[2])  # name, type column
        spaces.append({
            'name': row[0],
            'floor': row[1],
            'modelType': space_type,
            'building': row[3]
        })
```

### Step 2: Classify Spaces

```python
def classify_space(name, type_hint=None):
    name_lower = name.lower()
    if type_hint and 'leasable' in type_hint.lower():
        return 'leasable_site'
    if any(kw in name_lower for kw in ['suite', 'office', 'unit']):
        return 'leasable_site'
    if any(kw in name_lower for kw in ['lobby', 'hallway', 'corridor', 'stairwell',
                                         'restroom', 'kitchen', 'break room', 'parking']):
        return 'site'
    if any(kw in name_lower for kw in ['mechanical', 'electrical', 'server', 'storage',
                                         'telecom', 'janitorial']):
        return 'site'  # technical room
    return 'site'  # default to non-leasable
```

### Step 3: Generate Visualization (React JSX)

Before deployment, always generate a building preview component:

```jsx
// React component showing:
// - Building name and address
// - Floor-by-floor breakdown
// - Color-coded spaces (leasable=green, common=blue, technical=gray)
// - Equipment list
// - Tenant directory (if available)
// - Total entity count
```

### Step 4: Deploy via Single Script

Use the optimized bulk creation pattern (above) in a single `javascript_tool` call:

1. Create building → get buildingId
2. Create floors (upsertFloors) → get floorId map
3. Phase 1: Create independent spaces → get parentId map
4. Phase 2: Create sub-spaces (if any)
5. Create equipment (if any)
6. Return summary with counts and timing

---

## Discovering New API Mutations

When encountering a new page or feature in Visitt, use the fetch interceptor pattern to discover the GraphQL mutations:

```javascript
// Paste into console before performing the action in the UI
const origFetch = window.fetch;
window._captured = [];
window.fetch = function(...args) {
  const [url, opts] = args;
  if (url.includes('graphql') && opts?.body) {
    try {
      const parsed = JSON.parse(opts.body);
      window._captured.push({
        operationName: parsed.operationName,
        query: parsed.query?.substring(0, 200),
        variables: parsed.variables
      });
      console.log('📡 GQL:', parsed.operationName, parsed.variables);
    } catch(e) {}
  }
  return origFetch.apply(this, args);
};
console.log('✅ Interceptor active — perform your action now');
```

Then perform the action in the UI and check `window._captured` for the mutation structure.

---

## Performance Benchmarks

| Building | Floors | Spaces | Equipment | Total Entities | Time | Method |
|----------|--------|--------|-----------|----------------|------|--------|
| מגדל הכרמל (test) | 10 | 80 | 5 | 95 | ~12s | Batched, concurrency 3, 800ms delay |
| 1300 West Higgins (real) | 5 | 31 | 1 | 37 | **5.3s** | Single script, concurrency 5, 400ms delay |

### Optimization Tips

- **Single script**: Deploy everything in one `javascript_tool` call (avoids overhead of multiple tool calls)
- **Concurrency 5**: Safe for staging. Use 3 for production to avoid rate limits
- **Delay 400ms**: Safe for staging between batches. Use 800ms for production
- **Two-phase creation**: Only needed when spaces have parent-child relationships

---

## Multi-Select Dropdowns (e.g., Request Categories)

When selecting multiple categories from a dropdown that has virtual scrolling (only renders visible items):

### Preferred approach: "Select All" then deselect

If most items need to be selected, use "Select All" first, then deselect the few items that should NOT be checked. This is dramatically faster than selecting items one by one, which requires multiple scroll passes due to virtual rendering.

The dropdown only renders ~20 items at a time. Selecting 39 out of 41 items one-by-one requires 3-4 scroll+select passes per property. Using "Select All" and deselecting 2 items takes one pass.

### When selecting specific items (minority selection)

If only a few items need to be selected from a large list, use the **Search box** in the dropdown to find each item quickly instead of scrolling.

### JavaScript approach for bulk operations

When applying the same configuration across many properties, use JavaScript to interact with checkboxes:

```javascript
// Get all options and their states
const options = document.querySelectorAll('[role="option"]');
options.forEach(opt => {
  const label = opt.textContent.trim();
  const checkbox = opt.querySelector('input[type="checkbox"]');
  // checkbox.click() to toggle
});
```

Note: Due to virtual scrolling, you need to scroll the list to render all items before JavaScript can see them. Plan for multiple scroll passes or use "Select All" button directly.

## Copying Settings Between Properties

When replicating settings from one property to others:

1. First, extract the full list of selected items from the source property using JavaScript
2. For each target property, use "Select All" then deselect unwanted items (faster), OR use JavaScript with scroll passes
3. Always click "Save changes" after each property
4. Verify the count matches (e.g., "Selected (39)")

## Property Navigation

Properties are selected via the dropdown in the top-right corner of the Admin page. Each property has its own Tenant App > Requests configuration at:
`app.visitt.io/company-settings?activeSideMenuItem=requests#portal`

---

## Learned Techniques Log

This section captures specific automation techniques discovered during real tasks. Each entry includes the context, the approach, and working code.

### Google Calendar Batch Delete (discovered 2026-03-16)
When deleting many calendar events while preserving specific days:
- Use `[data-eventid]` selector to find all events
- Use `[data-datekey]` headers to identify column boundaries per day
- Click each event to open popup, then click the delete button (`[aria-label="Delete event"]`)
- Run as async loop with ~500ms delays between deletions
- 65 events deleted in ~30 seconds vs. manual right-click which would take 10+ minutes

### Building Deployment via API (discovered 2026-03-17)
Full building deployment (building + floors + spaces + equipment) can be done entirely via GraphQL API without any browser UI interaction. Key discovery: the `upsertFloors` mutation requires `dummy_id_N` format for new floor IDs.

### Excel Implementation Sheet Parsing (discovered 2026-03-17)
Standard Visitt Excel template can be parsed with openpyxl. Space classification (leasable vs common vs technical) can be automated based on naming conventions. Full flow: Excel → Python parse → React visualization → user approval → API deployment.

---

## Known Issues & Gotchas

1. **dummy_id format**: MUST be `dummy_id_0`, `dummy_id_1`, etc. Silent failure otherwise.
2. **Buildings pagination**: `buildings()` query requires `limit` and `skip`. Response is nested: `data.buildings.buildings[]`.
3. **Window variables lost on navigation**: SPA navigation clears `window._variables`. Store important IDs in `localStorage` or re-query via API.
4. **Async javascript_tool returns undefined**: When using `(async () => { ... })()`, store results in `window._result` and read in a separate call.
5. **Content filter blocking IDs**: Some base64-looking IDs get blocked. Return confirmation strings instead of raw IDs.
6. **Session cookies**: All API calls must include `credentials: 'include'` for cookie auth.
