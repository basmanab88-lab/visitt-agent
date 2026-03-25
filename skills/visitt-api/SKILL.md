---
name: visitt-api
description: "Visitt GraphQL API skill for reading and writing data to the Visitt property management platform via API calls. Covers BOTH the internal frontend API and the Partner API. Use this skill whenever the user asks to create, read, update, or delete data in Visitt programmatically Ã¢ÂÂ tenants, contacts, work orders, inspections, categories, buildings, floors, spaces, equipment, properties, charges, billable items. Also triggers on: Visitt API, GraphQL, partner API, bulk data operations via API, webhook setup, demo property creation, or when the task would be faster via API than UI (e.g., creating 5+ entities). If the user mentions API, endpoint, query, mutation, or programmatic access to Visitt Ã¢ÂÂ use this skill."
---

# Visitt GraphQL API Ã¢ÂÂ Operational Guide

## Two APIs Available

Visitt has TWO GraphQL APIs:

### 1. Internal Frontend API (primary for automation)
- **Endpoint:** `https://staging.visitt.io/graphql` (staging) or `https://app.visitt.io/graphql` (production)
- **Auth:** Session cookies (same as logged-in browser session)
- **Scope:** Full access Ã¢ÂÂ buildings, floors, spaces, equipment, tenants, contacts, everything
- **Best for:** Browser-based automation via `javascript_tool` (fetch from same origin)
- **Introspection:** Disabled (Apollo Server)

### 2. Partner API (external integrations)
- **Endpoint:** `https://partner-api.visitt.io/graphql`
- **Auth:** Bearer token in Authorization header
- **Scope:** Limited Ã¢ÂÂ tenants, contacts, work orders, categories, billing. NO building/floor/space creation.
- **Best for:** External scripts, webhooks, integrations
- **Docs:** https://partner-api.visitt.io/

### Decision: Which API to use?

| Task | API | Reason |
|------|-----|--------|
| Create buildings, floors, spaces, equipment | Internal | Partner API doesn't support these |
| Create tenants & contacts | Either | Both work; Internal is faster from browser |
| Full demo property setup | Internal | Only API with building/floor/space mutations |
| External webhook integration | Partner | Designed for external use |
| Standalone script (no browser) | Partner | Uses token auth, no session needed |

## When to Use API vs UI vs Import

The API arm is best when:
- Creating or updating many records programmatically (tenants, contacts, work orders)
- Creating 5+ entities of the same type (buildings, floors, spaces, equipment)
- Setting up a full demo property (building + floors + spaces + equipment + tenants + contacts)
- Reading data for reports or analysis
- Speed matters Ã¢ÂÂ API calls are faster than UI navigation

Use UI (visitt-workflow skill) when: the task involves visual configuration, settings pages, or workflows not exposed in the API.
Use Import (visitt-import skill) when: the user has a CSV file ready or the task is a one-time bulk data load.

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
  }
}
```
Note: `companyId` is the property ID (confusing naming). `customerId` is the customer's slug (e.g., "skynet").

### upsertFloors
Creates or updates floors in a building. Can create multiple floors at once.
```graphql
mutation upsertFloors($input: UpsertFloorsInput!) {
  upsertFloors(input: $input) {
    _id
  }
}
```
**Variables:**
```json
{
  "input": {
    "buildingId": "BUILDING_ID",
    "floors": [
      {"_id": "dummy_id_0", "name": "Ground Floor", "level": 0},
      {"_id": "dummy_id_1", "name": "First Floor", "level": 1},
      {"_id": "dummy_id_2", "name": "Second Floor", "level": 2}
    ]
  }
}
```
Note: Use `dummy_id_N` for new floors. The server assigns real IDs. Level 0 = ground floor.

### insertSite (spaces, equipment, subspaces)
Creates a space, equipment, or subspace. Everything is a "site" in Visitt's data model.
```graphql
mutation insertSpace($input: InsertSiteInput!) {
  insertSite(input: $input) {
    _id
  }
}
```
**Variables for a space:**
```json
{
  "input": {
    "buildingId": "BUILDING_ID",
    "modelType": "site",
    "name": "Office 101",
    "type": ""
  }
}
```
**modelType values:**
- `"site"` Ã¢ÂÂ regular space (base building space)
- `"leasable_site"` Ã¢ÂÂ leasable space (can be assigned to tenants)
- `"equipment"` Ã¢ÂÂ equipment item
- `"floor"` Ã¢ÂÂ floor (but use upsertFloors instead)

**CRITICAL:** `insertSite` does NOT assign spaces to floors. Spaces are created under "Spaces & equipment without floors". You MUST call `changeSitesLocation` after creation to assign them to floors. See below.

### changeSitesLocation (assign spaces/equipment to floors)
Moves one or more sites to a floor (or to another parent site). **Required after `insertSite`** to assign entities to floors.
```graphql
mutation changeSitesLocation($buildingId: String!, $parentSiteId: String!, $siteIds: [String!]!) {
  changeSitesLocation(buildingId: $buildingId, parentSiteId: $parentSiteId, siteIds: $siteIds) {
    _id
  }
}
```
**Variables:**
```json
{
  "buildingId": "BUILDING_ID",
  "parentSiteId": "FLOOR_SITE_ID",
  "siteIds": ["site_id_1", "site_id_2", "site_id_3"]
}
```
**Key notes:**
- `parentSiteId` is the floor's site ID (from `upsertFloors` response Ã¢ÂÂ same IDs)
- You can pass multiple `siteIds` in one call Ã¢ÂÂ **batch all entities per floor into one call** for efficiency
- Requires all 3 parameters (`buildingId`, `parentSiteId`, `siteIds`) Ã¢ÂÂ omitting `buildingId` causes silent failure
- Also works for nesting sub-spaces under parent spaces (set `parentSiteId` to the parent space ID)

**Optimal deployment flow (verified 2026-03-19):**
```
1. insertBuilding       Ã¢ÂÂ get buildingId
2. upsertFloors         Ã¢ÂÂ get floor IDs
3. insertSite ÃÂN        Ã¢ÂÂ create all spaces/equipment (batch with concurrency 5, delay 400ms)
4. changeSitesLocation  Ã¢ÂÂ one call PER FLOOR to assign entities (batch siteIds per floor)
```
Performance: 49 entities created in 6.3s + floor assignment in 3.2s = ~10s total.

### setTenant
Creates or updates a tenant. Also used to assign spaces (leased/authorized) and contacts to a tenant.
```graphql
mutation setTenant($input: TenantInput!) {
  setTenant(input: $input) {
    _id
    name
  }
}
```
**Variables (create minimal):**
```json
{
  "input": {
    "companyId": "PROPERTY_ID",
    "name": "Tenant Company Name",
    "locations": [],
    "contacts": []
  }
}
```
**Variables (full update Ã¢ÂÂ verified 2026-03-20):**
```json
{
  "input": {
    "tenantId": "TENANT_ID",
    "companyId": "PROPERTY_ID",
    "name": "Cyberdyne Systems",
    "tenantCode": "",
    "billingCompanyName": "",
    "billingContactName": "",
    "billingAddress": "",
    "isTaxExempt": false,
    "locations": [
      {
        "buildingId": "BUILDING_ID",
        "siteId": "SITE_ID",
        "isLeased": true
      }
    ],
    "contacts": [
      {
        "_id": "CONTACT_ID",
        "roles": []
      }
    ]
  }
}
```
**Key notes:**
- `setTenant` is used for BOTH create and update. Include `tenantId` field to update existing.
- `locations[].isLeased: true` Ã¢ÂÂ Leased space (exclusive use). `isLeased: false` Ã¢ÂÂ Authorized space (work order creation rights only).
- `contacts[].roles` Ã¢ÂÂ admin roles for the contact within this tenant. Empty array = regular contact.
- **IMPORTANT**: `setTenant` replaces the ENTIRE tenant. When updating locations, include ALL existing contacts in the `contacts` array, and vice versa Ã¢ÂÂ omitting them removes them.
- Space options are fetched via `allSites` query: `{input: {companyId: "PROPERTY_ID"}}`

### addContacts
Creates one or more contacts. Can link directly to a tenant during creation. Ã¢ÂÂ verified 2026-03-20
```graphql
mutation addContacts($input: [ContactInput!]!) {
  addContacts(input: $input) {
    _id
    name
    email
    phone
  }
}
```
**Variables (full Ã¢ÂÂ verified 2026-03-20):**
```json
{
  "input": [
    {
      "companyId": "PROPERTY_ID",
      "name": "John Connor",
      "phone": "+972501234567",
      "email": "john@example.com",
      "extraInfo": "",
      "tenants": [
        {
          "_id": "TENANT_ID",
          "isAdmin": false
        }
      ],
      "locations": [],
      "supervisedContactIds": []
    }
  ]
}
```
**Key notes:**
- `tenants[].isAdmin: true` makes the contact an admin for that tenant (can manage work orders in Visitt+)
- `locations` Ã¢ÂÂ `[ContactLocationInput]` Ã¢ÂÂ optional building/space-level assignment, use `[]` if not needed
- `supervisedContactIds` Ã¢ÂÂ contacts this person supervises, use `[]` if not needed
- Batch: pass multiple objects in the `input` array to create many contacts at once
- After creation, if invite toggle is ON, a `createBroadcast` fires automatically with welcome email template `"not_invited_to_portal_contacts"`
- Global contacts URL: `/tenants#contacts`; per-tenant contacts: `/tenant/<id>?activeSideMenuItem=contacts`
- **Phone validation (2026-03-21):** The API validates Israeli phones with libphonenumber. Format MUST be `+97250XXXXXXX` / `+97252XXXXXXX` / `+97254XXXXXXX` (9 digits after +972). Sub-ranges like `052-1XXXXXX` (`+9725[12]1XXXXXX`) may fail validation Ã¢ÂÂ they're unallocated. **Always test one contact first before batching 50.** Use distinct test emails/phones (e.g. `_test_@...`) to avoid polluting the system with dummy contacts that then block real ones via duplicate-phone/email check.

