# HandyMan Bot — Full Context for Claude Code

**Last updated:** 2026-04-07  
**Project:** T-800 WhatsApp AI (zoggqromyofejskezjhc.supabase.co)  
**Repo:** basmanab88-lab/visitt-agent (this file)

---

## What This Is

HandyMan is a WhatsApp bot for Eylon, a contractor. He sends informal Hebrew messages to log expenses and client activity. The bot writes everything to Google Sheets.

It runs on the **same Supabase edge function** as T-800 (`whatsapp/index.ts`), routed by phone number.

---

## Current State (as of 2026-04-07)

### ✅ Done
- `users_wa` table in Supabase — routes by phone to 't800' or 'handyman'
- `usage_log` table — logs every Claude API call (tokens_in, tokens_out, cost_usd)
- `handyman_sessions` table — tracks current_client per user, clears after 4h
- `whatsapp/index.ts` — updated router: looks up users_wa, branches to T-800 or HandyMan
- `handyman/handler.ts` — classification + session logic + usage logging
- `handyman/sheets.ts` — Google Sheets CRUD (auto-creates spreadsheet on first use)
- `/handyman-test` page + `/api/handyman-test` route — test console UI

### ❌ Not Done / Broken
- **Handler uses claude-haiku-3-5** — too weak for informal Hebrew. Returns UNKNOWN on compound messages.
- **Single classification fails** — real messages contain 2-3 actions. Must return `actions[]` array.
- **Dashboard** at `/dashboard` — not built yet.

---

## Seeded Users

```
phone: '972505201083'  name: 'Basman'  system: 't800'
phone: '972526885208'  name: 'Eylon'   system: 'handyman'
```

---

## Supabase Secrets (already saved)

- `WA_ACCESS_TOKEN` — WhatsApp permanent system user token
- `WA_PHONE_NUMBER_ID` — currently test number (1059511340580899)
- `GOOGLE_SERVICE_ACCOUNT_JSON` — Google service account for Sheets API
- `HANDYMAN_SHEET_ID` — auto-created on first message (if not yet set, handler creates it)

---

## Google Sheets Structure

Spreadsheet name: "HandyMan - הוצאות איילון"  
Auto-shared with: basmanab88@gmail.com

| Tab | Purpose |
|-----|---------|
| `הוצאות כלליות` | Expenses not linked to a client |
| `לקוחות` | Master client list (one row per client, never duplicated) |
| `תנועות לקוחות` | All client transactions (expenses + payments, many rows per client) |
| `סיכום לקוחות` | SUMIF formulas — auto-calculated balances per client |

---

## The Bug That Needs Fixing — PRIORITY

**Problem:** Classification returns UNKNOWN for compound messages.

**Root cause 1:** Using claude-haiku-3-5. Too weak for informal Hebrew.  
**Root cause 2:** Architecture returns a single `type` — but real messages have multiple actions.

**Fix required in `handyman/handler.ts`:**

1. Switch model to `claude-sonnet-4-5` everywhere in handler
2. Replace single-type classification with multi-action extraction:

```typescript
// NEW prompt returns actions array:
{
  actions: [
    {
      type: 'GENERAL_EXPENSE' | 'CLIENT_EXPENSE' | 'CLIENT_PAYMENT' | 
            'CLIENT_QUERY' | 'ADD_CLIENT' | 'UNKNOWN',
      amount: number | null,
      currency: '₪' | '$' | null,
      description: string | null,
      client_name: string | null,
      client_phone: string | null  // for ADD_CLIENT
    }
  ]
}
```

3. Loop over `actions[]` and execute each one
4. Collect replies into single response message

