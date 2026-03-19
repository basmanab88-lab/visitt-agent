---
name: visitt-api
description: >
  Visitt GraphQL API skill for reading and writing data to the Visitt property
  management platform via API calls. Covers BOTH the internal frontend API and
  the Partner API. Use this skill whenever the user asks to create, read, update,
  or delete data in Visitt programmatically — tenants, contacts, work orders,
  inspections, categories, buildings, floors, spaces, equipment, properties,
  charges, billable items. Also triggers on: Visitt API, GraphQL, partner API,
  bulk data operations via API, webhook setup, demo property creation, or when
  the task would be faster via API than UI (e.g., creating 5+ entities). If the
  user mentions API, endpoint, query, mutation, or programmatic access to Visitt
  — use this skill.
---

# Visitt GraphQL API — Operational Guide

## Two APIs Available

### 1. Internal Frontend API (primary for automation)
- **Endpoint:** `https://staging.visitt.io/graphql` (staging) or `https://app.visitt.io/graphql` (production)
- **Auth:** Session cookies (same as logged-in browser session)
- **Scope:** Full access — buildings, floors, spaces, equipment, tenants, contacts, everything
- **Best for:** Browser-based automation via `javascript_tool`

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

## Internal API — Discovered Mutations

### insertBuilding
```graphql
mutation insertBuilding($input: InsertBuildingInput!) {
  insertBuilding(input: $input) { _id }
}
```
Variables: `{ input: { companyId: "PROPERTY_ID", customerId: "CUSTOMER_SLUG", name: "...", address: "...", size: 12000 } }`

Note: `companyId` is the property ID (confusing naming). `customerId` is the customer's slug.

### upsertFloors
```graphql
mutation upsertFloors($input: UpsertFloorsInput!) {
  upsertFloors(input: $input) { _id }
}
```
Variables: `{ input: { buildingId: "...", floors: [{ _id: "dummy_id_0", name: "Ground Floor", level: 0 }] } }`

**CRITICAL:** Use `dummy_id_N` format for new floors. Other formats silently fail.

### insertSite (spaces, equipment, subspaces)
```graphql
mutation insertSpace($input: InsertSiteInput!) {
  insertSite(input: $input) { _id }
}
```
modelType values: `"site"`, `"leasable_site"`, `"equipment"`

**CRITICAL:** `insertSite` does NOT assign spaces to floors. Must call `changeSitesLocation` after creation.

### changeSitesLocation (assign to floors)
```graphql
mutation changeSitesLocation($buildingId: String!, $parentSiteId: String!, $siteIds: [String!]!) {
  changeSitesLocation(buildingId: $buildingId, parentSiteId: $parentSiteId, siteIds: $siteIds) { _id }
}
```
Batch all siteIds per floor into one call for efficiency. Also works for nesting sub-spaces.

### setTenant
```graphql
mutation setTenant($input: TenantInput!) {
  setTenant(input: $input) { _id name }
}
```
Used for BOTH create and update. Include `_id` field to update existing.

### addContacts
```graphql
mutation addContacts($input: [ContactInput!]!) {
  addContacts(input: $input) { _id name email phone }
}
```
`locations` is required — use empty array `[]` if no location assignment.

### Other mutations
- `updateBuilding`, `updateSite`, `deleteSites`, `archiveBuilding`
- `changeSitesBuilding`, `updateContact`, `archiveContact`, `deleteTenant`
- `makeSpacesLeasable` (updateSitesModelType)

## Optimal Deployment Flow

```
1. insertBuilding       → get buildingId
2. upsertFloors         → get floor IDs
3. insertSite ×N        → create all spaces/equipment (batch concurrency 5, delay 400ms)
4. changeSitesLocation  → one call PER FLOOR to assign entities
```

## Partner API Basics

```bash
curl -X POST https://partner-api.visitt.io/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: <PARTNER_API_TOKEN>" \
  -d '{"query": "{ buildings { id name } }"}'
```

### Available Partner API Operations

**Queries:** property, buildings, tenants, contacts, requests, workOrders, inspections, categories, charges, billableItems, users, webhookEventTypes

**Mutations:** createTenant, updateTenant, deleteTenant, createContact, updateContact, createRequest, createWorkOrder, updateWorkOrder, createInspection, createCategory, updateCategory, assignCategory, unassignCategory, createBillableItem, updateBillableItem, createWebhook, updateWebhook

## Edge Cases & Quirks

- `companyId` in mutations often means "property ID", not "company ID"
- `customerId` in insertBuilding is the customer's slug string, not an ObjectId
- Partner API token is scoped to one company
- Category deletion only works if globally unused
- GraphQL errors return in `errors` array, not as HTTP status codes
- Introspection is disabled on both APIs
- `insertSite` is the underlying mutation for ALL site types
- Floor `_id` in upsertFloors must be `dummy_id_N` for new floors
