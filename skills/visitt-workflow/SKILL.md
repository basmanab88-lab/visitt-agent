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
