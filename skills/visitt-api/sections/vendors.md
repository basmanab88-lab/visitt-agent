# Visitt API — Vendors

## Vendors API (discovered 2026-03-29)

> **MODULE DISTINCTION — CRITICAL:** Visitt has two completely separate modules:
> - **Tenants module** → `setTenant` / `deleteTenant` mutations → `/tenants` page
> - **Vendors module** → `setVendor` / `deleteVendor` mutations → `/vendors` page
>
> When a property has the **Vendors feature flag ON**, use `setVendor`. Using `setTenant` creates records in the wrong module (Tenants list), and nothing will appear under Vendors.

### setVendor — create or update

```graphql
mutation setVendor($input: VendorInput!) {
  setVendor(input: $input) {
    _id
    name
  }
}
```

**Variables:**
```json
{
  "input": {
    "companyId": "PROPERTY_ID",
    "name": "Vendor Company Name",
    "contactName": "Contact Person Name",
    "email": "email@domain.com",
    "phone": "+14051234567",
    "profession": "",
    "notes": "",
    "coiRequirementsId": ""

> **CRITICAL — Phone format:** The `phone` field requires **E.164 format** (e.g., `+14051234567`). Passing a raw US number like `(405)318-4086` returns `"Invalid phone: (405)318-4086"`. Always normalize before calling.

**Phone E.164 formatter:**
```javascript
const fmtPhone = (p) => {
  if (!p || p === '—') return '';
  const digits = p.replace(/\D/g, '');
  if (!digits) return '';
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
};

**Vendor with no contact:** Pass empty strings for `contactName`, `email`, `phone`. The API accepts this — the vendor will appear in the list without contact info.

**Update existing vendor:** Pass `"vendorId": "VENDOR_ID"` inside the input object. Do NOT use `_id` — the field is called `vendorId` in VendorInput. Using `_id` returns `"Field '_id' is not defined by type VendorInput"`. (discovered 2026-04-01)

### deleteVendor — remove

mutation deleteVendor($id: ID!) {
  deleteVendor(id: $id)

**Variables:** `{ "id": "VENDOR_ID" }`

### vendors — query list (updated 2026-04-01)

The `vendors` query now returns `PaginatedVendors` and requires `limit`/`skip`. The `companyId` type is `String!` not `ID!`.

query vendors($companyId: String!, $limit: Int!, $skip: Int!, $search: String) {
  vendors(companyId: $companyId, limit: $limit, skip: $skip, search: $search) {
    vendors {
      _id
      name
      contactName
      email
      phone
      profession
      notes
    }
    totalCount
    hasNext

**Variables:** `{ "companyId": "PROPERTY_ID", "limit": 40, "skip": 0 }`

> **CRITICAL — Old query format is BROKEN:** Using `vendors(companyId: ID!)` without `limit`/`skip` returns `"Unknown type 'ID'"` and `"Cannot query field '_id' on type 'PaginatedVendors'"`. Always use the paginated format above.

### Bulk creation pattern

const gql = (query, variables) =>
  fetch('/graphql', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  }).then(r => r.json());


const setVendor = async (companyId, name, contactName, email, phone) => {
  const res = await gql(
    `mutation setVendor($input: VendorInput!) { setVendor(input: $input) { _id name } }`,
    { input: { companyId, name, contactName: contactName||'', email: email||'',
               phone: fmtPhone(phone), profession:'', notes:'', coiRequirementsId:'' } }
  );
  const id = res?.data?.setVendor?._id;
  return { ok: !!id, name, err: id ? null : JSON.stringify(res?.errors) };

// Loop with delay
const delay = ms => new Promise(r => setTimeout(r, ms));
const results = [];
for (const v of vendors) {
  const r = await setVendor(v.companyId, v.name, v.contactName, v.email, v.phone);
  results.push(r);
  await delay(400);
console.log('Done:', results.filter(r=>r.ok).length + '/' + results.length);

- 400ms delay between calls, 0 errors
- Achieved: ~57 vendors across 8 properties (batch run 2026-03-29)

### Bulk profession update pattern (discovered 2026-04-01)

To update profession for existing vendors across multiple properties, use `vendorId` in the input (NOT `_id`):

const updateVendorProfession = async (companyId, vendor, profession) => {
    `mutation setVendor($input: VendorInput!) { setVendor(input: $input) { _id name profession } }`,
    { input: {
        vendorId: vendor._id,  // ← MUST be vendorId, not _id
        companyId,
        name: vendor.name,
        contactName: vendor.contactName || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        profession,
        notes: vendor.notes || ''
    }}
  return res?.data?.setVendor;

> **Gotcha — name matching:** When vendor names in Visitt differ slightly from the data source (e.g., "Goforth Plumbing and Mechanical, LLC" vs "Goforth Plumbing and Mechanical"), the exact match will fail. After bulk update, always check for vendors with empty profession and fix manually.
> **Performance:** Promise.all works fine for batch updates within a single property (~7-19 vendors). Achieved: 71 vendors across 9 properties in ~5 seconds total (2026-04-01).

