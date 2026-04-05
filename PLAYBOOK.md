# Visitt Agent — Playbook

מדריך תפעול מלא. מה המערכת, מה עושים, מתי, ואיך.

---

## מה המערכת הזו

Agent שעובד על Visitt מטעמך. הוא יודע לבצע אוטומציות, לפרוס בניינים, לנהל קטגוריות בבת-אחת, לכתוב GraphQL mutations, ולעדכן את עצמו אחרי כל משימה כדי לא לחזור על אותן טעויות.

כל מה שנלמד בכל סשן נשמר, נדחף ל-GitHub, ומגיע לסשן הבא אוטומטית.

---

## מה אתה צריך לעשות (ורק זה)

### בתחילת סשן — כלום
פשוט פותחים Cowork ומתחילים. המערכת טוענת את כל ההקשר לבד.

### במהלך עבודה — לתת פידבק
- `מעולה` — משמר את מה שעבד
- `זה איטי` / `זה לא עובד` — מפעיל אופטימיזציה מיידית
- `עצור` — עוצר ומחשב מחדש

### אחרי כל משימה — אופציונלי אבל מומלץ
אחרי שמשימה משמעותית הסתיימה (פריסת בניין, אוטומציה חדשה, פתרון באג):
```
תשמור מה שלמדנו
```
אם המשימה הייתה קטנה ולא לימדה כלום חדש — אין צורך.

### בסיום סשן — תמיד
```
תשמור מה שלמדנו
```
זה מפעיל אוטומטית:
1. ריוויו על מה שהיה
2. עדכון skill files ב-GitHub
3. עדכון optimization log
4. Push לריפו

לא צריך לומר יותר מזה.

---

## מבנה הריפו

```
visitt-agent/
├── CLAUDE.md              ← הקשר שנטען בכל סשן (קצר, עובדתי)
├── PLAYBOOK.md            ← המסמך הזה
├── memory/
│   └── optimization-log.md ← היסטוריה של מה השתנה מתי
├── skills/
│   ├── self-review/       ← לוגיקת end-of-session + GitHub backup
│   ├── visitt-api/        ← GraphQL mutations, auth, patterns
│   ├── visitt-workflow/   ← browser automation, UI navigation
│   └── system-learning/   ← methodology לכל מערכת חדשה
└── hooks/
    └── visitt-context.md  ← כללי ברזל (נטענים כל סשן)
```

### מה הולך לאן

| סוג ידע | איפה נשמר |
|---|---|
| כלל שחוזר בכל סשן | `hooks/visitt-context.md` |
| GraphQL mutation חדש | `skills/visitt-api/SKILL.md` |
| תבנית ניווט / UI shortcut | `skills/visitt-workflow/SKILL.md` |
| טכניקה שעובדת על כל מערכת | `skills/system-learning/SKILL.md` |
| סיכום שינויים לפי תאריך | `memory/optimization-log.md` |
| הקשר cross-session | `CLAUDE.md` |

---

## פקודות שאתה צריך לדעת

| מה לומר | מה קורה |
|---|---|
| `תשמור מה שלמדנו` | end-of-session review + push ל-GitHub |
| `תתייעל` / `self-review` | ריוויו מיידי על הסשן הנוכחי |
| `גיבוי` | push ל-GitHub בלי ריוויו מלא |
| `מעולה` | מסמן מה עבד → נשמר בסקיל |
| `זה לקח יותר מדי זמן` | מפעיל חיפוש אופטימיזציה |

---

## איך מעבירים את הפלאגין לקולגה

1. קולגה מוריד את הריפו:
   ```
   git clone https://github.com/basmanab88-lab/visitt-agent
   ```
2. מתקין כ-plugin ב-Cowork (גורר את התיקייה)
3. מתחיל לעבוד — כל הידע שנצבר כבר שם

**מה הקולגה לא מקבל:** את הטוקן שלך ל-GitHub (הוא יצטרך להגדיר משלו אם רוצה לדחוף עדכונים).

---

## איך הידע עובר בין סשנים

הפלאגין המקומי לא ניתן לעדכון אוטומטי. במקום זה, בתחילת כל סשן נעשה clone מ-GitHub, ומשם נטענים הסקילים העדכניים ביותר. כך כל סשן תמיד עובד עם הידע המצטבר המלא.

הזרימה המלאה:
```
תחילת סשן     → clone מ-GitHub → קריאת סקילים עדכניים
עבודה          → רגיל
סיום סשן       → "תשמור מה שלמדנו" → עדכון סקילים + push ל-GitHub
סשן הבא        → clone מחדש → כבר כולל את הידע החדש
```

אין צורך בשום פעולה ידנית — הכל קורה אוטומטית.

---

## Career Muse — דרך עבודה קבועה

### Edge Function (agent-run)

**קוד מקור:** `career-agent/agent-run-index.ts` בריפו הזה
**Deploy target:** Supabase project `ztqngvwdaxwbnobsgyuw`, function `agent-run`

**תהליך — תמיד אותו דבר:**
1. אני עורך את `agent-run-v13/index.ts` בסשן
2. דוחף ל-GitHub: `career-agent/agent-run-index.ts`
3. עושה deploy דרך Supabase MCP tool (`deploy_edge_function`) — **לא CLI, לא subagent**
4. מוודא שה-deploy תקין: בודק `version` + markers בקוד (aiCallProvider, llm_config וכו')

**כללי ברזל:**
- **אף פעם subagent לדפלוי** — הם מחליפים את הקוד ב-stub
- **אף פעם CLI מה-sandbox** — חסום outbound HTTPS
- **תמיד MCP deploy_edge_function** — עובד נכון עם הקוד המלא
- **verify_jwt: false** — תמיד

### AI Model Selection

**טבלה:** `settings` (Supabase)
**שדות:** `llm_config` (jsonb), `anthropic_api_key` (text), `openai_api_key` (text)

**פורמט llm_config:**
```json
{
  "default": {"model": "qwen-3-235b-a22b-instruct-2507", "provider": "cerebras"},
  "resume_tailoring": {"model": "claude-sonnet-4-20250514", "provider": "anthropic"},
  "linkedin_messages": {"model": "gpt-4o", "provider": "openai"}
}
```

**Task types:** `ai_agent`, `resume_tailoring`, `recruiter_messages`, `linkedin_messages`, `job_parsing`, `job_classification`
**Providers:** `cerebras` (default fallback), `anthropic`/`claude`, `openai`/`gpt`

אם אין API key לספק שנבחר — fallback אוטומטי ל-Cerebras.

---

## מה המערכת לא עושה

- לא מחליטה לבד לשנות קוד בפרודקשן
- לא פורסת לVisitt בלי preview ואישור מפורש ממך
- לא מוחקת דאטה בלי dry-run קודם
- לא מסיקה מסקנות מעבר למה שנאמר בפועל — הסקיל מתעדכן עם עובדות, לא פרשנויות
