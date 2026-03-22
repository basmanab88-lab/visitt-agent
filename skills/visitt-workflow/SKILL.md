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

---

## ⚡ Platform Exploration Playbook — Fast Track (2026-03-22)

Use this when asked to "explore the platform", "find all settings", "discover mutations", or "map out what can be done at scale". This is the fastest verified path.

### Step 1: Explore a settings page (2 actions)
```
navigate(url) → get_page_text()
```
`get_page_text()` in ONE call beats scroll+screenshot×8. Use screenshots only when you need visual toggle states (ON/OFF).

### Step 2: Discover what mutation a toggle fires
**Do NOT try**: replacing `window.fetch` after page load (Apollo captured the original `fetch` at init — your wrapper is never called).
**Do NOT try**: probing mutation names directly (server-side whitelisting returns "Invalid query" for all guesses).

**DO THIS directly** — Before/After Features Diff (3 API calls, ~5 seconds):
```javascript
const gql = (q, v) => fetch('/graphql', {
  method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'include',
  body: JSON.stringify({ query: q, variables: v })
}).then(r => r.json());

// 1. Snapshot before
const before = await gql('{ company(companyId: "ID") { features } }');
const beforeSet = new Set(before.data.company.features);

// 2. Click the toggle via React fiber (not coordinate click)
const btns = Array.from(document.querySelectorAll('button')).filter(btn => {
  const r = btn.getBoundingClientRect();
  return r.width > 30 && r.width < 65 && r.height > 15 && r.height < 40 && r.y > 100 && r.y < 1500;
});
const key = Object.keys(btns[N]).find(k => k.startsWith('__reactFiber'));
let fiber = btns[N][key];
while (fiber) {
  if (fiber.memoizedProps?.onClick) { fiber.memoizedProps.onClick({nativeEvent:{preventDefault:()=>{}},preventDefault:()=>{},stopPropagation:()=>{}}); break; }
  fiber = fiber.return;
}
await new Promise(r => setTimeout(r, 1200));

// 3. Snapshot after — diff = feature key
const after = await gql('{ company(companyId: "ID") { features } }');
const added = after.data.company.features.filter(f => !beforeSet.has(f));
const removed = [...beforeSet].filter(f => !after.data.company.features.includes(f));
console.log('added:', added, 'removed:', removed); // added[0] = feature name

// 4. Revert
if (added.length) await gql(`mutation updateCompanyFeature($companyId: String!, $feature: CompanyFeature!, $value: Boolean!) { updateCompanyFeature(companyId: $companyId, feature: $feature, value: $value) { _id } }`,
  { companyId: 'ID', feature: added[0], value: false });
```

### Step 3: Bulk-apply a feature to all properties of a customer (1 query + N mutations)
See "Bulk Operations — Ready-to-Use Code Snippets" section below. Everything is ready-to-paste.

### Known feature keys already mapped
All toggles use `updateCompanyFeature(companyId, feature, value)`. See full table in "Settings & Feature Flags Map" section. The complete list covers 28+ features across Features tab, Experiments tab, Work orders settings, and Inspections settings.

### Still unknown (as of 2026-03-22)
- "Show building external Key in work order form" toggle — NOT a feature flag (uses different mutation, name unknown)
- "Require work order acceptance" toggle — NOT a feature flag (uses different mutation, name unknown)
- "Require logging of work hours to complete an inspection" toggle — NOT confirmed (may be a feature flag)

---

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

### Visual Builder Pattern — CORRECT WORKFLOW (discovered 2026-03-20)

**What it is**: A React JSX file Claude generates so the user can visually review data before deployment. It is a DISPLAY tool, NOT an input mechanism.

**Correct flow (the only one that works)**:
1. Claude populates PLAN/DATA arrays directly in the JSX file
2. Cowork renders the JSX — user sees the visual preview
3. User says approval word ("פרוס", "יאללה", etc.) in chat
4. Claude reads the data from the JSX file and deploys via API

**What NEVER works** (tried and failed):
- Fetch from `localhost:7778` — blocked by Cowork sandbox
- `window.require('fs')` (Electron) — not available in renderer
- `localStorage` — different context from Chrome browser
- HTTP server in VM to receive data — blocked by sandbox

**Key principle**: The JSX is Claude's canvas for showing data. The chat is the approval channel. They are separate — don't try to connect them programmatically.

### Stacking Plan — Show Tree View BEFORE Deployment (discovered 2026-03-20)

Before deploying buildings/floors/spaces, ALWAYS show a **hierarchical tree view** (not a 2D grid). The tree must be:
- Collapsible/expandable per node (click to open/close)
- Icons: 🏙 Property → 🏢 Building → 🪜 Floor → 🟩 Leasable / 🔷 Common / ⚙️ Equipment
- Space counts at each level
- "פרוס" button at bottom

The 2D grid view (stacking-plan.jsx) was shown AFTER deployment — the user corrected this. Tree view is the right pre-deployment UX.

**Template**: Use `stacking-tree.jsx` pattern — `PropertyNode > BuildingNode > FloorNode > SpaceRow`, all collapsible via `useState(true)`.

### Always Verify companyIds Against API Before JSX (discovered 2026-03-20)

When creating a JSX file with multiple properties, **never invent or copy-paste companyIds**. Always:
1. Query `companies(customerId: [...], limit: 40, skip: 0) { companies { _id name } }` first
2. Map names to IDs programmatically
3. Paste verified IDs into JSX

In this session, Generic Property 1 was given the wrong companyId (copied from Property 2 by mistake) — the API deployed to the wrong property. Verification takes 5 seconds and prevents silent misdeploys.

### Inspections (Assignments) API — verified 2026-03-20