**Example that must work:**
```
Input:  "נתלי כהן 052-1234567 טיח שילמה 600 עלה לי חומרים 100"
Output: actions = [
  { type: 'ADD_CLIENT', client_name: 'נתלי כהן', client_phone: '052-1234567' },
  { type: 'CLIENT_PAYMENT', amount: 600, client_name: 'נתלי כהן' },
  { type: 'CLIENT_EXPENSE', amount: 100, description: 'חומרים', client_name: 'נתלי כהן' }
]
Reply: "✅ הוספתי לקוח: נתלי כהן\n✅ נתלי כהן שילמה 600₪\n✅ רשמתי: חומרים 100₪ עבור נתלי כהן"
```

---

## System Prompt for Claude (to use in handler)

```
You are helping Eylon, an Israeli contractor, log expenses and client activity.
He sends informal Hebrew WhatsApp messages.

Extract ALL actions from his message. A single message can contain multiple actions.

Return ONLY valid JSON:
{
  "actions": [
    {
      "type": "GENERAL_EXPENSE | CLIENT_EXPENSE | CLIENT_PAYMENT | CLIENT_QUERY | ADD_CLIENT | UNKNOWN",
      "amount": number or null,
      "currency": "₪" or "$" or null,
      "description": string or null,
      "client_name": string or null,
      "client_phone": string or null
    }
  ]
}

Examples:
"נתלי כהן 052-1234567 טיח שילמה 600 עלה לי חומרים 100"
→ [ADD_CLIENT(נתלי כהן, 052-1234567), CLIENT_PAYMENT(600, נתלי כהן), CLIENT_EXPENSE(100, חומרים, נתלי כהן)]

"קניתי ברגים ב-50"
→ [GENERAL_EXPENSE(50, ברגים)]

"כמה חייב לי דוד?"
→ [CLIENT_QUERY(דוד)]

"עשיתי עבודה אצל דוד היום 300 שקל, פועל עלה לי 200"
→ [CLIENT_EXPENSE(300, עבודה, דוד), CLIENT_EXPENSE(200, פועל, דוד)]

"תוסיף לקוח: נתלי כהן 052-111"
→ [ADD_CLIENT(נתלי כהן, 052-111)]
```

---

## Client Resolution Logic

When `client_name` is in an action:
1. Call `getClients()` from sheets.ts
2. Filter by partial match, case-insensitive
3. If 0 matches → "לא מצאתי לקוח בשם X. תוסיף אותו קודם"
4. If 1 match → use it ✅
5. If 2+ matches → reply with numbered list, set `awaiting_clarification: true` in session
6. If `awaiting_clarification: true` → treat message as client selection (number or name)

Session context: if no client in message but session has `current_client` (< 4h old) → use it automatically.

---

## Usage Pricing

```
claude-sonnet-4-5:
  input:  $3 / 1M tokens
  output: $15 / 1M tokens
  cost_usd = (tokens_in * 3 + tokens_out * 15) / 1_000_000
```

---

## Still To Build

### Dashboard at `/dashboard`

Page at `app/dashboard/page.tsx`:
- Table: user | system | messages this month | cost this month | total cost
- Query: GROUP BY user_phone, system, DATE_TRUNC('month', created_at) FROM usage_log
- Total cost this month shown at top
- Hebrew RTL, Tailwind, no auth needed (obscure URL)

---

## Architecture Overview

```
WhatsApp message arrives
    → whatsapp/index.ts
    → lookup users_wa by phone
    → system = 't800'   → handleT800() [unchanged]
    → system = 'handyman' → handleHandyMan()
        → load handyman_sessions (current_client, awaiting_clarification)
        → call claude-sonnet-4-5 with multi-action prompt
        → log to usage_log
        → loop over actions[]:
            ADD_CLIENT     → sheets.appendClient()
            GENERAL_EXPENSE → sheets.appendGeneralExpense()
            CLIENT_EXPENSE  → resolve client → sheets.appendClientTransaction('הוצאה')
            CLIENT_PAYMENT  → resolve client → sheets.appendClientTransaction('תשלום')
            CLIENT_QUERY    → sheets.getClientBalance()
        → update handyman_sessions
        → send combined reply to WhatsApp
```
