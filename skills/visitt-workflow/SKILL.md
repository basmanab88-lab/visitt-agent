---
name: visitt-workflow
description: >
  Best practices for working with the Visitt property management system
  (app.visitt.io). Use this skill whenever the user asks to update settings,
  categories, or configurations across multiple properties in Visitt.
  Triggers on: Visitt, tenant app, property settings, request categories,
  bulk property updates, company-settings. Also use for any repetitive
  browser-based task involving the Visitt platform, even if the specific
  page or flow isn't documented here yet — the general principles apply.
---

# Visitt Property Management - Workflow Best Practices

## Core Principle: Auto-Optimize Repetitive Actions

When performing any repetitive task (clicking, navigating, filling forms, selecting items across multiple properties), follow this escalation path automatically — don't wait for the user to say "this is too slow":

1. **First 2-3 repetitions**: Do it manually via browser clicks to learn the pattern — understand the DOM structure, element selectors, and page behavior
2. **After 2-3 repetitions**: Stop and build automation (JavaScript via `javascript_tool`, batch scripts, etc.) to handle the remaining items
3. **After the task is done**: Update this skill file with the new technique, including working selectors and code snippets, so future sessions start fast from the first item

### Reusable Patterns Across Pages

Many pages in Visitt share similar UI components (dropdowns, checkboxes, tables, modals). When you discover a technique that works on one page, note the general approach here so it can be adapted for similar components on other pages.

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

**IMPORTANT:** The `_id` format MUST be `dummy_id_N` (e.g., `dummy_id_0`, `dummy_id_1`, `dummy_id_2`). Other formats like `dummy_0`, `dummy_N`, or `d0` will **silently fail** — the API returns an empty array with no error message.

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

#### 4. Create Equipment

```graphql
mutation CreateEquipment($input: EquipmentInput!) {
  createEquipment(input: $input) {
    _id
    name
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

When parsing building data, classify spaces as follows:

- **Suites / Offices / Units** → `leasable_site`
- **Lobby, Hallway, Corridor, Stairwell, Elevator Lobby** → `site` (common area)
- **Mechanical Room, Electrical Room, Server Room, Storage** → `site` (technical/utility)
- **Restroom, Kitchen, Break Room** → `site` (amenity)
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

Spaces that have parent-child relationships must be created in two phases:

1. **Phase 1 — Independent spaces**: Create all spaces directly under floors
2. **Phase 2 — Sub-spaces**: Create spaces that reference parent space IDs

---

## Excel-to-Visitt Building Deployment Flow

### Step 1: Parse Excel Implementation Sheet
Parse with Python (openpyxl). Standard tabs: Buildings, Floors, Spaces, Equipment, Tenants.

### Step 2: Classify Spaces
Automate classification based on naming conventions (see Space Classification Rules above).

### Step 3: Generate Visualization (React JSX)
Before deployment, always generate a building preview component showing floor-by-floor breakdown with color-coded spaces.

### Step 4: Deploy via Single Script
Use the optimized bulk creation pattern in a single `javascript_tool` call.

---

## Discovering New API Mutations

Use the fetch interceptor pattern to discover GraphQL mutations:

```javascript
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
    } catch(e) {}
  }
  return origFetch.apply(this, args);
};
```

---

## Multi-Select Dropdowns

### Preferred approach: "Select All" then deselect
If most items need to be selected, use "Select All" first, then deselect unwanted items. Dramatically faster than selecting one-by-one due to virtual scrolling.

### JavaScript approach for bulk operations
```javascript
const options = document.querySelectorAll('[role="option"]');
options.forEach(opt => {
  const checkbox = opt.querySelector('input[type="checkbox"]');
  // checkbox.click() to toggle
});
```

Note: Virtual scrolling means you need to scroll to render all items before JavaScript can see them.

---

## Known Issues & Gotchas

1. **dummy_id format**: MUST be `dummy_id_0`, `dummy_id_1`, etc. Silent failure otherwise.
2. **Buildings pagination**: `buildings()` query requires `limit` and `skip`. Response is nested: `data.buildings.buildings[]`.
3. **Window variables lost on navigation**: SPA navigation clears `window._variables`. Store in `localStorage` or re-query via API.
4. **Async javascript_tool returns undefined**: Store results in `window._result` and read in a separate call.
5. **Session cookies**: All API calls must include `credentials: 'include'` for cookie auth.