### tenants (internal query Ã¢ÂÂ verified 2026-03-21)
Get all tenants for a property. Note: uses `input: TenantSearchInput!` (not direct args).
```graphql
query tenants($input: TenantSearchInput!) {
  tenants(input: $input) {
    tenants { _id name }
  }
}
```
**Variables:** `{ "input": { "companyId": "PROPERTY_ID" } }`
- `TenantSearchInput` does NOT accept `limit` or `skip` fields
- Returns `PaginatedTenants { tenants[] }` Ã¢ÂÂ no `total` field

### Getting leasable sites via Apollo cache (fallback Ã¢ÂÂ 2026-03-21)
When `allSites` queries return empty (schema mismatch or missing buildingId), extract from Apollo cache instead:
```javascript
const ac = window.__APOLLO_CLIENT__;
const cache = ac.cache.extract();
const buildingId = 'YOUR_BUILDING_ID';
const leasable = [];
for (const [key, val] of Object.entries(cache)) {
  if (!key.startsWith('Site:')) continue;
  if (JSON.stringify(val).includes(buildingId) && val.modelType === 'leasable_site') {
    leasable.push({ _id: key.replace('Site:', ''), name: val.name });
  }
}
// Store: window.__leasableSites = leasable;
```
This works when already navigated to the building page (cache is pre-populated from UI queries). IDs extracted this way are valid for `setTenant locations[].siteId`.

### Other useful mutations discovered in code:
- `updateBuilding` Ã¢ÂÂ UpdateBuildingInput!
- `updateSite` Ã¢ÂÂ siteId: String!, input: UpdateSiteInput!
- `deleteSites` Ã¢ÂÂ deletes spaces/equipment
- `archiveBuilding` Ã¢ÂÂ buildingId, companyId, isAutoResolve
- `changeSitesBuilding` Ã¢ÂÂ move sites between buildings
- `changeSitesLocation` Ã¢ÂÂ move sites between floors
- `updateContact` Ã¢ÂÂ contactId: String!, input: ContactInput!
- `archiveContact` / `unarchiveContact` Ã¢ÂÂ contactId: String!
- `deleteTenant` Ã¢ÂÂ tenantId: String!
- `makeSpacesLeasable` (updateSitesModelType) Ã¢ÂÂ siteIds: [String]!, modelType: String!

### insertSite Ã¢ÂÂ equipment variant (verified 2026-03-20)
Same `insertSite` mutation, but with `modelType: "equipment"` and extended equipment fields:
```json
{
  "input": {
    "modelType": "equipment",
    "name": "Main HVAC Unit",
    "buildingId": "BUILDING_ID",
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
  }
}
```
Frontend operation name for equipment is `insertSite` (same as spaces). Use `changeSitesLocation` if you need to assign to a floor.

## Internal API Ã¢ÂÂ Key Queries

### tenants (list all tenants for a property) Ã¢ÂÂ verified 2026-03-20
```graphql
query tenants($input: TenantsSearchInput!) {
  tenants(input: $input) {
    _id
    name
    status
    isActive
    tenantCode
  }
}
```
**Variables:** `{ "input": { "companyId": "PROPERTY_ID" } }`

### tenant (single tenant detail) Ã¢ÂÂ verified 2026-03-20
```graphql
query tenant($tenantId: String!) {
  tenant(tenantId: $tenantId) {
    _id
    name
    tenantCode
    status
    companyId
    isActive
    admins { _id name email phone }
    contacts { _id name email phone }
    locations { buildingId siteId isLeased }
  }
}
```