Inspections are called "assignments" internally. The UI at `/assignments#manageVisits` shows all inspection templates.

**Key discoveries:**
- Mutation: `createAssignment($input: CreateAssignmentInput!)`
- Temp IDs must be generated per inspection + per task: `_ASSIGNMENT_ITEM_TEMP_ID_${Date.now()}${random}`
- `interval` values: `"day"`, `"week"`, `"month"`, `"year"` (only `"week"` confirmed; others inferred)
- `daysInWeek` uses 0=Sun, 1=Mon, ..., 6=Sat; empty array for monthly/annual
- `completionEndOfUnit` matches the interval unit (e.g., `"week"` for weekly)
- `items` is an array of space groups — each group has `type: "sites_tasks"`, `siteIds`, and `subItems` (tasks)
- Task types: `"text"`, `"numeric"`, `"checkbox"`, `"section_header"`, `"multiple_choice"`, `"signature"`, `"qr_scan"`
- `siteIds` at top level = union of all siteIds from all items groups
- Created 20 inspections in ~10s (sequential with 400ms delay) — zero errors

**Inspection creation wizard UI:**
- Step 1: Name + frequency (react-select dropdown — use computer click to open, XPath to select option)
- Step 2: Spaces (multi-select with search) + tasks (textarea — use native setter hack)
- Step 3: Order (drag-to-sort spaces)
- URL: `/assignment/create?companyId=COMPANY_ID&customerId=SLUG`
- UI navigation: sidebar "Inspections" link → `/assignments`

**React-select hack (open + select):**
```javascript
// 1. Use computer tool (left_click on ref_71) to OPEN the dropdown
// 2. Then use JS XPath to click the option:
const el = document.evaluate('//div[text()="Weekly"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
el.dispatchEvent(new MouseEvent('mousedown', {bubbles:true}));
el.click();
```

