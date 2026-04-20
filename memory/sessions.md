# Visitt Agent — Session Log

Append-only log of Visitt work sessions. Newest at top.
Read this file ONLY when Basman says "מה עשינו בסשן האחרון" or "המשך מאיפה שעצרנו".

---

## 2026-04-20 — Visitt: Tenants + Contacts for קרסו חדרה (DONE)

- **Property**: קרסו חדרה (companyId: `68db9312c6dcec3d08b55c26`) - production
- **Source**: Task Hub item 11733349967 → Implementation Board 11708703019. Customer (Eyal) delivered names only (image with tenant+contact columns). No phones, no emails, no space assignments.
- **Task**: Create 16 tenants + 15 contacts (א א סלולר has no contact). No location linkage (customer didn't mark).
- **Status**: DONE. Pilot on מאמונה+ליאורה verified `phone:""`/`email:""` accepted (returns null), then batch of 15 remaining tenants ran clean with 400ms delay. 0 failures.
- **Verification**: `tenants(input: {companyId})` query → 16 tenants, 15 contacts, all names match image, all contact→tenant links correct.
- **Pattern documented**: tenants-contacts.md → "Tenants + Contacts WITHOUT phone/email" section. Key: tenant-then-contact flow beats trying to pass contacts[] in setTenant for new contacts (those need pre-existing _ids).
- **Total mutations**: 31 (16 setTenant + 15 addContacts). ~15 seconds end-to-end.
- **Saved to**: visitt-agent/skills/visitt-api/sections/tenants-contacts.md (new section at bottom).

---

## 2026-04-12 — Arlington Full Building Deploy (SKYNET / T800 Staging, 427 equipment items)

**Summary:** Deployed new building Arlington into Visitt Staging for SKYNET/T800. Full hierarchy: building → floors → spaces → sub-spaces → 427 equipment items with all fields.

**Key fix discovered:** `insertSite` argument is `input:` not `site:` — using `site:` causes GRAPHQL_VALIDATION_FAILED on every item.

**Pattern:** localStorage chunking (9 × 50 items), background async IIFE, poll localStorage for results.

**buildingId:** `69db9e51cf3b61d30e0bef61`

---