### contacts (list contacts with filtering) Ã¢ÂÂ verified 2026-03-20
```graphql
query contacts($input: ContactSearchInput!, $skip: Int!, $limit: Int!) {
  contacts(input: $input, skip: $skip, limit: $limit) {
    contacts { _id name phone email isArchived }
    hasNext
    totalCount
  }
}
```
**Variables:**
```json
{
  "skip": 0,
  "limit": 40,
  "input": {
    "companyId": "PROPERTY_ID",
    "status": null,
    "inviteStatus": [],
    "search": "",
    "isArchived": false
  }
}
```
Filter by tenant: add `"tenantId": "TENANT_ID"` to the input object.

### sitesSearch (paginated space search with filtering) Ã¢ÂÂ verified 2026-03-20
```graphql
query sitesSearch($input: SitesSearchInput, $skip: Int!, $limit: Int!, $sortBy: String, $sortDirection: String) {
  sitesSearch(input: $input, skip: $skip, limit: $limit, sortBy: $sortBy, sortDirection: $sortDirection) {
    _id
    name
    modelType
    buildingId
    buildingName
    parentBranches { _id name }
    tenant { _id }
  }
}
```
**Variables:**
```json
{
  "skip": 0,
  "limit": 50,
  "sortBy": "parentBranches",
  "sortDirection": "ASC",
  "input": {
    "modelType": ["site", "leasable_site"],
    "companyId": "PROPERTY_ID",
    "buildingId": "BUILDING_ID",
    "parentBranchIds": null,
    "type": [],
    "search": "",
    "groupByBuilding": false
  }
}
```

### allSites (flat list of all spaces for a property) Ã¢ÂÂ verified 2026-03-20
```graphql
query allSites($input: SitesSearchInput) {
  allSites(input: $input) {
    _id
    name
    buildingId
    buildingName
    type
    modelType
    parentBranches { _id name }
    tenant { _id }
  }
}
```
**Variables:** `{ "input": { "companyId": "PROPERTY_ID" } }`

> Ã¢ÂÂ Ã¯Â¸Â **CRITICAL (2026-03-22):** `allSites` does NOT accept `buildingId` in the input Ã¢ÂÂ passing it causes `GRAPHQL_VALIDATION_FAILED`. To get sites for a specific building, use the `building(buildingId)` query below instead.

Used to populate space selectors in tenant locations, inspections, etc.

### building (get sites for a specific building) Ã¢ÂÂ verified 2026-03-22
Use this when you need leasable or regular spaces scoped to one building.
```graphql
query {
  building(buildingId: "BUILDING_ID") {
    _id
    name
    sites {
      _id
      name
      modelType
    }
  }
}
```
Returns ALL sites in that building (all modelTypes). Filter client-side by `modelType === "leasable_site"` to get leasable spaces. This is the correct alternative to `allSites(input: { buildingId })` which does not work.

### buildings (get all buildings for a property)
```graphql
query buildings($companyId: String) {
  allBuildings(companyId: $companyId) {
    _id
    name
    address
    size
    sitesCount(modelType: [site, leasable_site])
    equipmentCount: sitesCount(modelType: [equipment])
    floorsCount: sitesCount(modelType: [floor])
  }
}
```

### buildingStructure (get floors and spaces for a building)
Use `fetchBuildingFloors` or `buildingStructure` queries to get the hierarchy.

### companies (get all properties for a customer) Ã¢ÂÂ verified 2026-03-20
```graphql
query {
  companies(customerId: ["generic_customer"], limit: 40, skip: 0) {
    companies { _id name }
  }
}
```
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
```

### Multi-Property Bulk Deployment Pattern Ã¢ÂÂ verified 2026-03-20

Use this pattern any time a task needs to run across ALL properties of a customer (categories, inspections, automations, etc.).

```javascript
// Step 1: Get all property IDs for a customer
const props = await fetch('/graphql', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
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
  fetch('/graphql', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ query: sitesQuery, variables: { input: { companyId: p._id } } })
  }).then(r => r.json()).then(d => ({ ...p, sites: (d.data?.allSites || []).filter(s => s.modelType === 'site' || s.modelType === 'leasable_site') }))
));

// Step 4: Deploy per property with delay
const delay = ms => new Promise(r => setTimeout(r, ms));
for (const prop of withSites) {
  // ... build and create the entity (inspection, category, etc.)
  await fetch('/graphql', { ... });
  await delay(400);
}
```

**Performance benchmarks (verified 2026-03-20):**
- 24 inspections (12 properties ÃÂ 2) Ã¢ÂÂ ~12 seconds
- 600 categories (30 properties ÃÂ 20) Ã¢ÂÂ ~25 seconds
- 150 automations (30 properties ÃÂ 5) Ã¢ÂÂ ~24 seconds

**Important:** Always store intermediate results in `localStorage` (not `window._var`) when doing multi-step queries. `window._var` is lost if you accidentally navigate. `localStorage` survives SPA navigation.

### categories (get all categories for a company)
```graphql
query { allCategories(companyId: "COMPANY_ID") { _id name } }
```

### Category mutations Ã¢ÂÂ verified 2026-03-20
```graphql
# Remove category from a property (unassign, not delete)
mutation { removeCategoryFromCompany(categoryId: "ID", companyId: "COMPANY_ID") }

# Delete a category globally
mutation { deleteCategory(categoryId: "ID") }

