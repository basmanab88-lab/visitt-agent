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

### Fetch interceptor resets on SPA navigation
Installing `window.fetch` interceptor before navigating to a new URL loses the interceptor.
Always re-install the interceptor AFTER navigating to the target page.

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
