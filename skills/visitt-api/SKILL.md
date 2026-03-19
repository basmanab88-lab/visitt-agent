---
name: visitt-api
description: "Visitt GraphQL API skill for reading and writing data to the Visitt property management platform via API calls. Covers BOTH the internal frontend API and the Partner API. Use this skill whenever the user asks to create, read, update, or delete data in Visitt programmatically — tenants, contacts, work orders, inspections, categories, buildings, floors, spaces, equipment, properties, charges, billable items. Also triggers on: Visitt API, GraphQL, partner API, bulk data operations via API, webhook setup, demo property creation, or when the task would be faster via API than UI (e.g., creating 5+ entities). If the user mentions API, endpoint, query, mutation, or programmatic access to Visitt — use this skill."
---

# Visitt GraphQL API — Operational Guide

## Two APIs Available

Visitt has TWO GraphQL APIs:

### 1. Internal Frontend API (primary for automation)
- **Endpoint:** `https://staging.visitt.io/graphql` (staging) or `https://app.visitt.io/graphql` (production)
- **Auth:** Session cookies (same as logged-in browser session)
- **Scope:** Full access — buildings, floors, spaces, equipment, tenants, contacts, everything
- **Best for:** Browser-based automation via `javascript_tool` (fetch from same origin)
- **Introspection:** Disabled (Apollo Server)

### 2. Partner API (external integrations)
- **Endpoint:** `https://partner-api.visitt.io/graphql`
- **Auth:** Bearer token in Authorization header
- **Scope:** Limited — tenants, contacts, work orders, categories, billing. NO building/floor/space creation.
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
- Speed matters — API calls are faster than UI navigation

Use UI (visitt-workflow skill) when: the task involves visual configuration, settings pages, or workflows not exposed in the API.
Use Import (visitt-import skill) when: the user has a CSV file ready or the task is a one-time bulk data load.

## Internal API — Discovered Mutations (verified 2026-03-17)

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
- `"site"` — regular space (base building space)
- `"leasable_site"` — leasable space (can be assigned to tenants)
- `"equipment"` — equipment item
- `"floor"` — floor (but use upsertFloors instead)

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
- `parentSiteId` is the floor's site ID (from `upsertFloors` response — same IDs)
- You can pass multiple `siteIds` in one call — **batch all entities per floor into one call** for efficiency
- Requires all 3 parameters (`buildingId`, `parentSiteId`, `siteIds`) — omitting `buildingId` causes silent failure
- Also works for nesting sub-spaces under parent spaces (set `parentSiteId` to the parent space ID)

**Optimal deployment flow (verified 2026-03-19):**
```
1. insertBuilding       → get buildingId
2. upsertFloors         → get floor IDs
3. insertSite ×N        → create all spaces/equipment (batch with concurrency 5, delay 400ms)
4. changeSitesLocation  → one call PER FLOOR to assign entities (batch siteIds per floor)
```
Performance: 49 entities created in 6.3s + floor assignment in 3.2s = ~10s total.

### setTenant
Creates or updates a tenant.
```graphql
mutation setTenant($input: TenantInput!) {
  setTenant(input: $input) {
    _id
    name
  }
}
```
**Variables (create):**
```json
{
  "input": {
    "companyId": "PROPERTY_ID",
    "name": "Tenant Company Name",
    "locations": []
  }
}
```
Note: `setTenant` is used for BOTH create and update. Include `_id` field to update existing.

### addContacts
Creates one or more contacts. Contacts are created at the property level and can be linked to tenants separately.
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
**Variables:**
```json
{
  "input": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+972501234567",
      "companyId": "PROPERTY_ID",
      "locations": []
    }
  ]
}
```
**Important:** `locations` is required (`[ContactLocationInput!]!`) — use empty array `[]` if no location assignment.
`tenantId` is NOT a direct field on ContactInput. Tenant assignment uses the `locations` array with `ContactLocationInput` (exact fields TBD — need to capture from UI).
`roles` is NOT a valid field on ContactInput either.
Batch creation: pass multiple objects in the `input` array to create several contacts at once.

