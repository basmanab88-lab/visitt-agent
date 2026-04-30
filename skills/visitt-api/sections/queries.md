# Visitt API — Core Queries & Patterns

---
name: visitt-api
description: "Visitt GraphQL API skill for reading and writing data to the Visitt property management platform via API calls. Covers BOTH the internal frontend API and the Partner API. Use this skill whenever the user asks to create, read, update, or delete data in Visitt programmatically Ã¢ÂÂ tenants, contacts, work orders, inspections, categories, buildings, floors, spaces, equipment, properties, charges, billable items. Also triggers on: Visitt API, GraphQL, partner API, bulk data operations via API, webhook setup, demo property creation, or when the task would be faster via API than UI (e.g., creating 5+ entities). If the user mentions API, endpoint, query, mutation, or programmatic access to Visitt Ã¢ÂÂ use this skill."

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

### allSites (flat list of all spaces for a property) Ã¢ÂÂ verified 2026-03-20
query allSites($input: SitesSearchInput) {
  allSites(input: $input) {
    type
**Variables:** `{ "input": { "companyId": "PROPERTY_ID" } }`

> Ã¢ÂÂ Ã¯Â¸Â **CRITICAL (2026-03-22):** `allSites` does NOT accept `buildingId` in the input Ã¢ÂÂ passing it causes `GRAPHQL_VALIDATION_FAILED`. To get sites for a specific building, use the `building(buildingId)` query below instead.

Used to populate space selectors in tenant locations, inspections, etc.

### building (get sites for a specific building) Ã¢ÂÂ verified 2026-03-22
Use this when you need leasable or regular spaces scoped to one building.
query {
  building(buildingId: "BUILDING_ID") {
    sites {
      _id
      name
      modelType
    }
Returns ALL sites in that building (all modelTypes). Filter client-side by `modelType === "leasable_site"` to get leasable spaces. This is the correct alternative to `allSites(input: { buildingId })` which does not work.

### companies (get all properties for a customer) Ã¢ÂÂ verified 2026-03-20
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


## allUsers query Ã¢ÂÂ verified 2026-03-21
query { allUsers(companyId: "PROPERTY_ID") { _id name } }

## allCompanies query (alternative to companies) Ã¢ÂÂ verified 2026-03-21
query { allCompanies(customerId: "CUSTOMER_SLUG") { _id name } }
`allCompanies` = string arg (slug). `companies` = array arg. Both return all properties for a customer.

## Getting Sites per Property Ã¢ÂÂ Correct Approach (2026-03-21)

- `allSites(companyId: ...)` Ã¢ÂÂ Ã¢ÂÂ "Unknown argument"
- `allSites(buildingId: ...)` Ã¢ÂÂ Ã¢ÂÂ "Unknown argument"
- `allSites` no args Ã¢ÂÂ returns empty []
- `allSites(input: { companyId: ... })` Ã¢ÂÂ documented in skill above, may work per-session

**Reliable approach Ã¢ÂÂ query sites via building:**
query { building(buildingId: "BUILDING_ID") { _id name sites { _id name } } }
Flow: `allBuildings(companyId)` Ã¢ÂÂ get buildingIds Ã¢ÂÂ `building(buildingId) { sites {} }` per building.




### companies — query list (updated 2026-04-01)

The `companies` query is now paginated and requires `limit`/`skip`:

query companies($limit: Int!, $skip: Int!, $search: String) {
  companies(limit: $limit, skip: $skip, search: $search) {
    totalCount

**Variables:** `{ "limit": 50, "skip": 0, "search": "property name" }`

> Use `search` to find properties by name. Without it, returns all properties (hundreds).

### assignUserAccess — add user to a property (verified 2026-03-29, PRODUCTION)

Assigns an existing user to one or more companies (properties). **ADDITIVE** — does not replace existing assignments. Safe to run even if user already has the property.

mutation assignUserAccess($userId: String!, $companyIds: [String!], $propertyGroupIds: [String!], $customerId: String) {
  assignUserAccess(userId: $userId, companyIds: $companyIds, propertyGroupIds: $propertyGroupIds, customerId: $customerId) {
    _id name companies { _id name } __typename
  "userId": "USER_MONGO_ID",
  "companyIds": ["COMPANY_MONGO_ID"],
  "propertyGroupIds": [],
  "customerId": null
- Pass one companyId per call for safety (or an array for bulk).
- `propertyGroupIds` can be `[]`, `customerId` can be `null`.
- Equivalent to UI: Property → Users → Add Existing User.
- Response includes the user's full updated companies list.

### allUsers query — get all users for a customer (verified 2026-03-29)

{ customer(customerId: "CUSTOMER_SLUG") { allUsers(withDisabled: false) { _id name companies { _id name } } } }
- Use `withDisabled: true` to include inactive/disabled users (e.g. `Elizabeth Mavrogenes (Inactive)`).
- Total count: `allUsersCount` field on customer object.
- The `companies` field on each user lists all properties they currently have access to.

### Apollo cache — extract data without network call (verified 2026-03-29)

When Apollo serves data from cache (no new network request made), access it via:
const cache = window.__APOLLO_CLIENT__.cache.data.data;
// All User objects:
const users = Object.entries(cache).filter(([k]) => k.startsWith('User:')).map(([,v]) => v);
// Customer's allUsers list (refs):
const rootQuery = cache['ROOT_QUERY'];
const customerRef = rootQuery['customer({"customerId":"hiffman_national"})']?.__ref;
const customerData = cache[customerRef];
const userRefs = customerData?.['allUsers({"withDisabled":false})'];
Note: `window.__APOLLO_CLIENT__` is available globally in the Visitt SPA.

### How to discover the correct mutation (fetch interceptor pattern)

When unsure which mutation a UI action calls:
const origFetch = window.fetch;
window.fetch = async (...args) => {
  if (args[0]?.includes?.('graphql')) {
    try { console.log('GQL:', JSON.parse(args[1]?.body)); } catch {}
  return origFetch(...args);
};
// Now perform the action in the UI — the mutation name appears in the console


### issuesCount — count work orders with filters (verified 2026-04-30)
```graphql
{ issuesCount(input: { companyId: "PROPERTY_ID" }) }
{ issuesCount(input: { companyId: "PROPERTY_ID", categoryId: "CAT_ID" }) }
{ issuesCount(input: { companyId: "PROPERTY_ID", subCategoryId: "SUBCAT_ID" }) }
```
- Returns a plain integer (not paginated, not nested)
- `IssuesSearchInput!` is required — query fails without `input`
- `categoryIds` array is NOT valid — use `categoryId` (singular)
- `openIssuesCount` also works but has no filters (returns global count)
- Discovered from browser console at /company/PROPERTY_ID/issues page

### Category audit pattern — check existing categories across properties (2026-04-30)
Use `allCategories(companyId)` + `issuesCount(input: { companyId, categoryId })` to audit:
1. Fetch categories per property: `allCategories(companyId: "ID") { _id name subCategories { _id name } }`
2. Build flat map: category name → { id, type: root/sub, parentName }
3. For each target category, do fuzzy match against the map
4. Get WO count per matched category via `issuesCount`
- Use parallel Promise.all for step 4 (29 fetches completed fast)
- `companies(limit, skip, search: "keyword")` is the correct way to find properties by name
- `allCompanies(customerId: "slug")` returns [] if slug is wrong — use `companies` with search instead