# Create a category (requires customerId, no color field)
mutation createCategory($input: CategoryInput!) {
  createCategory(input: $input) { _id name }
}
# Variables: { input: { name: "Fire Safety", companyId: "COMPANY_ID", customerId: "SLUG" } }
```

### Automation mutations Ã¢ÂÂ verified 2026-03-20
```graphql
mutation createAutomation($input: AutomationInput!) {
  createAutomation(input: $input) { _id }
}
```
**CRITICAL automation rules:**
- `actionValue` is ALWAYS a string, even for JSON objects: `'{"number":4,"unit":"hours"}'`
- `eventFields` MUST include `companyId`: `{ companyId: "COMPANY_ID", categoryIds: [...] }`
- `triggerDelay` only for `issue_not_seen` / `issue_not_completed` events
- Category IDs must be fetched first Ã¢ÂÂ never assume names match IDs

### createAssignment (Inspections) Ã¢ÂÂ verified 2026-03-20

Inspections are called "assignments" in the API. One mutation handles all frequency types.

```graphql
mutation createAssignment($input: CreateAssignmentInput!) {
  createAssignment(input: $input) {
    _id
    name
    interval
    __typename
  }
}
```

**Full variables example (Weekly):**
```json
{
  "input": {
    "name": "Weekly Lobby Check",
    "interval": "week",
    "daysInWeek": [0, 1, 2, 3, 4],
    "customFrequency": 1,
    "startDate": "2026-03-23T22:00:00.000Z",
    "categoryId": "",
    "description": "",
    "isGpsRequired": false,
    "items": [
      {
        "_id": "_ASSIGNMENT_ITEM_TEMP_ID_<timestamp><random>",
        "type": "sites_tasks",
        "subItems": [
          {
            "_id": "_ASSIGNMENT_ITEM_TEMP_ID_<timestamp>_<random>",
            "name": "Check cleanliness",
            "type": "text"
          }
        ],
        "siteIds": ["<siteId>"]
      }
    ],
    "siteIds": ["<siteId>"],
    "buildingIds": ["<buildingId>"],
    "plannedInInterval": 0,
    "companyId": "<companyId>",
    "assignedUserIds": [],
    "rrule": null,
    "completionEndOfUnit": "week",
    "completionPolicy": "end_of_unit"
  }
}
```

**Interval values (frequency Ã¢ÂÂ API value):**
| UI Label | `interval` value | `daysInWeek` | `completionEndOfUnit` |
|----------|-----------------|--------------|----------------------|
| Hourly | `"hour"` | all days | `"hour"` |
| Daily | `"day"` | `[0,1,2,3,4,5,6]` | `"day"` |
| Weekly | `"week"` | `[0,1,2,3,4]` | `"week"` |
| Every two weeks | `"2week"` | `[0,1,2,3,4]` | `"week"` |
| Monthly | `"month"` | `[]` | `"month"` |
| Every 2 months | `"2month"` | `[]` | `"month"` |
| Every 3 months | `"3month"` | `[]` | `"month"` |
| Every 4 months | `"4month"` | `[]` | `"month"` |
| Every 6 months | `"6month"` | `[]` | `"month"` |
| Annual | `"year"` | `[]` | `"year"` |
| Custom | `"custom"` | varies | varies |

Note: Only `"week"` confirmed by capture. Others inferred from pattern Ã¢ÂÂ verify if they fail.

**Task types (`subItems[].type`):**
| UI Label | API type |
|----------|---------|
| Text | `"text"` |
| Number | `"numeric"` |
| Checkbox | `"checkbox"` |
| Section title | `"section_header"` |
| Multiple choice | `"multiple_choice"` |
| Signature | `"signature"` |
| QR scan | `"qr_scan"` |

**Temp ID format:** Generate unique IDs using `_ASSIGNMENT_ITEM_TEMP_ID_${Date.now()}${Math.random().toString(36).slice(2,14)}`. The parent item and each subItem need separate IDs.

**Multi-space inspections:** Include all siteIds from all item groups in the top-level `siteIds` array. Create separate `items` entries per space group if different tasks are needed per space.

**UI URL:** `/assignments#manageVisits` Ã¢ÂÂ Inspections list page. Use `#openVisits` for currently open inspections, `#manageVisits` for all inspection templates.

**Bulk creation pattern (20 inspections in ~10s):**
```javascript
const CREATE_ASSIGNMENT = `mutation createAssignment($input: CreateAssignmentInput!) {
  createAssignment(input: $input) { _id name interval __typename }
}`;

const tempId = () => `_ASSIGNMENT_ITEM_TEMP_ID_${Date.now()}${Math.random().toString(36).slice(2,14)}`;

const buildInput = (insp) => {
  const itemId = tempId();
  return {
    name: insp.name, interval: insp.interval, daysInWeek: insp.daysInWeek,
    customFrequency: 1, startDate: new Date().toISOString(),
    categoryId: "", description: "", isGpsRequired: false,
    items: [{ _id: itemId, type: "sites_tasks",
      subItems: insp.tasks.map(t => ({ _id: `${itemId}_${Math.random().toString(36).slice(2,8)}`, name: t.name, type: t.type })),
      siteIds: insp.siteIds }],
    siteIds: insp.siteIds, buildingIds: [BUILDING_ID], plannedInInterval: 0,
    companyId: COMPANY_ID, assignedUserIds: [], rrule: null,
    completionEndOfUnit: insp.completionEndOfUnit, completionPolicy: insp.completionPolicy
  };
};
// Loop with 400ms delay between each call
```

## How to Call Internal API from Browser

Use `javascript_tool` to execute fetch calls from the same origin:
```javascript
fetch('/graphql', {
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
```

The browser already has the session cookies, so no auth header needed.

## Partner API Basics

**Endpoint:** `https://partner-api.visitt.io/graphql`
**Method:** POST
**Auth:** Bearer token in Authorization header
**Docs:** https://partner-api.visitt.io/

```bash
curl -X POST https://partner-api.visitt.io/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: <PARTNER_API_TOKEN>" \
  -d '{"query": "{ buildings { id name } }"}'
```

The token is scoped to a single company. It's provided by Visitt and must be kept secret Ã¢ÂÂ never log it, commit it, or expose it.

## Available Queries (Read Operations)

| Query | Purpose | Key Fields |
|-------|---------|------------|
| `property` / `properties` | Get property details | id, name, address |
| `building` / `buildings` | Get buildings | id, name, propertyId |
| `tenant` / `tenants` | Get tenants | id, name, unit, contact info |
| `contact` / `contacts` | Get contacts | id, name, email, phone |
| `request` / `requests` | Get maintenance requests | id, title, status, category |
| `workOrder` / `workOrders` | Get work orders | id, title, status, assignee |
| `inspection` / `inspections` | Get inspections | id, type, status |
| `category` / `categories` | Get request/inspection categories | id, name, color |
| `charge` / `charges` | Get charges | id, amount, type |
| `billableItem` / `billableItems` | Get billable items | id, name, price |
| `user` / `users` | Get system users | id, name, role |
| `webhookEventTypes` | List available webhook events | id, name |
| `partner` | Get partner webhooks | webhook list |
| `webhookLogs` | Webhook delivery history | status, attempts |

## Available Mutations (Write Operations)

### Tenants & Contacts
| Mutation | Purpose |
|----------|---------|
| `createTenant` | Create a new tenant |
| `updateTenant` | Update tenant details |
| `deleteTenant` | Delete a tenant |
| `archiveTenant` | Archive/unarchive a tenant |
| `createContact` | Create a new contact |
| `updateContact` | Update contact details |
| `archiveContact` | Archive/unarchive a contact |

### Work Orders & Inspections
| Mutation | Purpose |
|----------|---------|
| `createRequest` | Create a new maintenance request |
| `createWorkOrder` | Create a work order (supports file attachments) |
| `updateWorkOrder` | Update work order details |
| `createInspection` | Create a new inspection |

### Categories
| Mutation | Purpose |
|----------|---------|
| `createCategory` | Create new category/subcategory and assign to property |
| `updateCategory` | Update category name/color |
| `assignCategory` | Add existing account category to a property |
| `unassignCategory` | Remove category from property (keeps in account) |
| `deleteCategory` | Permanently delete category (only if globally unused) |

### Billing
| Mutation | Purpose |
|----------|---------|
| `createBillableItem` | Create a billable item |
| `updateBillableItem` | Update a billable item |
| `updateCharges` | Update charges |

### Webhooks
| Mutation | Purpose |
|----------|---------|
| `createWebhook` | Subscribe to event types |
| `updateWebhook` | Update webhook configuration |

## Category Management via API

