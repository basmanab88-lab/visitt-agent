# Visitt API — Buildings & Spaces

## Internal API Ã¢ÂÂ Discovered Mutations (verified 2026-03-17)

These mutations were captured from the Visitt frontend. Use them via `fetch('/graphql', ...)` from the browser.

### insertBuilding
Creates a new building under a property.
```graphql
mutation insertBuilding($input: InsertBuildingInput!) {
  insertBuilding(input: $input) {
    _id
  }
}
```
**Variables:**
```json
{
  "input": {
    "companyId": "PROPERTY_ID",
    "customerId": "CUSTOMER_SLUG",
    "name": "Building Name",
    "address": "123 Street",
    "size": 12000,
    "image": null
Note: `companyId` is the property ID (confusing naming). `customerId` is the customer's slug (e.g., "skynet").

### upsertFloors
Creates or updates floors in a building. Can create multiple floors at once.
mutation upsertFloors($input: UpsertFloorsInput!) {
  upsertFloors(input: $input) {
    "buildingId": "BUILDING_ID",
    "floors": [
      {"_id": "dummy_id_0", "name": "Ground Floor", "level": 0},
      {"_id": "dummy_id_1", "name": "First Floor", "level": 1},
      {"_id": "dummy_id_2", "name": "Second Floor", "level": 2}
    ]
Note: Use `dummy_id_N` for new floors. The server assigns real IDs. Level 0 = ground floor.

### insertSite (spaces, equipment, subspaces)
Creates a space, equipment, or subspace. Everything is a "site" in Visitt's data model.
mutation insertSpace($input: InsertSiteInput!) {
  insertSite(input: $input) {
**Variables for a space:**
    "modelType": "site",
    "name": "Office 101",
    "type": ""
**modelType values:**
- `"site"` Ã¢ÂÂ regular space (base building space)
- `"leasable_site"` Ã¢ÂÂ leasable space (can be assigned to tenants)
- `"equipment"` Ã¢ÂÂ equipment item
- `"floor"` Ã¢ÂÂ floor (but use upsertFloors instead)

**CRITICAL:** `insertSite` does NOT assign spaces to floors. Spaces are created under "Spaces & equipment without floors". You MUST call `changeSitesLocation` after creation to assign them to floors. See below.
**Note on "Whole Building" space:** Hiffman properties use a top-level space called "Whole Building" (modelType: "site") with no floor assignment. Some properties have it spelled "whole building" (lowercase) — always search case-insensitively: `s.name.toLowerCase() === 'whole building'`. (verified 2026-04-05)

### changeSitesLocation (assign spaces/equipment to floors)
Moves one or more sites to a floor (or to another parent site). **Required after `insertSite`** to assign entities to floors.
mutation changeSitesLocation($buildingId: String!, $parentSiteId: String!, $siteIds: [String!]!) {
  changeSitesLocation(buildingId: $buildingId, parentSiteId: $parentSiteId, siteIds: $siteIds) {
  "buildingId": "BUILDING_ID",
  "parentSiteId": "FLOOR_SITE_ID",
  "siteIds": ["site_id_1", "site_id_2", "site_id_3"]
**Key notes:**
- `parentSiteId` is the floor's site ID (from `upsertFloors` response Ã¢ÂÂ same IDs)
- You can pass multiple `siteIds` in one call Ã¢ÂÂ **batch all entities per floor into one call** for efficiency
- Requires all 3 parameters (`buildingId`, `parentSiteId`, `siteIds`) Ã¢ÂÂ omitting `buildingId` causes silent failure
- Also works for nesting sub-spaces under parent spaces (set `parentSiteId` to the parent space ID)

**Optimal deployment flow (verified 2026-03-19):**
1. insertBuilding       Ã¢ÂÂ get buildingId
2. upsertFloors         Ã¢ÂÂ get floor IDs
3. insertSite ÃÂN        Ã¢ÂÂ create all spaces/equipment (batch with concurrency 5, delay 400ms)
4. changeSitesLocation  Ã¢ÂÂ one call PER FLOOR to assign entities (batch siteIds per floor)
Performance: 49 entities created in 6.3s + floor assignment in 3.2s = ~10s total.

### insertSite Ã¢ÂÂ equipment variant (verified 2026-03-20)
Same `insertSite` mutation, but with `modelType: "equipment"` and extended equipment fields:
    "modelType": "equipment",
    "name": "Main HVAC Unit",
    "parentSiteId": "FLOOR_OR_SPACE_ID",
    "serialNumber": "",
    "notes": "",
    "qrCode": "",
    "type": "",
    "equipmentData": {
      "model": "",
      "manufacturer": "",
      "installationDate": null,
      "condition": null,
      "lifeSpanInYears": null,
      "replacementCost": null,
      "installationCost": null,
      "warrantyExpirationDate": null
    }
Frontend operation name for equipment is `insertSite` (same as spaces). Use `changeSitesLocation` if you need to assign to a floor.

**CRITICAL gotcha — argument name (verified 2026-04-12):**
The GraphQL argument is `input:`, NOT `site:`. Using `site:` causes `GRAPHQL_VALIDATION_FAILED: Unknown argument "site"`. Always use:
```graphql
mutation insertSite($input: InsertSiteInput!) {
  insertSite(input: $input) { _id __typename }
}
```
Variables: `{ "input": { ... } }` — NOT `{ "site": { ... } }`.

**Bulk equipment deployment pattern (verified 2026-04-12, 427 items, 0 errors):**
- Split large datasets into chunks of ≤50 items, store in `localStorage.__eq_cN`
- Launch as background async IIFE (avoids 45s CDP timeout on javascript_tool)
- Use `window.__deployProgress` only as rough indicator — poll `localStorage.__batch_cN_results` for ground truth
- If re-running after a failed attempt: old IIFE keeps running (flag check not built in), new IIFE overwrites localStorage results per chunk — safe to restart
- 427 items × (concurrency 5 + 400ms delay) ≈ 7 minutes total, 0 errors


### buildings (get all buildings for a property)
query buildings($companyId: String) {
  allBuildings(companyId: $companyId) {
    name
    address
    size
    sitesCount(modelType: [site, leasable_site])
    equipmentCount: sitesCount(modelType: [equipment])
    floorsCount: sitesCount(modelType: [floor])

### buildingStructure (get floors and spaces for a building)
Use `fetchBuildingFloors` or `buildingStructure` queries to get the hierarchy.

### companies (get all properties for a customer) Ã¢ÂÂ verified 2026-03-20
query {
  companies(customerId: ["generic_customer"], limit: 40, skip: 0) {
    companies { _id name }
**CRITICAL gotchas (discovered by trial and error):**
- `limit` and `skip` are REQUIRED Ã¢ÂÂ omitting either causes a validation error
- The return type is `PaginatedCompanies`. The nested data field is called `companies` (same name as the query). NOT `data`, `results`, `nodes`, `items`, or `edges` Ã¢ÂÂ those all fail
- `total` field does NOT exist on `PaginatedCompanies` Ã¢ÂÂ remove it if you see it
- `customerId` is an array: `["customer_slug"]`

**Correct pattern to get property IDs:**
```javascript
fetch('/graphql', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ query: `query { companies(customerId: ["SLUG"], limit: 40, skip: 0) { companies { _id name } } }` })
}).then(r => r.json()).then(d => {
  window.__companies = d.data.companies.companies;
  // now find by name: window.__companies.find(c => c.name === "Property 1")
});

