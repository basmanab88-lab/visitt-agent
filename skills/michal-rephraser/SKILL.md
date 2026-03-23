# Skill: Michal Rephraser

Rephrase Basman's Slack messages to match Michal Susz's communication style, based on analysis of their real DM history.

## When to Use
- User pastes a message they want to send to Michal
- User says "תנסח לי את זה למיכל" / "תתאים את זה לסגנון של מיכל" / "תקצר לסגנון של מיכל"

---

## Michal's Communication Profile (from real Slack DMs)

**Core patterns:**
- Writes 1-5 words per message, rarely more than 2-3 lines
- Gets to the point in the first sentence — no preamble, no small talk opener
- Direct action language: "בבקשה + פעולה" with no hedging or softening
- Trusts context — doesn't over-explain background
- Short status questions: "מה קורה?", "מה קרה עם X?"
- Warm but efficient — one brief personal line max, then straight to business
- No filler phrases ("אני רוצה לוודא ש..." / "אני יודע שאתה עסוק אבל...")
- Minimal punctuation and emojis (uses :pray: for thanks)
- Bullets only when 3+ items — otherwise prose

**Her patterns in action:**
- "בבקשה תקבע איתם סשן למחר"
- "הכי חשוב לשמור על עצמך. תעדכן אותנו מחר בהתקדמות"
- "היי. מה קורה? כותבת פה כדי שתוכל לראות בראשון"
- "סגור"
- "שירגיש טוב!"
- "בבקשה תעדכן את דנה במידה ויש השפעה על המשימות"
- "דיברתי עם הדס, יש מחשב חלופי — בבקשה תדאג לזה מולה"

---

## Rephrasing Rules

| What Basman does | What to change |
|---|---|
| Starts with "מה קורה, עדכון קטן" | Cut the opener — start with the first real sentence |
| Explains background in detail | Keep only what Michal needs to act — cut the rest |
| 5 lines → target 1-2 | Compress dramatically |
| Softening phrases ("אם מתאים", "מה את חושבת?") | Direct ask: "אפתח?" / "תאשרי" |
| Over-explains reasons | State the fact — skip the cause unless she asked |
| Multiple questions | Ask only the one that matters most |

---

## Prompt to Use in Claude

```
You are a communication coach matching writing style to Michal Susz, Basman's manager.

Rephrase the message below so it fits Michal's style:
- Ultra-concise: 1-2 lines per thought
- Lead with status or action in the first sentence
- "בבקשה + פעולה" for requests — no softening
- Cut all preamble and background unless strictly necessary
- One direct question at the end if needed (not multiple)
- Keep Hebrew/English as-is
- Output only the rephrased message, no commentary

[MESSAGE]
```

---

## Real Example (Validated — Basman sent this)

**Original (68 words):**
> מה קורה, עדכון קטן.
> לגבי ההדרכה של מרכיב ואייזק על הטמעות ואימפורטים, תוך כדי עלה ש-import one זה משהו שעדיין לא פורסם רשמית ורק ליאל מכיר. לקחתי על עצמי להשלים איתו את הפערים כדי שאוכל להעביר את זה אליהם בצורה מסודרת.
> בהמשך אני גם יושב עם קלרה כדי לעבור על האזורים הישנים ולהשלים את התמונה.
> בגלל שעדיין לא קיבלתי משימות מדנה ולא ברור בדיוק על מה נתמקד, כרגע אני נותן להם overview כללי על אזורי ההטמעות, ההבדלים בין הישן לחדש, וקצת מעבר על הטפסים.
> לדעתי עדיף קודם לקבל את המשימות ואז למקד בהתאם, כי יש הרבה אזורים ולא כולם בהכרח רלוונטיים.
> עוד משהו, מציע לפתוח קבוצה קטנה לכל מי שמעורב בהטמעות, כדי לרכז שאלות ודברים שעולים עד שהעסק הזה יתייצב. אני יכול לפתוח אם מתאים. מה את חושבת?

**Rephrased (41 words):**
> ההדרכה עם מרכיב ואייזק בעיצומה.
> עלה שـimport one עדיין לא פורסם רשמית — רק ליאל מכיר. אני משלים איתו את הפערים לפני שאעביר להם.
> יושב גם עם קלרה לקבל תמונה מלאה על האזורים הישנים.
>
> כרגע נותן להם overview כללי כי עדיין לא קיבלתי משימות מדנה.
> לדעתי עדיף לקבל את המשימות קודם ואז למקד — יש הרבה אזורים ולא כולם רלוונטיים.
>
> מציע לפתוח קבוצה לכל המעורבים בהטמעות לריכוז שאלות עד שזה מתייצב. אפתח?

**Reduction: 68 → 41 words (40% shorter). User sent this version.**

---

## Quick Reference: Michal's Formula

| Situation | Her pattern |
|---|---|
| Task request | "בבקשה + פעולה קצרה" |
| Status check | "מה קורה עם X?" |
| Approval | "סגור" / "אוקיי, תודה" |
| Concern + action | "דיברתי עם X, יש Y — בבקשה תדאג" |
| Personal check-in | One line, then straight to business |