Categories live at the account level (not property level). A category can be assigned to multiple properties. The hierarchy:
- Account Ã¢ÂÂ has categories
- Property Ã¢ÂÂ has assigned categories (subset of account categories)
- Categories can have subcategories (e.g., "Plumbing" Ã¢ÂÂ "Leak", "Clogged Drain")

To add a category to a property: use `assignCategory` (if it exists in the account) or `createCategory` (to create and assign in one step).

## File Upload

**Endpoint:** `POST https://partner-api.visitt.io/files`
**Method:** multipart/form-data
**Limits:** 20MB per file, 10 files per request, 20 requests/60 seconds
**Types:** images, PDF, video

Used when creating work orders with attachments.

## Webhooks

Subscribe to events and get notified via HTTPS POST. Verify webhook authenticity using HMAC SHA256 with your API token. Webhooks retry 12 times with exponential backoff if delivery fails.

## Rate Limits

Each token has per-operation rate limits. File upload is limited to 20 requests per 60 seconds. Plan batch operations accordingly Ã¢ÂÂ add delays between large batches.

## Common Patterns

### Batch create tenants
```graphql
mutation {
  createTenant(input: {
    name: "John Doe"
    email: "john@example.com"
    phone: "+972501234567"
    unitId: "unit-id-here"
  }) {
    id
    name
  }
}
```
For bulk creation, loop through records and call createTenant for each. Respect rate limits.

### Query all tenants for a property
```graphql
{
  tenants(filter: { propertyId: "property-id" }) {
    id
    name
    email
    unit { name }
  }
}
```

## Demo Property Setup via API Ã¢ÂÂ Full Flow

This is the sequence for creating a complete demo property setup using the internal API:

```
1. insertBuilding  Ã¢ÂÂ get buildingId
2. upsertFloors    Ã¢ÂÂ create all floors at once (get floor IDs from response)
3. insertSite ÃÂN   Ã¢ÂÂ create spaces on each floor (modelType: "site")
4. insertSite ÃÂN   Ã¢ÂÂ create equipment on each floor (modelType: "equipment")
5. setTenant ÃÂN    Ã¢ÂÂ create tenants (get tenant IDs)
6. addContacts     Ã¢ÂÂ create contacts linked to tenants
```

**Estimated time:** ~10-20 seconds for a full property (vs 40-50 minutes via UI).

**Important IDs to know:**
- Skynet customer: companyId = `69bacea93772df3673fb6f57`, customerId = `skynet`
- These are for the staging environment. Production will differ.

## Edge Cases & Quirks

- **Internal API naming confusion:** `companyId` in mutations often means "property ID", not "company ID"
- `customerId` in insertBuilding is the customer's slug string (e.g., "skynet"), not an ObjectId
- Token (Partner API) is scoped to one company Ã¢ÂÂ you can't cross-query between companies
- Category deletion only works if the category isn't used by any property globally
- GraphQL errors return in the `errors` array, not as HTTP status codes
- Introspection is disabled on both APIs (Apollo Server config)
- `setTenant` is used for both create and update Ã¢ÂÂ presence of `_id` field determines which
- `insertSite` is the underlying mutation for ALL site types (spaces, equipment, floors) Ã¢ÂÂ `modelType` controls what type is created
- Floor `_id` in upsertFloors should be `dummy_id_N` for new floors; server generates real IDs
- The internal API uses the same `/graphql` endpoint for all operations; operationName helps with debugging

## Known Issues & Workarounds (updated 2026-03-19)

- **~~Spaces/equipment created without floor assignment~~ SOLVED:** Use `changeSitesLocation` after `insertSite`. See mutation docs above. Batch all siteIds per floor into one call.
- **Contact-tenant linking:** `ContactInput` requires `locations: []` but the format for assigning to a tenant is not `{ tenantId }`. Need to capture `ContactLocationInput` fields from UI.
- **Leasable spaces work:** Setting `modelType: "leasable_site"` correctly creates leasable spaces.
- **`companies` query requires pagination:** Must pass `limit: Int!` and `skip: Int!`. Response is nested: `data.companies.companies[]`. No `total` field on `PaginatedCompanies`.
- **Duplicate names:** When creating multiple entities with the same name (e.g., "ÃÂ©ÃÂÃÂ¨ÃÂÃÂªÃÂÃÂ" on different floors), track IDs carefully Ã¢ÂÂ `allSites` won't distinguish them by name alone. Use creation order or query after creation to map correctly.

---

## Visitors API Ã¢ÂÂ discovered 2026-03-21

### createVisitor
Creates a visitor pass. Used for both "Existing contact" and "Not a contact" modes.
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
**Variables Ã¢ÂÂ "Not a contact" mode** (host is not in the contacts list):
```json
{
  "input": {
    "companyId": "PROPERTY_ID",
    "tenantId": "TENANT_ID",
    "firstName": "Visitor First",
    "lastName": "Visitor Last",
    "startDate": "2026-03-21",
    "arrivalTime": { "isAllDay": true }
  }
}
```
**Variables Ã¢ÂÂ "Existing contact" mode** (host is a registered contact):
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
**Optional fields:** `email`, `comment`, `endDate` (for multi-day visits).

**`arrivalTime: CreateVisitorArrivalTimeInput!`** Ã¢ÂÂ REQUIRED. Use `{ isAllDay: true }` for all-day. Specific time: likely `{ isAllDay: false, startTime: "09:00", endTime: "17:00" }` (TBD Ã¢ÂÂ capture from UI).

**Permissions note:** Returns `Unauthorized` if logged-in user doesn't have visitor management rights for that property.

**Useful query Ã¢ÂÂ visitors list:**
```graphql
query visitors($input: VisitorsSearchInput!) {
  visitors(input: $input) { ... }
}
```
(Full query shape TBD Ã¢ÂÂ capture via GQL interceptor from `/visitors` page load)

---

## Amenities API Ã¢ÂÂ discovered 2026-03-21

### setAmenity
Create or update an amenity. Same mutation for both. Include `_id` in input to update.
```graphql
mutation setAmenity($input: AmenityInput!) {
  setAmenity(input: $input) {
    ...AmenityItem
  }
}
```
**AmenityItem fields:** `_id, name, buildingId, locationName, defaultAssignedUsers, images, image, description, roomEmailAddress, maxPeopleNumber, bookingTimes { dayOfWeek, timeRanges { start, end, isBillable } }, timeSlotDuration, timeSlotPrice, bookingInAdvanceRule { minInAdvance { enabled, value, unit } }`

**AmenityInput fields** (from form): `name, buildingId, description, maxPeopleNumber, timeSlotDuration, timeSlotPrice, defaultAssignedUserIds, bookingTimes, bookingInAdvanceRule, roomEmailAddress` (exact field names TBD Ã¢ÂÂ capture via GQL interceptor on form submit)

### archiveAmenity
Deletes/archives an amenity.
```graphql
mutation archiveAmenity($amenityId: String!) {
  archiveAmenity(amenityId: $amenityId)
}
```