### Multi-Property Bulk Deployment Pattern Ã¢ÂÂ verified 2026-03-20

Use this pattern any time a task needs to run across ALL properties of a customer (categories, inspections, automations, etc.).

// Step 1: Get all property IDs for a customer
const props = await fetch('/graphql', {
  body: JSON.stringify({ query: `query { companies(customerId: ["CUSTOMER_SLUG"], limit: 40, skip: 0) { companies { _id name } } }` })
}).then(r => r.json()).then(d => d.data.companies.companies);

// Step 2 (optional): Get buildings per property
const buildings = await Promise.all(props.map(p =>
  fetch('/graphql', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ query: `query { allBuildings(companyId: "${p._id}") { _id name } }` })
  }).then(r => r.json()).then(d => ({ ...p, buildings: d.data?.allBuildings || [] }))
));

// Step 3 (optional): Get sites per property
const sitesQuery = `query allSites($input: SitesSearchInput) { allSites(input: $input) { _id name modelType buildingId } }`;
const withSites = await Promise.all(buildings.map(p =>
    body: JSON.stringify({ query: sitesQuery, variables: { input: { companyId: p._id } } })
  }).then(r => r.json()).then(d => ({ ...p, sites: (d.data?.allSites || []).filter(s => s.modelType === 'site' || s.modelType === 'leasable_site') }))