**Task name textarea hack (react state won't update from type tool):**
```javascript
const ta = document.querySelector('textarea[placeholder="Enter task name"]');
const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
setter.call(ta, 'My Task Name');
ta.dispatchEvent(new Event('input', {bubbles:true}));
ta.dispatchEvent(new Event('change', {bubbles:true}));
```

**localStorage interceptor for mutation capture (persists across SPA navigation):**
```javascript
localStorage.removeItem('_gql_captured');
const orig = window.fetch;
window.fetch = function(...args) {
  const [url, opts] = args;
  if (url?.includes('graphql') && opts?.body) {
    try {
      const b = JSON.parse(opts.body);
      if (b.operationName) {
        const ex = JSON.parse(localStorage.getItem('_gql_captured') || '[]');
        ex.push({ op: b.operationName, vars: b.variables, query: b.query });
        localStorage.setItem('_gql_captured', JSON.stringify(ex));
      }
    } catch(e) {}
  }
  return orig.apply(this, args);
};
// After page navigates and redirects, read: JSON.parse(localStorage.getItem('_gql_captured'))
```

### Tenants & Contacts Navigation — verified 2026-03-20

**URL patterns:**
- Tenants list: `/tenants` (tab `#tenants`)
- Global Contacts: `/tenants#contacts`
- Tenant detail: `/tenant/<tenantId>?activeSideMenuItem=<tab>`
  - Tabs: `overview`, `contacts`, `locations` (Spaces tab), `documents`, `billing`
- My Property / Building: `/building/current` → redirects to `/building/<buildingId>`
  - Sub-tabs: `#overview`, `#floors`, `#spaces`, `#equipment`

**Tenant Spaces (Locations) flow:**
- "Spaces" tab in tenant detail uses URL param `activeSideMenuItem=locations` (NOT `spaces`)
- Two sub-sections: **Leased spaces** (exclusive use) and **Authorized spaces** (work order rights)
- Adding spaces: click "Leased spaces" or "Authorized spaces" button → opens Ariakit modal with SelectCombobox → pick space → Submit
- Mutation is `setTenant` (replaces entire tenant) — always include existing contacts + locations when updating

**Ariakit SelectCombobox component (different from react-select):**
```javascript
// Selector: button.SelectComboboxValue (NOT .Select__control)
const comboBtn = document.querySelector('.SelectComboboxValue');
comboBtn.click();
// Options use role="option" or class="SelectItem" / "ComboboxItem"
const opts = document.querySelectorAll('[role="option"], [class*="SelectItem"], [class*="ComboboxItem"]');
opts[0].click(); // pick first option
```

**My Property building page (`/building/<buildingId>`):**
- Sidebar "My property" link → `/building/current` → auto-redirects to current building
- Building queries: `buildingStructure({buildingId})` + `fetchBuildingFloors` + `sitesSearch`
- Space creation button: "Create space" → modal with Name, Type, Location → fires `insertSite`
- Equipment creation button: "Create equipment" → modal with Name, Type, Location, Notes, "Show advance details" → fires `insertSite` with `modelType: "equipment"`
- Both are the SAME mutation (`insertSite`) with different `modelType`
- `GetCompanySiteTypes({companyId})` fetches custom space/equipment type categories

### Bulk Category Operations (discovered 2026-03-20)
Full flow for replacing ALL categories across N properties:
1. Query all categories: `allCategories(companyId: ID) { _id name }`
2. Batch unassign: `removeCategoryFromCompany(categoryId, companyId)` per property × category (concurrency 6, delay 400ms)
3. Batch delete: `deleteCategory(categoryId)` for each old category
4. Batch create: `createCategory(input: { name, companyId, customerId })` — NO color field
5. 30 properties × 20 categories = 600 creates → runs in ~25s

Timing verified: 240 unassigns + 8 deletes + 600 creates = ~75 seconds total on staging.

---

## Known Issues & Gotchas

1. **dummy_id format**: MUST be `dummy_id_0`, `dummy_id_1`, etc. Silent failure otherwise.
2. **Buildings pagination**: `buildings()` query requires `limit` and `skip`. Response is nested: `data.buildings.buildings[]`.
3. **Window variables lost on navigation**: SPA navigation clears `window._variables`. Store important IDs in `localStorage` or re-query via API.
4. **Async javascript_tool returns undefined**: When using `(async () => { ... })()`, store results in `window._result` and read in a separate call.
5. **Content filter blocking IDs**: Some base64-looking IDs get blocked. Return confirmation strings instead of raw IDs.
6. **companies() nested field**: Return type is `PaginatedCompanies`. The data field is `companies` (same name). `limit` and `skip` are REQUIRED. `total` field does NOT exist.
7. **insertSite does NOT assign to floor**: Must call `changeSitesLocation` after `insertSite` to place spaces on floors. `buildingId` param is required in `changeSitesLocation` — omitting causes silent failure.
8. **createCategory has no color field**: The mutation only accepts `name`, `companyId`, `customerId`. Adding color causes a validation error.
6. **Session cookies**: All API calls must include `credentials: 'include'` for cookie auth.
8. **read_network_requests misses pre-call requests**: The tool only captures requests made AFTER first call. If creation fires before tracking starts, requests are lost. Use `localStorage` fetch interceptor instead — it survives SPA navigation.
9. **Inspections URL is /assignments not /inspections**: Navigation to `/inspections` or `/assignment` returns 404. Correct path: `/assignments#manageVisits` (all templates) or `/assignments#openVisits` (active).
10. **`type` tool doesn't work on task textarea**: Use native setter + dispatch events pattern instead.
11. **Tenant "Spaces" tab uses `activeSideMenuItem=locations`**: Despite the UI button saying "Spaces", the internal URL param is `locations`. Navigating to `?activeSideMenuItem=spaces` shows a blank tab.
12. **`setTenant` replaces entire tenant data**: When updating locations OR contacts, you must include the full existing set of both in the mutation. Sending only the new item will delete everything else.
13. **My Property URL is `/building/current` not `/my-property`**: `/my-property` returns 404. The sidebar link points to `/building/current` which redirects to `/building/<buildingId>`.
14. **createVisitor requires `arrivalTime` field**: The mutation will error with "Field arrivalTime of required type CreateVisitorArrivalTimeInput! was not provided" if you omit it. Always pass `arrivalTime: { isAllDay: true }` for all-day visits.
15. **Amenities feature can be disabled per property**: The Bookings tab shows a banner "Property feature Amenities is disabled Edit" if the property hasn't enabled it. To find a property with Amenities active, pick one from the dropdown selector.
16. **bookAmenity / deleteAmenityBooking return "Invalid query"**: These mutations exist in the schema but return `GRAPHQL_VALIDATION_FAILED: Invalid query` at the field level. They may require special auth or a specific query document format. Capture via GQL interceptor from the real UI flow instead of probing directly.
17. **Visitor contact selector shows "No results" without contacts**: The "Existing contact" mode host dropdown only lists contacts (people), not tenants. If a property has tenants but no contacts, the dropdown is empty. Switch to "Not a contact" mode which uses the tenant list.

---

## Page Map: Visitors (discovered 2026-03-21)

**URLs:**
- List: `/visitors` — defaults to `#visitor-list`
- Watchlist: `/visitor-watchlist#watchlist`
- Create: `/visitor/create?companyId=COMPANY_ID`

**Bookings list table columns:** Visitor, Expected At, Tenant, Host, Entry Status

**Buttons/actions on list page:** "+ Add visitor", "Visitor Watchlist", "Export", "Columns"

**Filters:** Visit schedule (All expected), Building, Tenant

**Create form — two modes (Host details section):**

Mode 1: **Existing contact** (radio `contactIsHost = true`)
- "Select contact" dropdown → searches contacts for the property
- Visitor: First Name*, Last Name*, Email (optional)
- Access: Single-day / Multi-day, From* date, All day toggle
- Additional info (optional)

Mode 2: **Not a contact** (radio `contactIsHost = false`)
- "Select tenant" dropdown → lists all tenants for the property
- Name* (host full name), Email (optional)
- Visitor: First Name*, Last Name*, Email (optional)
- Access: Single-day / Multi-day, From* date, All day toggle
- Additional info (optional)

**Key mutation — createVisitor:**
```graphql
mutation createVisitor($input: CreateVisitorInput!) {
  createVisitor(input: $input) {
    _id
    email
    comment
    startDate
    endDate
  }
}
```
Variables for "Not a contact" mode:
```json
{
  "input": {
    "companyId": "PROPERTY_ID",
    "tenantId": "TENANT_ID",
    "firstName": "Visitor First",
    "lastName": "Visitor Last",
    "startDate": "2026-03-21",
    "arrivalTime": { "isAllDay": true },
    "comment": "optional note"
  }
}
```
Variables for "Existing contact" mode (use `contactId` instead of `tenantId`/`firstName`/`lastName`):
```json
{
  "input": {
    "companyId": "PROPERTY_ID",
    "contactId": "CONTACT_ID",
    "startDate": "2026-03-21",
    "arrivalTime": { "isAllDay": true }
  }
}
```
For multi-day: add `"endDate": "2026-03-25"`.

**Note**: `createVisitor` returns `Unauthorized` for properties where your user doesn't have visitor management permission. Use a property where the logged-in user is a manager/admin.

**Delete/cancel visitors**: Mutation names not yet confirmed. Capture via GQL interceptor from visitor list actions.

**Finding a property with tenants (for test):**
- Westside Commons: `companyId = 69be7bbe633d48b012df1d7b` → 3 tenants (Creative Collective Inc., West End Technologies, Westside Fitness Club)
- מגדלי ארלוזרוב: `companyId = 5JQSqoQ3vKxNtg3Ko` → 9 tenants

---

## Page Map: Amenities (discovered 2026-03-21)

**URLs:**
- List (Bookings tab): `/amenities#amenity-bookings`
- List (Manage tab): `/amenities#manage-amenities`
- Create amenity: `/amenity/create`
- Edit amenity: `/amenity/<amenityId>/edit` (inferred)

**Tab 1 — Bookings:**
- Table columns: Amenity, Status, Booking Time, Created Date, Contact
- View toggle: Table | Calendar
- Filters: Amenity (dropdown), Booking status (dropdown), Contact (dropdown)
- Button: "+ Book amenity" → navigates to booking create form

**Tab 2 — Manage amenities:**
- Table columns: Name, Building, Description, Assigned Users
- Button: "+ Add amenity" → `/amenity/create`

**Create amenity form fields (Settings tab):**
- Amenity Gallery (up to 15 images)
- Name* (required)
- Building* (required) — dropdown
- Maximum occupancy (number)
- Description* (required)
- Assigned user — dropdown
- Time slot duration (default: 30 min)
- Cost (USD per booking)
- Schedule: per day of week (Sun–Sat), each with "Add time" ranges
- Availability rules: Booking window (min/max advance in days), Time buffer (before/after, default 15 min), Max duration per booking
- Link amenities with shared space

**Create amenity form — second tab: Booking questions** (questions shown to users when booking)

**Key GQL queries on amenity pages:**
```graphql
# List amenities (Manage tab)
query amenities($companyId: String!, $skip: Int!, $limit: Int!) {
  amenities(companyId: $companyId, skip: $skip, limit: $limit) {
    amenities { ...AmenityItem  createdAt  locationName }
    hasNext
    totalCount
  }
}
# AmenityItem fields: _id, name, buildingId, locationName, defaultAssignedUsers,
# images, image, description, roomEmailAddress, maxPeopleNumber,
# bookingTimes { dayOfWeek, timeRanges { start, end, isBillable } },
# timeSlotDuration, timeSlotPrice, bookingInAdvanceRule { minInAdvance { enabled, value, unit } }

# Booking form queries
query getAmenityDetails(...)     # get amenity config
query getAmenityBookingSlots(...)  # available time slots
query getAmenityBookingCharges(...)  # pricing
query contacts($input: ContactSearchInput!) { ... }  # contact search for host
```

**Key mutations:**
```graphql
# Create or update amenity (same mutation — presence of _id = update)
mutation setAmenity($input: AmenityInput!) {
  setAmenity(input: $input) { ...AmenityItem }
}

# Delete/archive an amenity
mutation archiveAmenity($amenityId: String!) {
  archiveAmenity(amenityId: $amenityId)
}

# Update a booking (e.g., status, time)
mutation updateAmenityBooking($amenityBookingId: String!, $input: UpdateAmenityBookingInput!) {
  updateAmenityBooking(amenityBookingId: $amenityBookingId, input: $input) { _id }
}

# These exist in schema but return "Invalid query" when called manually:
# bookAmenity(...)          — create booking
# deleteAmenityBooking(...) — delete booking
# cancelAmenityBooking(...) — cancel booking
# → Capture these via GQL interceptor from the actual "+ Book amenity" UI flow
```

---

## Page Map: Documents (discovered 2026-03-21)

**URL:** `/documents`

**Layout:**
- Search bar: Name, Description (free text)
- Buttons: "+ Add document", "Import documents"
- Filters: Linked to (dropdown), Status (dropdown), Expiration Date (date picker)
- Table columns: (checkbox), Name, Tags, Start Date, End Date, Linked To
- Bulk toolbar: Columns, Export, Delete
- Right sidebar: Tags panel — lists all tags, "Add" button to create a tag

**Key operations (mutations not yet captured — capture via GQL interceptor):**
- Create document: "+ Add document" button → form (fields TBD)
- Import documents: bulk CSV/file import
- Delete documents: bulk select → Delete button
- Tags: "Add tag" → creates a tag that can be attached to documents

**TODO for next session**: Navigate to Documents with GQL interceptor active, click "+ Add document", fill form, submit → capture `createDocument` (or equivalent) mutation + its full input shape.

---

## Amenity Booking UI Patterns (2026-03-21)

### Book Amenity Form (`/amenity/book`)
- Opened as SPA modal overlay (history pushes `/amenity/book`, back-button closes)
- **Contact field**: standard dropdown, coordinate click works fine
- **Amenity field**: standard dropdown showing all enabled amenities for the property
  - "Property feature Amenities is disabled" banner = wrong property. Switch to one with amenities (e.g., "1050 West Pender BGO Demo")
- **Date input**: hidden text input (`name="date"`, `value="Today"`). Date picker uses native `Date` objects (NOT moment).
  - To change date via fiber: level 6 onChange takes `new Date('YYYY-MM-DD')` but display shows "Invalid date" — cosmetic bug, form still functions
  - Today's slots show ALL slots including past ones — form validates past-slot on submit
- **Slot selection**: `BookingRangeButton` components — range selector (click start, click end)
  - **Fiber onClick required** — coordinate clicks and `.click()` do NOT update React state
  - Pattern: `fiber.memoizedProps.onClick({preventDefault:()=>{}, nativeEvent:{preventDefault:()=>{}}, ...fakeEvent})`
  - Clicking multiple slots selects a RANGE (e.g., click 18:00 then click 20:00 → 18:00-21:00 selected)
  - `isSelected` class on button = slot is selected in React state
  - Comment field appears ONLY when a slot is selected (use as confirmation)
- **Cancel an existing booking**: Click row → opens issue detail panel → find "Cancel" button in booking card → confirmation dialog (requires text reason) → Submit → fires `updateAmenityBookingStatus`
- **Approve/Reject pending booking**: Approve/Reject buttons appear in-row for Pending bookings

### Finding Booking IDs
- `amenityBookingId` (for updateAmenityBookingStatus) = `amenityBooking._id` on the issue object
- NOT the same as the issue `_id`

---

## Documents UI Patterns - Confirmed (2026-03-21)

### Tags Sidebar
- Tags panel is a RIGHT sidebar in `/documents` — buttons can be off-screen (x > 1657 in 1920px viewport)
- "Add" button next to Tags opens an inline text input → type tag name → press Enter to create
- Delete tag: kebab/icon next to tag → confirms `deleteDocumentTag` mutation
- Tag `_id` = `documentTagId` in the mutation (not `tagId`, not `id`)

### Document Deletion
- Bulk delete: checkbox rows → "Delete" button in toolbar → fires `deleteDocuments` with array of IDs
- No individual row delete button — must use bulk toolbar

---

## Visitor UI Patterns - Confirmed (2026-03-21)

### Cancel Permission
- Open visitor row → "Visitor page" side panel
- "Cancel permission" button → confirmation dialog ("Are you sure?") → Confirm
- Fires `deactivateVisitor` mutation

### Delete Visitor
- UI trigger NOT found in visitor list or detail panel (may be admin-only or different route)
- `deleteVisitor` mutation confirmed to exist on server (returns "Invalid query" = whitelisted)

---

## Tenant-Space Relationship UI (verified 2026-03-21)

### URL Patterns

| Page | Correct URL | Notes |
|------|------------|-------|
| My Property (building spaces view) | `/building/:buildingId#spaces` | NOT `/my-property/building/:buildingId` (404) |
| Tenants list for a property | `/tenants#tenants` (after property context set) | Or navigate via sidebar |
| Tenant profile → Spaces tab | `/tenant/:tenantId?activeSideMenuItem=locations` | Shows leased + authorized spaces |

### Tenant Profile → Spaces tab
- Left nav shows: Overview, Contacts, **Spaces**, Documents, Billing, Super admin data
- "Spaces" tab (`activeSideMenuItem=locations`) has two sections:
  - **Leased spaces** — spaces with `isLeased: true` (exclusive occupancy, labeled "Leased space")
  - **Authorized spaces** — spaces with `isLeased: false` (WO creation rights, labeled "Authorized space")
- Breadcrumb path per space: `Building Name > Floor Name > Suite Name`
- "+ Leased spaces" button to add from UI; same result as `setTenant` mutation with `isLeased: true`

### Tenants List table columns
- Name, Leased Spaces (comma-separated suite names), Status, Contacts, External ID, Signed Up To Visitt+
- "Status: Current" filter is applied by default
- Leased spaces column truncates with "..." after 2-3 entries (full list only in tenant detail)

### Leasable vs Regular Spaces in My Property
- My Property → Spaces tab shows ALL spaces (leasable + regular)
- Filter by Type to see only leasable spaces
- Space creation dialog has "Leasable space" toggle → sets `modelType: "leasable_site"`
- Spaces named "Suite" or "Residential Unit" are auto-classified as leasable by the system

---

## Settings & Feature Flags Map (discovered 2026-03-22)

There are **two distinct settings levels** in Visitt. Each has a different URL pattern and different purpose.

---

### Level 1: Customer-Level Settings
**URL**: `/customer/[customer_slug]#settings` (e.g., `/customer/apex_properties#settings`)
**How to reach**: Customers (Admin) → search customer → click arrow → Settings tab

This is the **account-wide** configuration. Sections:

| Section | What's there |
|---|---|
| **General** | Default Timezone, Country, Language, Terminology, Date format (MDY vs DMY), Time format (AM:PM vs 24h), First work day (Sun/Mon), Currency ($, ₪, €, C$), Measurement system (Imperial/Metric) |
| **Features & Notifications** | Toggles: SMS notifications, Email notifications, Mobile Calendar, Issue Set External Reporter, Templates library, SLA |
| **Live Translate** | Toggle: "Enable Live Translate on work orders" — AI translates work order chat messages in real time based on user language |
| **SSO** | "Enable SSO" button — allows login via Okta, Azure, Google |
| **Integrations** | Set SFTP Integration, Set MRI Integration, Set up Yardi Integration |
| **Import** | Import One (property data from external systems), Import inspections (Excel by Property Name column), Import users (Excel bulk) |
| **Danger zone** | Status dropdown (New/Active/etc.) — affects demo data reset behavior; Move a property to a different customer |

---

### Level 2: Property-Level Super-Admin (Feature Flags)
**URL**: `/company/[property_id]#settings`
**How to reach**: Customers (Admin) → customer → Properties tab → click property name → **Super-Admin tab**

This is where **Feature Flags** live. The page has **two sections**:

#### Features (Main Feature Flags)

These control which major product areas are active for this property. Parent flag must be ON for children to work.

| Feature Flag | Sub-flags | Status (Apex Tower) | What it does |
|---|---|---|---|
| **Tenants** | | ✅ ON | Enables the Tenants module — tenant directory, contacts, leases |
| → Amenities | | ❌ OFF | Enables Amenities booking for tenants in the tenant app |
| → Broadcasts | | ✅ ON | Enables sending broadcast messages to tenants |
| → Packages | | ❌ OFF | Enables package tracking module |
| → Visitor management | | ❌ OFF | Enables visitor pre-registration via tenant app |
| **Visitt+** | | ❌ OFF | Enables the white-label tenant app (Visitt+). Must be ON to unlock sub-flags |
| → Visitt+ custom branding | | ❌ OFF | Custom colors/logo for the Visitt+ app |
| → Visitt+ custom pages | | ❌ OFF | Custom content pages inside Visitt+ |
| **Vendors** | | ❌ OFF | Enables vendor management module |
| **Documents** | | ✅ ON | Enables document management (COI tracking, uploads, etc.) |
| → Tenant COI | | ❌ OFF | Certificate of Insurance tracking for tenants |
| → Vendor COI | | ❌ OFF | Certificate of Insurance tracking for vendors |
| → AI COI Validation | | ❌ OFF | AI automatically validates COI documents |
| → AI Compliance Check | | ❌ OFF | AI checks compliance rules on COI docs |
| **Visitt AI** | | ❌ OFF | Master switch for all AI features |
| → Live Translate | | ❌ OFF | AI translates work order chat messages in real time |
| **Billing** | | ✅ ON | Enables the Billing module (charges, invoices) |

> **Key rule**: Enabling a child flag when the parent is OFF has no effect. Always enable parent first.

#### Experiments (Beta / Per-Customer Flags)

These are features in development or rolled out selectively. Names with `[Fattal]` or `[Sales]` prefix are customer-specific or team-specific flags.

| Experiment Flag | Status (Apex Tower) | What it does |
|---|---|---|
| Amenity Booking Inquiry Flow | ❌ OFF | Alternative UX for booking amenities (inquiry-first instead of instant book) |
| Deprecated contact fields | ❌ OFF | Shows legacy contact fields that are being phased out |
| Show inspections with deficiencies on the status page | ❌ OFF | Adds a "deficiencies" section to the property status dashboard |
| [Fattal] Complete work order review charges notice | ❌ OFF | Customer-specific: sends notice when WO charges are reviewed |
| [Fattal] Rolling work order automation | ❌ OFF | Customer-specific: automates recurring work orders |
| Set coi requirements manually | ❌ OFF | Allows manually configuring COI requirements instead of using defaults |
| Views | ❌ OFF | Enables the "Views" feature (custom saved filters/dashboards) |
| [Sales] Views AI Prompt | ✅ ON | Sales/demo flag: enables AI prompt UI inside Views |
| Out of office | ❌ OFF | Enables out-of-office status for users (auto-reassignment of work orders) |

#### Other sections on the Super-Admin page

| Section | What's there |
|---|---|
| **Visitt+** | Instructions: "To enable Visitt+ for the company, enable the company feature named 'Visitt+'" |
| **Metadata** | Visitt vertical (Commercial/Residential/etc.), Hubspot Deal ID, Country, Hubspot vertical — all sync with HubSpot |
| **Onboarding** | Stage and Date — sync to HubSpot |
| **Payment** | Date, MRR, Lost At — synced from HubSpot |
| **Pilot Period** | Date range for the trial period (e.g., 3/23/26 → 5/7/26, 45 days) with Submit button |
| **Broadcasts monthly limit** | DEFAULT 1000/month; 5000/month (250NIS / $50); 10000/month (450NIS / $95) |
| **Webhooks** | Add webhook button — for external event subscriptions |
| **API partners** | Add API partner button |
| **Add Integration (Accounting)** | Yardi (full sync + push WOs/charges), MRI (full sync + push charges), Rent Manager (full sync + push WOs) |
| **Add Integration (Building)** | SwiftConnect (QR code access control for 20+ systems), Azure Calendar (sync amenity bookings to room displays) |
| **Add Integration (Security)** | Contacts SCIM (deprovision users via SCIM v2.0, supports Entra/Okta/Workday) |
| **App Links** | VendorPM (auto-login link), SV3 Visitor (visitor system), SV3 Vehicle (vehicle system) |
| **Danger** | Disable property, Anonymize property |

> **See log button**: Next to the "Features" heading there's a "See log" button that shows the full history of every feature flag change — who changed it and when.

---

### Level 3: Property Admin (company-settings)
**URL**: `/company-settings` (context-sensitive — shows settings for whichever property is selected in top-right dropdown)
**How to reach**: Admin link in left sidebar OR direct URL

**Tabs**:

| Tab | What's there |
|---|---|
| **Users** | List of property users, permissions, positions, assigned properties. Export, Add existing user, Add new user. "Show inactive" toggle |
| **Tenant App** | Sub-sections: Details, Requests, Tenant app pages, Common areas. Has live preview of tenant app on right side. Visitt+ Live edit link |
| **Categories** | Work order categories for this property |
| **Templates** | Work order templates |
| **Work orders** | Work order settings (SLA, auto-assignment, etc.) |
| **Inspections** | Inspection configuration |
| **General** | Logo, Timezone, Language, Office Hours per day (Mon-Sun, "Add time" or "Remove") |
| **Billing** | Billing configuration for this property |

#### Tenant App > Details
- Name, Language, Brand color (presets + custom hex), Company logo upload
- Additional settings: "Send a satisfaction survey upon work order completion" toggle
- Live preview on right shows real-time appearance of tenant app

#### Tenant App > Requests
- "Set categories and custom fields" — manage which request categories tenants can see
- "Select spaces or equipment" dropdown to filter by location

#### Tenant App > Tenant app pages
- Custom pages visible in the tenant app navigation

#### Tenant App > Common areas
- Common area configuration for tenant-accessible spaces

> **Navigation gotcha**: The property selector in top-right corner of `/company-settings` controls which property you're editing. Always verify you're on the right property before making changes.

---

### URL Quick Reference for Settings Pages

| Page | URL Pattern | Notes |
|---|---|---|
| Customer settings | `/customer/[slug]#settings` | Customer-level, affects all properties |
| Property Super-Admin (Feature Flags) | `/company/[id]#settings` → Super-Admin tab | Property-level, navigate via customer → Properties |
| Property Admin | `/company-settings#[tab]` | Context-sensitive per selected property |
| Property Admin - General | `/company-settings#general` | |
| Property Admin - Tenant App | `/company-settings?activeSideMenuItem=details#portal` | |
| Property Admin - Tenant App Requests | `/company-settings?activeSideMenuItem=requests#portal` | |
| Property Admin - Billing | `/company-settings#billing` | |

---

## Work Orders & Inspections Settings — Feature Key Mapping (2026-03-22)

All toggles on the Work Orders tab and Inspections tab use `updateCompanyFeature(companyId, feature, value)` — same mutation as feature flags.

### Work orders tab (`/company-settings#issues` → hash becomes `#issues`)

| UI Label | GQL `feature` string | Default (Apex Properties) |
|---|---|---|
| Require a category to create a work order | `require_category_to_create_issue` | OFF |
| Require logging of work hours to complete a work order | `mandatory_work_hours_on_issue` | OFF |
| Show and enable search by building external Key in work order form | **unknown** (not a feature flag — uses different mutation) | OFF |
| Enable recurring work orders | `recurring_work_orders` | ON for Apex Tower |
| Require work order acceptance | **unknown** (not a feature flag — uses different mutation) | OFF |

> **Correction**: `recurring_work_orders` was previously documented as "backend-only (not in UI)". It IS in the UI — it's the "Enable recurring work orders" toggle in the Work orders tab.

### Inspections tab (`/company-settings#inspections`)

| UI Label | GQL `feature` string | Default (Apex Properties) |
|---|---|---|
| Require logging of work hours to complete an inspection | unknown | OFF |
| Allow to reopen missed inspections | `reopen_missed_inspection` | ON for Apex Tower |

> **Correction**: `reopen_missed_inspection` was previously documented as "backend-only (not in UI)". It IS in the UI — it's in the Inspections tab.

### General tab (`/company-settings#general`)
- Logo upload, Timezone, Language dropdowns
- Office Hours: per day (Mon-Sun), "Add time" / "Remove" buttons
- Save button

### Billing tab (`/company-settings?activeSideMenuItem=general#billing`)
Sub-navigation: **General** | **Tax & Markup** | **Charge codes**

- **General**: "Remit payment to" text field (appears on all work order invoices). "Enable tenant charge approval on work orders" toggle (tenants e-sign approval digitally) — OFF by default.
- **Tax & Markup**: "Tax rate (%)" — applied to all taxable billable items.
- **Charge codes**: Manage charge codes for billing/invoicing. "Add charge code" button.

---

## Bulk Operations — Ready-to-Use Code Snippets (2026-03-22)

### Pattern: Get all property IDs for a customer
```javascript
const gql = (q, v) => fetch('/graphql', {
  method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'include',
  body: JSON.stringify({ query: q, variables: v })
}).then(r => r.json());

const { data } = await gql('{ customer(customerId: "apex_properties") { companies { _id name features } } }');
const companies = data.customer.companies;
// → [{ _id, name, features[] }, ...]
```

### Pattern: Bulk apply feature flag to all properties of a customer
```javascript
const gql = (q, v) => fetch('/graphql', {
  method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'include',
  body: JSON.stringify({ query: q, variables: v })
}).then(r => r.json());

const mutation = `mutation updateCompanyFeature($companyId: String!, $feature: CompanyFeature!, $value: Boolean!) {
  updateCompanyFeature(companyId: $companyId, feature: $feature, value: $value) { _id features }
}`;

// Step 1: get all company IDs
const { data } = await gql('{ customer(customerId: "CUSTOMER_SLUG") { companies { _id name } } }');
const companies = data.customer.companies;

// Step 2: apply to each (with 300ms delay between calls)
const results = [];
for (const co of companies) {
  const r = await gql(mutation, { companyId: co._id, feature: 'FEATURE_NAME', value: true });
  results.push({ name: co.name, ok: !r.errors });
  await new Promise(r => setTimeout(r, 300));
}
console.table(results);
```

### Pattern: Verify feature state across all properties
```javascript
const gql = (q) => fetch('/graphql', {
  method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'include',
  body: JSON.stringify({ query: q })
}).then(r => r.json());

const { data } = await gql('{ customer(customerId: "apex_properties") { companies { _id name features } } }');
data.customer.companies.forEach(co => {
  const hasFeature = co.features.includes('FEATURE_NAME');
  console.log(co.name + ': ' + (hasFeature ? '✅' : '❌'));
});
```

### Apex Properties — All Property IDs (confirmed 2026-03-22)
| Property | `companyId` |
|---|---|
| Apex Tower | `69be7bb1633d48b012df1d5c` |
| Harborview Center | `69be7bbe633d48b012df1d77` |
| Meridian Plaza | `69be7bbe633d48b012df1d7f` |
| Northgate Office Park | `69be7bbe633d48b012df1d83` |
| Westside Commons | `69be7bbe633d48b012df1d7b` |

Customer slug: `apex_properties`

---

## Super-Admin Property Page — Additional Tabs (2026-03-22)

URL: `/company/[id]#[tab]`

| Tab | Hash | What's there |
|---|---|---|
| Super-Admin | `#settings` | Features + Experiments + Visitt+ + Metadata + Onboarding + Payment + Pilot Period + Broadcasts limit + Webhooks + API partners + Integrations + App Links + Danger zone |
| Status | `#status` | Property operational status |
| Buildings | `#buildings` | Building structure overview |
| Users | `#users` | User management |
| Documents | `#documents` | Document management |
| Automation | `#automations` | WO automation rules (trigger → action) |
| Users Features | `#users-features` | Per-user feature permission matrix (view_inspections, manage_inspections, documents, renew_ai_documents, add_documents, tenant_coi, vendor_coi, etc.) |

### Automation tab
- "Add automation" button
- Current automations for Apex Tower:
  - New work order opened → Set due date → 3 Days
  - New work order opened → Set priority → Medium
  - New work order opened → Set assigned users → No assignees (default)

---

## Customer-Level Settings — Full Map (2026-03-22)

URL: `/customer/[slug]#settings`

### Settings section
| Setting | Value (Apex Properties) |
|---|---|
| Default Timezone | (-04:00) America/New_York |
| Default Country | United States |
| Language | English |
| Terminology | Terminology (dropdown) |
| Date format | March 22, 2026 (US format selected) |
| Time format | AM:PM selected |
| First work day of the week | Monday |
| Currency | $ |
| Measurement system | Imperial |

### Features & Notifications section (toggles)
- SMS notifications
- Email notifications
- Mobile Calendar
- Issue Set External Reporter
- Templates library
- SLA
- Live Translate (AI real-time translation of WO chat messages)

### SSO
- Enable SSO (Okta, Azure, Google)

### Integrations
- Set SFTP Integration
- Set MRI Integration (for ALL customer properties at once)
- Set up Yardi Integration (for ALL customer properties at once)

### Import (bulk operations)
- **Import One**: Import property data from external systems
- **Import inspections**: Bulk import across all properties using Excel (needs "Property Name" column)
- **Import users**: Bulk import users across all properties using Excel

### Danger zone
- **Status**: Change customer operational status (affects demo data reset). Options include "New"
- **Move a property to a different customer**: Move individual property between customers

---

## Automation Page (2026-03-22)

**URL**: `https://staging.visitt.io/automations`

> **Critical**: This page does NOT live under `company-settings`. Navigate directly to `/automations`. The `#automations` hash on company-settings does nothing — wrong URL.

The page is **property-scoped** — always confirm the correct property is selected in the top-right selector before creating or reading automations.

### What it shows

Each automation displays as a row:
```
[Trigger icon] [When trigger] → [Action icon] [Action type]
  [Rule row]: [Scope/category] → [Value]
```

### Creating an automation — full UI flow

Click **"+ Add automation"** (top right). A modal appears with:

**Step 1 — When (trigger)**

| Trigger option | Notes |
|---|---|
| `New work order opened` | Default. Fires immediately on creation. |
| `Work order wasn't seen for` | Requires time input (Minutes/Hours/Days). Auto-defaults "Then" to "Notify users". |
| `Work order received no response for` | Time-based. |
| `Work order wasn't completed for` | Time-based. |
| `Work order was completed` | Fires on completion. |

**Step 2 — Filters (optional, only shown for relevant triggers)**

- **With priority**: Any priority / Low / Medium / High / Critical
- **In category**: Multi-select dropdown with search. Selecting specific categories scopes the rule only to those. Leave as "Any category" to apply to all.

**Step 3 — Time (for time-based triggers)**

- Input field + unit dropdown: **Minutes / Hours / Days**
- Example: value=1, unit=Hours → triggers after 1 hour unseen

**Step 4 — Then (action)**

| Action | Sub-fields |
|---|---|
| `Set due date` | Number of days |
| `Set priority` | Priority dropdown: Low / Medium / High / Critical |
| `Set assigned users` | User multi-select |
| `Notify users` | Users multi-select (see below) |

**Users dropdown for "Notify users"**:
- `Work order creator` — notifies whoever opened the WO
- `Assigned users` — notifies whoever is assigned to the WO ← use this for "notify assignees"
- Individual users by name (property-level users listed below)

**Submit** saves and closes the modal. A toast "Automation added" confirms success.

### Automation 1: Set priority on category (learned 2026-03-22)

> When: New work order opened → In category: [Electrical, Elevators] → Then: Set priority → High

Steps:
1. Click "+ Add automation"
2. Leave "When" as "New work order opened"
3. Click "In category" → search/check the target categories → close dropdown (Escape)
4. Click "Then" → select "Set priority"
5. Click "Select priority" → choose "High"
6. Submit

### Automation 2: Notify assigned users if unseen (learned 2026-03-22)

> When: Work order wasn't seen for → 1 Hours → Then: Notify users → Assigned users

Steps:
1. Click "+ Add automation"
2. Change "When" to "Work order wasn't seen for" (Then auto-fills "Notify users")
3. Set time input to `1` and unit to `Hours`
4. Under "Users" → click Select User → check "Assigned users" → close dropdown
5. Submit

### Performance

Both automations created in ~3 minutes total via UI. API path for automations not yet discovered — intercept if bulk creation is needed.

---

## Customer Page — Other Tabs (2026-03-22)

URL: `/customer/[slug]`

| Tab | Hash | What's there |
|---|---|---|
| Properties | `#companies` | All properties for this customer. "Add property" button. Export button. |
| Buildings | `#buildings` | All buildings across all properties |
| Work orders | `#issues` | All work orders across all properties |
| Users (N) | `#users` | All users across all properties |
| Categories | `#categories` | Work order categories (customer-level) |
| Settings | `#settings` | Full settings (documented above) |