### updateAmenityBooking
Updates an existing booking (status, time, etc.).
```graphql
mutation updateAmenityBooking($amenityBookingId: String!, $input: UpdateAmenityBookingInput!) {
  updateAmenityBooking(amenityBookingId: $amenityBookingId, input: $input) { _id }
}
```

### bookAmenity / deleteAmenityBooking / cancelAmenityBooking
These mutations exist in the schema but return `GRAPHQL_VALIDATION_FAILED: Invalid query` when called directly. Must be captured via GQL interceptor from the "+ Book amenity" UI flow. Do not probe these directly Ã¢ÂÂ use the UI to trigger them and read from `localStorage._gql_captured`.

### amenities query (list)
```graphql
query amenities($companyId: String!, $skip: Int!, $limit: Int!) {
  amenities(companyId: $companyId, skip: $skip, limit: $limit) {
    amenities { ...AmenityItem  createdAt  locationName }
    hasNext
    totalCount
  }
}
```

---

## TODO: Areas to Expand
- Exact fields for `ContactLocationInput` (to link contacts to tenants)
- How to assign leased spaces to tenants via API (setTenant with locations?)
- Error handling patterns and common error messages
- Pagination patterns for large datasets
- Build a "tear down" script to delete all entities created by the demo script
- Nest sub-spaces under parent spaces via `changeSitesLocation` (same mutation, use parent space ID as `parentSiteId`)
- Full `CreateVisitorInput` fields (especially `arrivalTime` sub-fields for timed visits)
- `bookAmenity` input shape + `AmenityInput` exact field names (capture from UI)
- Document page mutations: `createDocument`, `deleteDocument`, tag mutations

## createAssignment Ã¢ÂÂ CRITICAL Corrections (verified 2026-03-21)

**`completionPolicy: "end_of_unit"` FAILS** Ã¢ÂÂ error: "Missing inspection completion defenition of until end of unit"

Use `completionPolicy: "iso_duration"` + `completionISODuration` instead:
| Frequency | `interval` | `completionISODuration` |
|-----------|-----------|------------------------|
| Daily | `"day"` | `"PT24H"` Ã¢ÂÂ verified |
| Biweekly | `"biweekly"` | `"P14D"` (inferred, unverified) |
| Weekly | `"week"` | `"P7D"` (inferred, unverified) |
| Monthly | `"month"` | `"P1M"` (inferred, unverified) |

**Minimal working createAssignment (verified 2026-03-21):**
```json
{
  "input": {
    "companyId": "PROPERTY_ID",
    "name": "Inspection Name",
    "interval": "day",
    "startDate": "2026-03-21",
    "siteIds": ["SITE_ID"],
    "daysInWeek": [0,1,2,3,4,5,6],
    "completionPolicy": "iso_duration",
    "completionISODuration": "PT24H",
    "plannedInInterval": 1,
    "items": [{ "type": "checkbox", "name": "Check item text" }]
  }
}
```
Simple items: `{ type, name }` objects directly in `items` array Ã¢ÂÂ accepted by server (no `sites_tasks` wrapper needed for basic inspections).

**deleteAssignment returns String! Ã¢ÂÂ no subfields:**
```graphql
mutation { deleteAssignment(assignmentId: "ASSIGNMENT_ID") }
# Ã¢ÂÂ WRONG: { deleteAssignment(...) { _id } }  Ã¢ÂÂ fails
```

**assignment query (single inspection by ID):**
```graphql
query { assignment(assignmentId: "ID") {
  _id name interval completionPolicy completionISODuration plannedInInterval daysInWeek startDate
}}
```

## allUsers query Ã¢ÂÂ verified 2026-03-21
```graphql
query { allUsers(companyId: "PROPERTY_ID") { _id name } }
```

## allCompanies query (alternative to companies) Ã¢ÂÂ verified 2026-03-21
```graphql
query { allCompanies(customerId: "CUSTOMER_SLUG") { _id name } }
```
`allCompanies` = string arg (slug). `companies` = array arg. Both return all properties for a customer.

## Getting Sites per Property Ã¢ÂÂ Correct Approach (2026-03-21)

- `allSites(companyId: ...)` Ã¢ÂÂ Ã¢ÂÂ "Unknown argument"
- `allSites(buildingId: ...)` Ã¢ÂÂ Ã¢ÂÂ "Unknown argument"
- `allSites` no args Ã¢ÂÂ returns empty []
- `allSites(input: { companyId: ... })` Ã¢ÂÂ documented in skill above, may work per-session

**Reliable approach Ã¢ÂÂ query sites via building:**
```graphql
query { building(buildingId: "BUILDING_ID") { _id name sites { _id name } } }
```
Flow: `allBuildings(companyId)` Ã¢ÂÂ get buildingIds Ã¢ÂÂ `building(buildingId) { sites {} }` per building.

## createWorkOrder Ã¢ÂÂ Internal API (verified 2026-03-21)

Work orders are created via the internal API at `/graphql`. Navigate to `/issues` first (or be on a property page) to ensure session context is set to the right property.

**Discovery method:** Intercepted by patching `window.fetch` on the `/issues` page after the page loaded. Apollo cached the ORIGINAL fetch reference at module load, but on this page the reference was live.

```graphql
mutation createWorkOrder($input: CreateWorkOrderInput!) {
  createWorkOrder(input: $input) { _id }
}
```

**Full input Ã¢ÂÂ all discovered fields:**
```json
{
  "input": {
    "buildingId": "BUILDING_ID",
    "description": "Work order description here",
    "tenantId": null,
    "contactIds": [],
    "assignedUserIds": [],
    "checklist": null,
    "defectImages": [],
    "subCategoryId": "",
    "categoryId": "",
    "priority": null,
    "siteId": ""
  }
}
```

**Key notes (2026-03-21):**
- `buildingId` is REQUIRED Ã¢ÂÂ omitting it causes DataLoader error ("The loader.load() function must be called with a value, but got: undefined")
- `description` is the only other required field (`String!`)
- `companyId`/`propertyId`/`locationId` are NOT valid fields Ã¢ÂÂ use `buildingId` instead
- The work order is automatically scoped to the property that owns the building
- Navigate to the property's work orders page first, then fire mutations Ã¢ÂÂ session context matters
- The `/issues/issue/create` URL opens the create dialog directly

**Batch creation script pattern:**
```javascript
const CREATE_WO = `mutation createWorkOrder($input: CreateWorkOrderInput!) {
  createWorkOrder(input: $input) { _id }
}`;
// Get buildingId via: allBuildings(companyId: PROPERTY_ID) { _id }
// Then fire one mutation per work order with 400ms delay
```

## createAutomation Ã¢ÂÂ eventFields format correction (2026-03-21)

The `eventFields` format documented above (`{ companyId, categoryIds }`) is WRONG for the current API. The correct format discovered from Apollo cache inspection:

```json
{
  "input": {
    "eventType": "newIssue",
    "eventFields": [{ "type": "companyId", "_id": "PROPERTY_ID" }],
    "action": "setPriority",
    "actionValue": "\"10\"",
    "isBasedOnOfficeHours": true
  }
}
```

**Confirmed action values:**
- `setDefaultDueDate` Ã¢ÂÂ `actionValue: JSON.stringify({ number: 3, unit: 'days' })` e.g. `'{"number":3,"unit":"days"}'`
- `setPriority` Ã¢ÂÂ `actionValue: JSON.stringify('"10"')` = `'"10"'` (Low), `'"20"'` = Medium, `'"30"'` = High, `'"40"'` = Critical
- `setAssignedUsers` Ã¢ÂÂ `actionValue` = JSON array of user IDs

**Error: "Similar automation exists"** Ã¢ÂÂ The API rejects duplicate automation types per property. Check existing automations before creating.

**Fetch intercept gotcha (2026-03-21):** Apollo caches its fetch reference at module load. Replacing `window.fetch` after load misses Apollo mutations MOST of the time. However, on the `/issues` page, `createWorkOrder` WAS caught by a post-load `window.fetch` override Ã¢ÂÂ possibly because the work order mutation uses a different Apollo link or is batched differently. For `createAutomation`, the override did NOT work. To safely intercept mutations: use `window.__APOLLO_CLIENT__` for cache inspection, and probe input types iteratively with `variables: { input: {} }` error messages.

---

## Documents Mutations (2026-03-21)

### deleteDocuments
```graphql
mutation deleteDocuments($documentIds: [String!]) {
  deleteDocuments(documentIds: $documentIds)
}
```
Variables: `{ documentIds: ["<id>", ...] }` Ã¢ÂÂ accepts array, bulk delete supported.

### createDocumentTag
```graphql
mutation createDocumentTag($companyId: String!, $name: String!) {
  createDocumentTag(companyId: $companyId, name: $name) {
    _id name color documentCount __typename
  }
}
```
Variables: `{ companyId: "...", name: "TagName" }`

### deleteDocumentTag
```graphql
mutation deleteDocumentTag($documentTagId: String!) {
  deleteDocumentTag(documentTagId: $documentTagId)
}
```
Variables: `{ documentTagId: "..." }` Ã¢ÂÂ **NOT** `tagId` or `id`, must be `documentTagId`.

---

## Amenity Booking Mutations (2026-03-21)

### createAmenityBooking
Captured from real UI submit on `/amenity/book`.
```graphql
mutation createAmenityBooking($input: CreateAmenityBookingInput!) {
  createAmenityBooking(input: $input) {
    issue {
      _id
      __typename
    }
    __typename
  }
}
```
Variables:
```json
{
  "input": {
    "contactId": "<String!>",
    "amenityId": "<String!>",
    "comment": "",
    "companyId": "<String!>",
    "bookingRange": {
      "startDate": "2026-03-21T18:00:00.000Z",
      "endDate": "2026-03-21T21:00:00.000Z"
    },
    "customFields": [],
    "type": "tenant_booking"
  }
}
```
Notes:
- `bookingRange` uses ISO timestamps (UTC)
- Slot selection is a RANGE Ã¢ÂÂ click start slot then end slot in UI (range selector, not single)
- `customFields` = empty array if amenity has no booking questions
- `type` is always `"tenant_booking"` from the UI

### updateAmenityBookingStatus
Single mutation handles cancel, approve, and reject.
```graphql
mutation updateAmenityBookingStatus($amenityBookingId: String!, $input: UpdateAmenityBookingStatusInput!) {
  updateAmenityBookingStatus(amenityBookingId: $amenityBookingId, input: $input) {
    _id
    status
    statusText
    ...IssueAmenityBooking
    __typename
  }
}
```
Variables:
```json
{
  "amenityBookingId": "<String!>",
  "input": {
    "status": "canceled",
    "comment": "Reason text"
  }
}
```
Status values: `"canceled"`, `"approved"`, `"rejected"`
- Cancel: requires confirmation dialog with reason Ã¢ÂÂ `comment` field
- `amenityBookingId` = the `_id` on the `amenityBooking` object (NOT the issue `_id`)

---

## Visitor Mutations (2026-03-21)

### deactivateVisitor  
"Cancel permission" button on visitor detail panel.
```graphql
mutation deactivateVisitor($visitorId: String!) {
  deactivateVisitor(visitorId: $visitorId) {
    _id
    __typename
  }
}
```
Variables: `{ visitorId: "<String!>" }`
- Triggered from "Cancel permission" Ã¢ÂÂ confirmation dialog Ã¢ÂÂ Confirm
- Sets visitor status to Expired with today as end date

### deleteVisitor
Exists on server (confirmed via "Invalid query" probe = whitelisted).
UI trigger not found in the visitor list or detail panel Ã¢ÂÂ may be an admin-only action or in a different UI route.
Inferred shape (same pattern as deactivateVisitor):
```graphql
mutation deleteVisitor($visitorId: String!) {
  deleteVisitor(visitorId: $visitorId)
}
```
Variables: `{ visitorId: "<String!>" }` Ã¢ÂÂ **not confirmed from real UI intercept**

---

## Leasable Spaces Ã¢ÂÂ Full Concept Guide (verified 2026-03-21)

### What is a Leasable Space?

A **leasable space** is a space with `modelType: "leasable_site"`. It represents a Suite (commercial) or Residential Unit that a tenant can occupy exclusively.

**Space types:**
- `modelType: "leasable_site"` Ã¢ÂÂ Leasable space Ã¢ÂÂ can be leased or left vacant
- `modelType: "site"` Ã¢ÂÂ Regular space Ã¢ÂÂ common areas, technical rooms, etc.
- `modelType: "equipment"` Ã¢ÂÂ Equipment item

**Leasable space statuses (from UI perspective):**
- **Leased** = a leasable space currently assigned to a tenant with `isLeased: true`
- **Vacant** = a leasable space not assigned to any tenant

**Key rules (from product-release Slack, Aug 2024):**
- A leasable space can only be LEASED by ONE tenant (exclusive)
- A leasable space can be set as AUTHORIZED for other tenants (for work order creation on sub-leased spaces)
- This was confirmed in Jan 2026: "Leasable spaces can still only be leased by a single tenant, but they can now also be set as authorized spaces for other tenants"

### Connecting Tenants to Leasable Spaces

Use `setTenant` mutation with `locations` array:
- `isLeased: true` Ã¢ÂÂ Leased space (exclusive occupancy, primary space for tenant)
- `isLeased: false` Ã¢ÂÂ Authorized space (WO creation rights, not exclusive)

**IMPORTANT**: `setTenant` replaces the ENTIRE tenant Ã¢ÂÂ always include ALL existing locations + contacts.