// Step 4: Deploy per property with delay
const delay = ms => new Promise(r => setTimeout(r, ms));
for (const prop of withSites) {
  // ... build and create the entity (inspection, category, etc.)
  await fetch('/graphql', { ... });
  await delay(400);

**Performance benchmarks (verified 2026-03-20):**
- 24 inspections (12 properties ÃÂ 2) Ã¢ÂÂ ~12 seconds
- 600 categories (30 properties ÃÂ 20) Ã¢ÂÂ ~25 seconds
- 150 automations (30 properties ÃÂ 5) Ã¢ÂÂ ~24 seconds

**Important:** Always store intermediate results in `localStorage` (not `window._var`) when doing multi-step queries. `window._var` is lost if you accidentally navigate. `localStorage` survives SPA navigation.

## How to Call Internal API from Browser

Use `javascript_tool` to execute fetch calls from the same origin:
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operationName: 'insertBuilding',
    query: `mutation insertBuilding($input: InsertBuildingInput!) {
      insertBuilding(input: $input) { _id }
    }`,
    variables: { input: { ... } }
  })
}).then(r => r.json()).then(data => { /* handle response */ });

The browser already has the session cookies, so no auth header needed.


## deleteSites — batch delete spaces/equipment (verified 2026-04-09)

Deletes one or more sites by ID. Works for `site`, `leasable_site`, and `equipment` modelTypes.

```graphql
mutation {
  deleteSites(siteIds: ["id1", "id2", "id3"])
}
```
Returns: array of deleted IDs → `{ "data": { "deleteSites": ["id1", "id2", "id3"] } }`

**Key notes:**
- Mutation name is `deleteSites` (plural) — NOT `deleteSite`, `archiveSite`, `removeSite`, `siteRemoveById`
- Argument is `siteIds` (array) — NOT `id`, `_id`, `siteId`
- No return selection set needed (returns scalar array)
- `deleteSite` (singular) exists in schema but always returns "Invalid query" — do not use
- Send all IDs in a single call — no need to loop

**Identifying orphaned/unassigned sites:**
Use the `parentBranches` field on the `sites` query. Sites with `parentBranches: []` are not assigned to any floor.
```graphql
query {
  sites(
    input: {
      buildingId: "BUILDING_ID"
      companyId: "PROPERTY_ID"
      modelType: [site, leasable_site]
    }
    skip: 0
    limit: 200
    sortBy: "name"
    sortDirection: ASC
  ) {
    sites {
      _id
      name
      modelType
      parentBranches { _id name modelType }
    }
  }
}
```
`parentBranches[0]` = the floor this site lives on. Empty array = orphan (not assigned to any floor).

**IMPORTANT:** `allSites` does NOT accept `buildingId` or `companyId` args. Use the `sites(input: {...})` query instead. The `sites` query also has `buildingId`, `buildingName`, `serialNumber`, `type` fields.

---

## Corrections & Gotchas (verified 2026-04-06)

### changeSitesLocation — CORRECT return signature (supersedes 2026-03-17)
The mutation MUST include return fields or the server returns "Invalid query" (GRAPHQL_VALIDATION_FAILED).
The working signature captured from the UI:
```graphql
mutation changeSitesLocation($buildingId: String!, $parentSiteId: String!, $siteIds: [String!]!) {
  changeSitesLocation(buildingId: $buildingId, parentSiteId: $parentSiteId, siteIds: $siteIds) {
    _id
    building { _id __typename }
    __typename
  }
}
```
**Root cause of failure:** Previous docs showed the mutation body without return fields — server rejects this.

### insertSite — companyId is NOT a valid field
`InsertSiteInput` does NOT have a `companyId` field. Passing it causes:
`"Field companyId is not defined by type InsertSiteInput"` — silent failure (returns empty id).
Correct minimal input:
```json
{ "modelType": "site", "name": "room 1", "buildingId": "...", "type": "" }
```

### Building direct URL pattern (verified 2026-04-06)
Direct navigation to a building: `/building/{buildingId}#overview` (singular, not `/buildings/`)

### Fetch interceptor — SPA navigation trick (verified 2026-04-09)
Installing `window.fetch` interceptor and then calling `window.location.reload()` or hard-navigating KILLS the interceptor.

**To keep interceptor alive:** Use React Router SPA navigation:
```javascript
window.history.pushState({}, '', '/building/BUILDING_ID');
window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
```
This triggers React Router re-render without destroying the JS context. The interceptor survives.