### Other useful mutations discovered in code:
- `updateBuilding` — UpdateBuildingInput!
- `updateSite` — siteId: String!, input: UpdateSiteInput!
- `deleteSites` — deletes spaces/equipment
- `archiveBuilding` — buildingId, companyId, isAutoResolve
- `changeSitesBuilding` — move sites between buildings
- `changeSitesLocation` — move sites between floors
- `updateContact` — contactId: String!, input: ContactInput!
- `archiveContact` / `unarchiveContact` — contactId: String!
- `deleteTenant` — tenantId: String!
- `makeSpacesLeasable` (updateSitesModelType) — siteIds: [String]!, modelType: String!

## Internal API — Key Queries

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

The token is scoped to a single company. It's provided by Visitt and must be kept secret — never log it, commit it, or expose it.

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
- Account → has categories
- Property → has assigned categories (subset of account categories)
- Categories can have subcategories (e.g., "Plumbing" → "Leak", "Clogged Drain")

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

Each token has per-operation rate limits. File upload is limited to 20 requests per 60 seconds. Plan batch operations accordingly — add delays between large batches.

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

## Demo Property Setup via API — Full Flow

This is the sequence for creating a complete demo property setup using the internal API:

```
1. insertBuilding  → get buildingId
2. upsertFloors    → create all floors at once (get floor IDs from response)
3. insertSite ×N   → create spaces on each floor (modelType: "site")
4. insertSite ×N   → create equipment on each floor (modelType: "equipment")
5. setTenant ×N    → create tenants (get tenant IDs)
6. addContacts     → create contacts linked to tenants
```

**Estimated time:** ~10-20 seconds for a full property (vs 40-50 minutes via UI).

**Important IDs to know:**
- Skynet customer: companyId = `69bacea93772df3673fb6f57`, customerId = `skynet`
- These are for the staging environment. Production will differ.

## Edge Cases & Quirks

- **Internal API naming confusion:** `companyId` in mutations often means "property ID", not "company ID"
- `customerId` in insertBuilding is the customer's slug string (e.g., "skynet"), not an ObjectId
- Token (Partner API) is scoped to one company — you can't cross-query between companies
- Category deletion only works if the category isn't used by any property globally
- GraphQL errors return in the `errors` array, not as HTTP status codes
- Introspection is disabled on both APIs (Apollo Server config)
- `setTenant` is used for both create and update — presence of `_id` field determines which
- `insertSite` is the underlying mutation for ALL site types (spaces, equipment, floors) — `modelType` controls what type is created
- Floor `_id` in upsertFloors should be `dummy_id_N` for new floors; server generates real IDs
- The internal API uses the same `/graphql` endpoint for all operations; operationName helps with debugging

## Known Issues & Workarounds (updated 2026-03-19)

- **~~Spaces/equipment created without floor assignment~~ SOLVED:** Use `changeSitesLocation` after `insertSite`. See mutation docs above. Batch all siteIds per floor into one call.
- **Contact-tenant linking:** `ContactInput` requires `locations: []` but the format for assigning to a tenant is not `{ tenantId }`. Need to capture `ContactLocationInput` fields from UI.
- **Leasable spaces work:** Setting `modelType: "leasable_site"` correctly creates leasable spaces.
- **`companies` query requires pagination:** Must pass `limit: Int!` and `skip: Int!`. Response is nested: `data.companies.companies[]`. No `total` field on `PaginatedCompanies`.
- **Duplicate names:** When creating multiple entities with the same name (e.g., "שירותים" on different floors), track IDs carefully — `allSites` won't distinguish them by name alone. Use creation order or query after creation to map correctly.

## TODO: Areas to Expand
- Exact fields for `ContactLocationInput` (to link contacts to tenants)
- How to assign leased spaces to tenants via API (setTenant with locations?)
- Error handling patterns and common error messages
- Pagination patterns for large datasets
- Build a "tear down" script to delete all entities created by the demo script
- Nest sub-spaces under parent spaces via `changeSitesLocation` (same mutation, use parent space ID as `parentSiteId`)