### tenants (plural) query Ã¢ÂÂ locations field uses NESTED objects (2026-03-21)
The `tenants` plural query returns locations with nested objects (NOT flat fields):
```graphql
query tenants($input: TenantSearchInput!) {
  tenants(input: $input) {
    tenants {
      _id name
      locations {
        site { _id name }
        building { _id }
        isLeased
      }
      contacts { _id }
    }
  }
}
```
**NOTE**: This is DIFFERENT from the `tenant` (singular) query which uses flat `{ buildingId siteId isLeased }`.
If you query locations in the plural `tenants` query using flat fields, you get `GRAPHQL_VALIDATION_FAILED`.

### buildings query Ã¢ÂÂ correct syntax (2026-03-21)
The `buildings` query (NOT `allBuildings`) requires `limit` and `skip`:
```graphql
query { buildings(companyId: "PROPERTY_ID", limit: 10, skip: 0) { buildings { _id name } } }
```
- Returns `PaginatedBuildings { buildings[] }`
- `limit` and `skip` are REQUIRED Ã¢ÂÂ omitting either causes validation error
- The old `allBuildings` pattern in docs above may be outdated Ã¢ÂÂ use `buildings` with pagination args

### allSites for leasable spaces Ã¢ÂÂ use building(buildingId) NOT allSites (2026-03-22)

> Ã¢ÂÂ Ã¯Â¸Â **CORRECTION**: `allSites(input: { buildingId })` causes `GRAPHQL_VALIDATION_FAILED`. `buildingId` is NOT a valid field in `SitesSearchInput`. Use the `building(buildingId)` query instead:

```javascript
// CORRECT way to get leasable spaces for a building
const res = await fetch('/graphql', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    query: `query { building(buildingId: "BUILDING_ID") { sites { _id name modelType } } }`
  })
}).then(r => r.json());
const leasable = res.data.building.sites.filter(s => s.modelType === 'leasable_site');
```

Alternatively, if you're already on the building page in the browser, read from Apollo cache (faster, no extra fetch):
```javascript
const cache = window.__APOLLO_CLIENT__.cache.extract();
const leasable = Object.entries(cache)
  .filter(([k, v]) => k.startsWith('Site:') && v.modelType === 'leasable_site')
  .map(([k, v]) => ({ _id: v._id, name: v.name }));
```

---

## Amenity API (discovered 2026-03-22)

### amenity Ã¢ÂÂ get single amenity
```graphql
query {
  amenity(amenityId: "AMENITY_ID") {
    _id
    name
    description
    maxPeopleNumber
    timeSlotDuration
    timeSlotPrice
    currency
    buildingId
    isActive
    schedule {
      day
      startTime
      endTime
    }
    building { _id name }
    location { _id name }
  }
}
```

### amenities Ã¢ÂÂ get all amenities for a property
```graphql
query {
  amenities(companyId: "COMPANY_ID") {
    amenities {
      _id
      name
      description
      buildingId
      building { _id name }
    }
    totalCount
  }
}
```

### setAmenity Ã¢ÂÂ create or update amenity
Pass `_id` to update an existing amenity; omit `_id` to create new.
```graphql
mutation setAmenity($input: AmenityInput!) {
  setAmenity(input: $input) {
    _id
    name
    buildingId
  }
}
```
**Key input fields** (all from captured network traffic):
```json
{
  "input": {
    "_id": "AMENITY_ID",
    "name": "Rooftop Conference Room",
    "description": "Description text",
    "buildingId": "BUILDING_ID",
    "companyId": "COMPANY_ID",
    "maxPeopleNumber": 20,
    "timeSlotDuration": 30,
    "timeSlotPrice": null,
    "currency": "USD",
    "schedule": [
      { "day": 5, "startTime": "08:00", "endTime": "17:00" },
      { "day": 0, "startTime": "08:00", "endTime": "17:00" }
    ],
    "images": [],
    "isActive": true
  }
}
```
**Schedule `day` values**: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday.

> **CRITICAL**: If you create an amenity with only one day (e.g., Friday=5), it will NOT appear in Visitt+ `/book-amenity` on any other day. Add all required days to the schedule.

### Amenity bookings Ã¢ÂÂ query
Amenity bookings are stored as issues with `type: "amenity_booking"`:
```graphql
query {
  issues(input: { companyId: "COMPANY_ID", type: "amenity_booking" }) {
    issues {
      _id
      status
      amenityBooking { _id amenity { _id name } startTime endTime }
      contact { _id name }
    }
  }
```

---

## Billable Items API (discovered 2026-03-25)

### upsertBillableItem Ã¢ÂÂ create or update

```graphql
mutation upsertBillableItem($input: BillableItemInput!) {
  upsertBillableItem(input: $input) {
    _id companyId type name price currencyCode markup markupUnit chargeCode active taxable __typename
  }
}
```

**Variables (create new):**
```json
{
  "input": {
    "chargeCode": "",
    "type": "material",
    "price": 1.23,
    "name": "Item Name",
    "active": true,
    "taxable": false,
    "currencyCode": "$",
    "markup": 0,
    "markupUnit": "fix_price",
    "companyId": "PROPERTY_ID"
  }
}
```

**Variables (update existing):** Add `"_id": "ITEM_ID"` to the input object.

**Type values:** `material`, `labor`

> **GOTCHA â€“ `active` default:** The Visitt UI modal creates billable items with `active: false` by default. When creating via API, always set `"active": true` explicitly or items won't appear in active lists.

> **GOTCHA â€“ `taxable` toggle:** The Taxable toggle in the UI only appears after a tax rate is configured in Admin > Billing > Tax & Markup for the property. Via API, you can set `"taxable": true` regardless, but it only takes effect if tax is configured.

**Deactivate (no delete mutation available):** Use `upsertBillableItem` with `_id` + `active: false`.

> **CRITICAL:** `deleteBillableItem`, `archiveBillableItem`, `removeBillableItem` are all server-whitelisted and return "Invalid query". Use `active: false` instead.

### billableItems Ã¢ÂÂ query list

```graphql
query billableItems($filters: BillableItemsFilters!, $skip: Int!, $limit: Int!, $sort: String, $sortDirection: SortDirection) {
  billableItems(filters: $filters, skip: $skip, limit: $limit, sort: $sort, sortDirection: $sortDirection) {
    items { _id name type price active currencyCode markup markupUnit chargeCode taxable }
    totalCount
  }
}
```

**Variables:**
```json
{
  "filters": { "companyId": "PROPERTY_ID" },
  "skip": 0,
  "limit": 50,
  "sort": "name",
  "sortDirection": "ASC"
}
```

> **Note:** `sortDirection` uses the `SortDirection` enum type (not `String`). Values: `ASC`, `DESC`.

### Bulk creation pattern

- Use `fetch('/graphql', ...)` from browser console (same-origin, session cookie auth)
- 400ms delay between calls for stability
- Achieved: 34 items in ~14s (2.4 items/s)
- Zero errors at this rate
}
```