**To capture unknown mutations/queries:**
1. Install interceptor on current page
2. SPA-navigate to the target section (pushState + popstate)
3. Interact with the UI
4. Read `window.__capturedQueries`

### /building/{id} direct URL — React crash (verified 2026-04-09)
Navigating directly to `https://app.visitt.io/building/{id}` via the browser address bar causes a React error: `Cannot read properties of undefined (reading 'customer')`. The page breaks.

**Workaround:** Use SPA navigation (pushState) from the property page, or run GraphQL queries from the property page (`/property/{id}`) instead.

### JS bundle is obfuscated — don't search it (verified 2026-04-09)
The file `/assets/index-DhzA78tV.js` (2.2MB) is minified and variable-name-obfuscated. Searching for mutation names like `deleteSite` returns nothing even when the mutation exists. Introspection is also effectively disabled (returns 0 fields). The ONLY reliable way to discover mutations is:
- **fetch interceptor** (capture live UI requests)
- **trial and error** on known GraphQL patterns

### Building page queries (verified 2026-04-09)
The building page uses these operation names (captured via interceptor):
- `building` — basic building metadata (companyId, customerId)
- `buildings` — all buildings for a property (use `allBuildings(companyId: "PROPERTY_ID")`)
- `buildingStructure` — full building info (counts only, no floor/site list)
- `sitesSearch` — paginated site list with floor assignment data (Spaces tab)

## Mandatory Visual Preview Before Every Building Deploy (rule verified 2026-04-06)
Before deploying any building to Visitt, ALWAYS show a React JSX interactive tree preview.
The preview MUST include:
- Customer name, property name, environment (Staging/Production) in a left sidebar
- Interactive floor tree (click to expand, shows rooms and equipment nested)
- Entity counts (floors, rooms, equipment, total)
- "Pending approval" badge
- Double-click on any name → inline edit
- 🗑 icon on hover → delete entity
- ↩ restore for deleted items
- "+ Add floor" button at bottom
Only proceed with deploy AFTER explicit user approval ("תטמיע" / "deploy" / "yes").
This is a NON-NEGOTIABLE rule identical to the "Visualize before deploy" rule in core rules.

## Standard Visual Preview Template (added 2026-04-06)
The mandatory interactive preview before every building deploy is stored as a LOCKED template:
`skills/visitt-workflow/templates/building-preview.jsx`

Usage per session:
1. Read the template file
2. Copy it to /mnt/outputs/building-preview.jsx
3. Populate the INIT block with session data (customerName, propertyName, env, buildingName, floors)
4. Present it to the user and wait for approval
5. Do NOT push session-specific INIT data back to GitHub — only the template structure is shared

## insertSite — Create a Space (verified 2026-04-09)

Creates a single space/site inside a building. Captured from the Spaces tab "Create space" button.

```graphql
mutation insertSpace($input: InsertSiteInput!) {
  insertSite(input: $input) {
    _id
    __typename
  }
}
```

**Variables:**
```json
{
  "input": {
    "buildingId": "BUILDING_ID",
    "modelType": "site",
    "name": "Space Name",
    "type": ""
  }
}
```

**Notes:**
- `modelType`: `"site"` for base building space, `"leasable_site"` for tenant space
- `type`: can be empty string `""` — no space category needed
- No `parentBranchId` → space is created without floor assignment (useful for "כל הבניין" whole-building sites)
- To assign to a floor, add `"parentBranchId": "FLOOR_ID"` to the input
- UI path: Building → Spaces tab → "Create space" button → Base building space / Leasable space

---

## Bulk Equipment Deployment Pattern — verified 2026-04-12

Tested on 210 equipment items across 13 spaces, 4 floors. Zero errors.

### Key findings

**equipmentData fields go INSIDE the equipmentData object (not root input):**
```json
{
  "input": {
    "buildingId": "BUILDING_ID",
    "modelType": "equipment",
    "name": "Item Name",
    "type": "Type Category > Subcategory",
    "parentSiteId": "SPACE_OR_FLOOR_ID",
    "serialNumber": "SN123",
    "notes": "Any notes",
    "equipmentData": {
      "model": "Model XYZ",
      "manufacturer": "Manufacturer Name",
      "installationDate": "2023-09-01T00:00:00.000Z"
    }
  }
}
```
- `installationDate` must be ISO 8601 format — non-date strings (e.g. "Installed by Vertiv") should go in `notes` instead
- `type` field accepts free-form string — e.g. "PDU (Power Distribution Unit) > Electrical"
- `parentSiteId` places equipment under a space; still call `changeSitesLocation` to confirm floor assignment

