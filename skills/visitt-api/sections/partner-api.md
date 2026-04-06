# Visitt API — Partner API

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
| `createRequest` | Create a new maintenance request |
| `createWorkOrder` | Create a work order (supports file attachments) |
| `updateWorkOrder` | Update work order details |
| `createInspection` | Create a new inspection |

### Categories
| `createCategory` | Create new category/subcategory and assign to property |
| `updateCategory` | Update category name/color |
| `assignCategory` | Add existing account category to a property |
| `unassignCategory` | Remove category from property (keeps in account) |
| `deleteCategory` | Permanently delete category (only if globally unused) |

### Billing
| `createBillableItem` | Create a billable item |
| `updateBillableItem` | Update a billable item |
| `updateCharges` | Update charges |

### Webhooks
| `createWebhook` | Subscribe to event types |
| `updateWebhook` | Update webhook configuration |