**Location string parsing (from Excel sheets):**
Format is `Building / Floor / Space` but space names may contain `/` (e.g. "Generator A/B").
Split on `" / "` (space-slash-space) with max 2 splits, NOT on bare `/`:
```python
parts = location.split(' / ', 2)
building, floor, space = parts[0], parts[1], parts[2] if len(parts) > 2 else None
```
Splitting on bare `/` silently breaks "Generator A/B" into 4 parts.

**Large dataset injection via localStorage chunking:**
When equipment data exceeds ~10KB for a single `javascript_tool` call, split into chunks of ~50 items:
1. Save each chunk to `localStorage.setItem('__eq_cN', JSON.stringify(chunk))`
2. Run deployment function reading from `localStorage.getItem('__eq_cN')`
3. Store results in `localStorage.setItem('__batch_cN_results', JSON.stringify(results))`
4. After all batches, collect all result IDs and run `changeSitesLocation` per parent space

**allBuildings returns equipmentCount:**
```graphql
allBuildings(companyId: "PROPERTY_ID") {
  _id name
  equipmentCount: sitesCount(modelType: [equipment])
}
```
Use this to verify count after bulk deploy.

**Concurrency + delay sweet spot for equipment:** 5 concurrent + 400ms delay = ~35s per 52 items = 0 errors.

## Subspace Deploy Pattern - Storage/Parking under Apartments (verified 2026-04-26)

Mass-add subspaces (storage `מחסן` and parking `חניה`) under leasable_site apartments using ONE-SHOT `insertSite` with `parentSiteId` set to the apartment ID. No `changeSitesLocation` needed when `parentSiteId` is in the input.

**Mutation pattern:**
```javascript
fetch('/graphql', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    query: `mutation insertSite($input: InsertSiteInput!) {
      insertSite(input: $input) { _id name __typename }
    }`,
    variables: { input: {
      buildingId: BUILDING_ID,
      parentSiteId: APARTMENT_ID,    // the parent site (leasable_site apt)
      modelType: 'leasable_site',     // matches existing children pattern
      name: 'מחסן 38S',                // or 'חניה 36P'
      type: 'דירה'                    // inherit type from parent apartment
    }}
  })
});
```

**Key findings:**
- `modelType: 'leasable_site'` for sub-rentables (matches sibling children like "אינטרקום", "מטבח")
- `type: 'דירה'` inherits the parent apartment's type field
- `parentSiteId` in `insertSite` input handles nesting in one call - no follow-up `changeSitesLocation`
- 440 subspaces across 13 buildings deployed in 88.5s with concurrency 5 + 400ms delay = 0 errors

**Garden apartment naming reversal (Excel vs Visitt):**
- Excel: `דירת גן 1G`, `דירת גן 2G` (number-letter)
- Visitt: `דירת גן G1`, `דירת גן G2` (letter-number)
Match regex: `דירה מספר (\d+[A-Z])` for regular, `דירת גן ([A-Z]\d+)` for garden, then reverse the garden key (`G1` → `1G`).

**Comma-separated multi-values in deploy sheets:**
Excel cells may contain multiple values per type, e.g. `9P,65P` means 2 parking spots. Split on `,` and create one subspace per value. 6 such cells in this dataset → 6 extra subspaces (313 → 319 unique IDs from 313 apt rows; here 434 total work items expanded to 440 actual creates).

## deleteSites - Correct Argument and Return Shape (verified 2026-04-26, supersedes 2026-04-09)

The mutation uses `siteIds: [String!]!` (NOT `ids` or `_ids`) and returns a plain `[String!]!` (NO subselection allowed).

```graphql
mutation deleteSites($siteIds: [String!]!) { deleteSites(siteIds: $siteIds) }
```

```javascript
fetch('/graphql', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    query: `mutation deleteSites($siteIds: [String!]!) { deleteSites(siteIds: $siteIds) }`,
    variables: { siteIds: ['siteId1', 'siteId2'] }
  })
});
```

Common errors that revealed the correct shape:
- `Field "deleteSites" must not have a selection since type "[String!]!" has no subfields.` -> remove `{ _id __typename }`
- `Unknown argument "ids"/"_ids"` + `Field "deleteSites" argument "siteIds" of type "[String!]!" is required` -> use `siteIds`

