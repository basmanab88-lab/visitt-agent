import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CEREBRAS_KEY = Deno.env.get("CEREBRAS_API_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Multi-provider AI routing ──
// Task types: ai_agent, resume_tailoring, recruiter_messages, linkedin_messages, job_parsing, job_classification
// Providers: cerebras, anthropic, openai

interface LlmTaskConfig {
  model: string;
  provider: string;
}

interface LlmConfig {
  default?: LlmTaskConfig;
  ai_agent?: LlmTaskConfig;
  resume_tailoring?: LlmTaskConfig;
  recruiter_messages?: LlmTaskConfig;
  linkedin_messages?: LlmTaskConfig;
  job_parsing?: LlmTaskConfig;
  job_classification?: LlmTaskConfig;
  [key: string]: LlmTaskConfig | undefined;
}

interface AiKeys {
  cerebras: string;
  anthropic: string;
  openai: string;
}

const FALLBACK_CONFIG: LlmTaskConfig = { model: "qwen-3-235b-a22b-instruct-2507", provider: "cerebras" };

function getModelConfig(llmConfig: LlmConfig | null, task: string): LlmTaskConfig {
  if (!llmConfig) return FALLBACK_CONFIG;
  return llmConfig[task] || llmConfig.default || FALLBACK_CONFIG;
}

function getApiKey(keys: AiKeys, provider: string): string {
  if (provider === "anthropic" || provider === "claude") return keys.anthropic;
  if (provider === "openai" || provider === "gpt") return keys.openai;
  return keys.cerebras; // cerebras, lovable, or any unknown → cerebras
}

function getEndpoint(provider: string): string {
  if (provider === "anthropic" || provider === "claude") return "https://api.anthropic.com/v1/messages";
  if (provider === "openai" || provider === "gpt") return "https://api.openai.com/v1/chat/completions";
  return "https://api.cerebras.ai/v1/chat/completions"; // cerebras + fallback
}

async function aiCallProvider(
  systemPrompt: string,
  userPrompt: string,
  config: LlmTaskConfig,
  apiKey: string,
  options?: { temperature?: number; tools?: any[]; tool_choice?: any }
): Promise<any> {
  const provider = config.provider;
  const temperature = options?.temperature ?? 0.3;

  // ── Anthropic (Claude) uses a different API format ──
  if (provider === "anthropic" || provider === "claude") {
    const body: any = {
      model: config.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature,
    };
    if (options?.tools?.length) {
      // Convert OpenAI-style tools to Anthropic format
      body.tools = options.tools.map((t: any) => ({
        name: t.function.name,
        description: t.function.description || "",
        input_schema: t.function.parameters,
      }));
      if (options.tool_choice) {
        body.tool_choice = { type: "tool", name: options.tool_choice.function?.name || options.tool_choice.name };
      }
    }
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Anthropic ${res.status}: ${errText}`);
    }
    const data = await res.json();
    // Extract text or tool_use result
    if (options?.tools?.length) {
      const toolBlock = data.content?.find((b: any) => b.type === "tool_use");
      if (toolBlock) {
        // Return in OpenAI-compatible tool_calls format for easy integration
        return {
          choices: [{
            message: {
              tool_calls: [{
                function: { name: toolBlock.name, arguments: JSON.stringify(toolBlock.input) }
              }],
              content: null,
            }
          }]
        };
      }
    }
    const textBlock = data.content?.find((b: any) => b.type === "text");
    return {
      choices: [{ message: { content: textBlock?.text ?? "" } }]
    };
  }

  // ── OpenAI / Cerebras (both use OpenAI-compatible format) ──
  const endpoint = getEndpoint(provider);
  const body: any = {
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
  };
  if (options?.tools?.length) {
    body.tools = options.tools;
    if (options.tool_choice) body.tool_choice = options.tool_choice;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`${provider} ${res.status}: ${errText}`);
  }
  return await res.json();
}

// Session-level AI config — set once when settings are loaded
let _llmConfig: LlmConfig | null = null;
let _aiKeys: AiKeys = { cerebras: CEREBRAS_KEY, anthropic: "", openai: "" };

function initAiConfig(llmConfig: any, anthropicKey: string | null, openaiKey: string | null) {
  _llmConfig = llmConfig || null;
  _aiKeys = {
    cerebras: CEREBRAS_KEY,
    anthropic: anthropicKey || "",
    openai: openaiKey || "",
  };
}

// Drop-in replacement for old aiCall — uses "ai_agent" task by default
async function aiCall(systemPrompt: string, userPrompt: string, task = "ai_agent"): Promise<string> {
  const config = getModelConfig(_llmConfig, task);
  const apiKey = getApiKey(_aiKeys, config.provider);
  if (!apiKey) {
    // Fallback to Cerebras if configured key is missing
    const fallbackKey = CEREBRAS_KEY;
    if (!fallbackKey) throw new Error(`No API key for provider ${config.provider} and no Cerebras fallback`);
    const res = await aiCallProvider(systemPrompt, userPrompt, FALLBACK_CONFIG, fallbackKey);
    return res.choices?.[0]?.message?.content ?? "";
  }
  const res = await aiCallProvider(systemPrompt, userPrompt, config, apiKey);
  return res.choices?.[0]?.message?.content ?? "";
}

// Full provider call with tools support — returns raw response
async function aiCallFull(
  systemPrompt: string,
  userPrompt: string,
  task: string,
  options?: { temperature?: number; tools?: any[]; tool_choice?: any }
): Promise<any> {
  const config = getModelConfig(_llmConfig, task);
  const apiKey = getApiKey(_aiKeys, config.provider);
  if (!apiKey) {
    const fallbackKey = CEREBRAS_KEY;
    if (!fallbackKey) throw new Error(`No API key for provider ${config.provider} and no Cerebras fallback`);
    return await aiCallProvider(systemPrompt, userPrompt, FALLBACK_CONFIG, fallbackKey, options);
  }
  return await aiCallProvider(systemPrompt, userPrompt, config, apiKey, options);
}

// ── Google token helpers ──
function extractDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

async function getGoogleAccessToken(
  supabase: any,
  userId: string
): Promise<string | null> {
  const { data: tokenRow } = await supabase
    .from("google_tokens")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tokenRow) return null;

  let accessToken = tokenRow.access_token;
  const expiresAt = tokenRow.token_expires_at ? new Date(tokenRow.token_expires_at) : null;

  if (expiresAt && expiresAt <= new Date() && tokenRow.refresh_token) {
    const newToken = await refreshGoogleToken(tokenRow.refresh_token);
    if (newToken) {
      accessToken = newToken;
      await supabase
        .from("google_tokens")
        .update({
          access_token: newToken,
          token_expires_at: new Date(Date.now() + 3500 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
  }

  return accessToken;
}

// ── CV Copy + Apply Replacements ──
async function createTailoredCV(
  accessToken: string,
  templateDocUrl: string,
  companyName: string,
  replacements: Array<{ find: string; replace: string }>
): Promise<string | null> {
  const docId = extractDocId(templateDocUrl);
  if (!docId) return null;

  const copyRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${docId}/copy`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: `CV - ${companyName}` }),
    }
  );

  if (!copyRes.ok) {
    console.error("Drive copy error:", copyRes.status, await copyRes.text());
    return null;
  }

  const copyData = await copyRes.json();
  const newDocId = copyData.id;

  if (replacements?.length) {
    const requests = replacements.map((r) => ({
      replaceAllText: {
        containsText: { text: r.find, matchCase: true },
        replaceText: r.replace,
      },
    }));

    const updateRes = await fetch(
      `https://docs.googleapis.com/v1/documents/${newDocId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!updateRes.ok) {
      console.error("Docs batchUpdate error:", updateRes.status, await updateRes.text());
    }
  }

  return `https://docs.google.com/document/d/${newDocId}/edit`;
}

// ── Send Summary Email via Resend ──
async function sendSummaryEmail(
  toEmail: string,
  results: any[],
  runId: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log("No RESEND_API_KEY — skipping email");
    return false;
  }

  const jobRows = results
    .map(
      (r) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">
            <strong><a href="${r.job_url_text || "#"}">${r.job_title_text || "Unknown"}</a></strong><br/>
            ${r.job_company_text || ""} · ${r.job_city_text || ""}
          </td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${Math.round((r.match_score || 0) * 100)}%</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${(r.contacts_json || []).length}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${r.google_doc_url ? '<a href="' + r.google_doc_url + '">View CV</a>' : "—"}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#2563eb">Career Muse — Daily Run</h2>
      <p>Found <strong>${results.length}</strong> matching jobs today.</p>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#f8fafc">
          <th style="padding:8px;text-align:left">Job</th>
          <th style="padding:8px;text-align:center">Match</th>
          <th style="padding:8px;text-align:center">Contacts</th>
          <th style="padding:8px;text-align:center">CV</th>
        </tr>
        ${jobRows}
      </table>
      <p style="margin-top:16px">
        <a href="https://career-muse-os.vercel.app/agent" style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">
          Review in Career Muse
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Run ID: ${runId}</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Career Muse <onboarding@resend.dev>",
      to: [toEmail],
      subject: `Career Muse — ${results.length} new jobs found`,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", res.status, await res.text());
    return false;
  }
  return true;
}

// ══════════════════════════════════════════
//  CV REPLACEMENT HELPERS
// ══════════════════════════════════════════

const PROTECTED_STRINGS = [
  "Support Operations & Product Delivery Lead",
  "Onboarding Manager",
  "Technical Support Specialist",
  "Arabic Tutor",
  "Security Operations Lead",
  "Product Operations & AI Implementation Lead",
];

function validateReplacements(raw: any[], cv: string): any[] {
  return raw.filter((r: any) => {
    const find = r.find?.trim() || "";
    const replace = r.replace?.trim() || "";
    if (!find || !replace || find === replace) return false;
    if (!cv.includes(find)) {
      console.log("Skipped (not found in CV):", find.slice(0, 50));
      return false;
    }
    if (PROTECTED_STRINGS.some((p) => find === p || find.includes(p))) {
      console.log("Blocked title replacement:", find.slice(0, 40));
      return false;
    }
    if (find.startsWith("Product Operations leader") && !replace.includes("Product Operations")) {
      console.log("Blocked identity change:", find.slice(0, 40));
      return false;
    }
    if (replace.includes("\u2014") || replace.includes("\u2013")) {
      console.log("Blocked em-dash:", replace.slice(0, 50));
      return false;
    }
    return true;
  });
}

function parseReplacementsResponse(res: any): any[] {
  try {
    const toolCall = res.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return parsed?.replacements || [];
    }
  } catch (e) {
    console.error("Parse replacements error:", e);
  }
  return [];
}

// ══════════════════════════════════════════
//  CONTACT MATCHING — v13 UPGRADED
// ══════════════════════════════════════════

// Relevant titles for outreach (hiring managers, recruiters, team leads, ops people)
const RELEVANT_TITLE_PATTERNS = [
  /\brecruit/i, /\btalent\b/i, /\bhr\b/i, /\bhuman resources/i,
  /\bhiring/i, /\bpeople\b/i,
  /\bhead of/i, /\bvp\b/i, /\bdirector/i, /\bmanager/i, /\blead\b/i,
  /\bproduct/i, /\boperations/i, /\bops\b/i,
  /\bco-?founder/i, /\bceo\b/i, /\bcoo\b/i, /\bcto\b/i,
];

function isRelevantTitle(title: string | null): boolean {
  if (!title) return false;
  return RELEVANT_TITLE_PATTERNS.some((p) => p.test(title));
}

function scoreContact(contact: any, jobCompanyNorm: string, jobTitle: string): number {
  let score = 0;
  const contactCoNorm = (contact.company || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const title = (contact.title || "").toLowerCase();
  const jobTitleLower = (jobTitle || "").toLowerCase();

  // Priority 1: Works at the target company (+100)
  if (contactCoNorm && jobCompanyNorm) {
    if (contactCoNorm.includes(jobCompanyNorm) || jobCompanyNorm.includes(contactCoNorm)) {
      score += 100;
    }
  }

  // Priority 2: Has a relevant title (+10-30)
  if (/recruit|talent|hiring|hr|human resources|people\s+(ops|oper)/i.test(title)) {
    score += 30; // Recruiters/talent are golden
  } else if (/head of|vp|director|c[eot]o|co-?founder/i.test(title)) {
    score += 25; // Senior leaders
  } else if (/manager|lead/i.test(title)) {
    score += 20; // Managers
  } else if (/product|operations|ops/i.test(title)) {
    score += 15; // Same domain
  }

  // Priority 3: Title overlaps with job title (+5)
  const jobWords = jobTitleLower.split(/\s+/).filter((w: string) => w.length > 3);
  for (const word of jobWords) {
    if (title.includes(word)) {
      score += 5;
      break;
    }
  }

  return score;
}

interface ScoredContact {
  full_name: string;
  title: string | null;
  company: string | null;
  linkedin_url: string | null;
  score: number;
  relevance: string; // Why this contact is relevant
}

function findBestContacts(
  allContacts: any[],
  jobCompany: string,
  jobTitle: string,
  maxContacts: number = 5
): ScoredContact[] {
  const jobCompanyNorm = (jobCompany || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const scored: ScoredContact[] = allContacts.map((c) => {
    const s = scoreContact(c, jobCompanyNorm, jobTitle);
    const contactCoNorm = (c.company || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const atCompany = contactCoNorm && jobCompanyNorm &&
      (contactCoNorm.includes(jobCompanyNorm) || jobCompanyNorm.includes(contactCoNorm));

    let relevance = "";
    if (atCompany) {
      relevance = `Works at ${jobCompany}`;
      if (c.title) relevance += ` as ${c.title}`;
    } else if (s > 0 && isRelevantTitle(c.title)) {
      relevance = `${c.title} at ${c.company || "unknown"}`;
    }

    return {
      full_name: c.full_name,
      title: c.title,
      company: c.company,
      linkedin_url: c.linkedin_url,
      score: s,
      relevance,
    };
  });

  // Sort by score descending, take top N, but ONLY contacts with score > 0
  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxContacts);
}

// ══════════════════════════════════════════
//  MAIN HANDLER
// ══════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const { userId, mode } = body;

    // ── Load AI config for all modes (if userId present) ──
    if (userId) {
      const { data: aiSettings } = await supabase
        .from("settings")
        .select("llm_config, anthropic_api_key, openai_api_key")
        .eq("user_id", userId)
        .maybeSingle();
      initAiConfig(aiSettings?.llm_config, aiSettings?.anthropic_api_key, aiSettings?.openai_api_key);
    }

    // ── Mode: tailor_cv — on-demand CV tailoring from the UI ──
    if (mode === "tailor_cv") {
      const { originalCvText, jobTitle, jobCompany, jobDescription, tailorPrompt } = body;
      console.log("tailor_cv called:", { jobTitle, jobCompany, cvLen: originalCvText?.length, descLen: jobDescription?.length });
      if (!originalCvText || originalCvText.length < 50 || !jobTitle) {
        console.log("Skipping — insufficient data");
        return ok({ replacements: [], debug: "CV text too short or missing job title" });
      }

      try {
        const cvTools = [{
          type: "function",
          function: {
            name: "cv_replacements",
            description: "Returns find-and-replace pairs for CV tailoring",
            parameters: {
              type: "object",
              properties: {
                replacements: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { find: { type: "string" }, replace: { type: "string" } },
                    required: ["find", "replace"],
                  },
                },
              },
              required: ["replacements"],
            },
          },
        }];
        const data = await aiCallFull(
          `You tailor CVs for job applications. Given the original CV text and a job description, suggest specific text replacements to make the CV more relevant. Return a JSON array of {find, replace} objects. Each "find" must be an EXACT substring from the original CV. Each "replace" is the improved version. Focus on: professional summary, skill keywords, and experience descriptions. Keep changes minimal but impactful. Max 5 replacements. ${tailorPrompt || ""}`,
          `Original CV:\n${originalCvText}\n\nJob: ${jobTitle} at ${jobCompany}\nDescription: ${jobDescription}`,
          "resume_tailoring",
          { tools: cvTools, tool_choice: { type: "function", function: { name: "cv_replacements" } }, temperature: 0.3 }
        );
        const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        console.log("AI args:", args?.slice(0, 300));
        const parsed = JSON.parse(args);
        return ok({ replacements: parsed?.replacements ?? [] });
      } catch (e: any) {
        console.error("CV tailor error:", e?.message || e);
        return ok({ replacements: [], debug: `AI error: ${e?.message}` });
      }
    }

    // ── Mode: edit_template — API-first CV template editing ──
    if (mode === "edit_template") {
      const { docId, operations } = body;
      // operations: array of { type: "replace", find: string, replace: string }
      //          or { type: "delete", text: string }
      //          or { type: "replaceAll", pairs: [{find, replace}] }
      if (!docId || !operations?.length) {
        return ok({ error: "docId and operations[] required" });
      }

      // Get Google token
      const googleToken = userId ? await getGoogleAccessToken(supabase, userId) : null;
      if (!googleToken) {
        return ok({ error: "No Google token available. Connect Google account first." });
      }

      // Build batchUpdate requests
      const requests: any[] = [];
      for (const op of operations) {
        if (op.type === "replace" || op.type === "replaceAll") {
          const pairs = op.pairs || [{ find: op.find, replace: op.replace }];
          for (const p of pairs) {
            requests.push({
              replaceAllText: {
                containsText: { text: p.find, matchCase: true },
                replaceText: p.replace,
              },
            });
          }
        } else if (op.type === "delete") {
          requests.push({
            replaceAllText: {
              containsText: { text: op.text, matchCase: true },
              replaceText: "",
            },
          });
        }
      }

      // Also check for cleanup operation
      const hasCleanup = operations.some((op: any) => op.type === "cleanup_empty");

      if (!requests.length && !hasCleanup) {
        return ok({ error: "No valid operations to apply" });
      }

      // Apply text replacements first
      if (requests.length) {
        const batchRes = await fetch(
          `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ requests }),
          }
        );
        if (!batchRes.ok) {
          console.error("edit_template batch error:", batchRes.status);
        }
      }

      // Cleanup empty paragraphs/list items
      let cleanedCount = 0;
      const hasDump = operations.some((op: any) => op.type === "dump_structure");
      if (hasCleanup || hasDump) {
        // GET the document structure
        const docRes = await fetch(
          `https://docs.googleapis.com/v1/documents/${docId}`,
          { headers: { Authorization: `Bearer ${googleToken}` } }
        );
        if (docRes.ok) {
          const doc = await docRes.json();

          // Recursively collect ALL paragraphs (including inside table cells)
          function collectParagraphs(elements: any[]): any[] {
            const result: any[] = [];
            for (const el of elements) {
              if (el.paragraph) {
                result.push(el);
              }
              if (el.table) {
                for (const row of el.table.tableRows || []) {
                  for (const cell of row.tableCells || []) {
                    result.push(...collectParagraphs(cell.content || []));
                  }
                }
              }
            }
            return result;
          }

          const allParagraphs = collectParagraphs(doc.body?.content || []);

          // If dump mode, return structure for debugging
          if (hasDump) {
            const dump = allParagraphs.map((el: any) => {
              const text = (el.paragraph.elements || [])
                .map((e: any) => e.textRun?.content || "")
                .join("");
              return {
                startIndex: el.startIndex,
                endIndex: el.endIndex,
                text: text.slice(0, 100),
                isList: !!el.paragraph.bullet,
                hasNesting: !!(el.paragraph.bullet?.nestingLevel),
              };
            });
            return ok({ success: true, paragraphCount: dump.length, paragraphs: dump });
          }

          // Find empty paragraphs/list items
          const deleteRanges: any[] = [];
          for (const el of allParagraphs) {
            if (el.startIndex != null && el.endIndex != null) {
              const text = (el.paragraph.elements || [])
                .map((e: any) => e.textRun?.content || "")
                .join("");
              const trimmed = text.replace(/\n/g, "").trim();
              const isList = !!el.paragraph.bullet;
              if (trimmed === "" && (isList || text.trim() === "")) {
                console.log(`Empty paragraph at ${el.startIndex}-${el.endIndex}: "${text.replace(/\n/g, "\\n")}" isList=${isList}`);
                deleteRanges.push({
                  startIndex: el.startIndex,
                  endIndex: el.endIndex,
                });
              }
            }
          }
          console.log("Found", deleteRanges.length, "empty paragraphs to delete out of", allParagraphs.length, "total paragraphs");
          // Delete from bottom to top to preserve indices
          if (deleteRanges.length) {
            const deleteRequests = deleteRanges
              .sort((a: any, b: any) => b.startIndex - a.startIndex)
              .map((range: any) => ({
                deleteContentRange: { range: { startIndex: range.startIndex, endIndex: range.endIndex } },
              }));
            const cleanRes = await fetch(
              `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
              {
                method: "POST",
                headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ requests: deleteRequests }),
              }
            );
            if (cleanRes.ok) {
              cleanedCount = deleteRanges.length;
              console.log("Cleaned", cleanedCount, "empty paragraphs");
            } else {
              console.error("Cleanup error:", cleanRes.status, await cleanRes.text());
            }
          }
        }
      }

      // Skip the old updateRes logic — already handled above
      const updateRes = { ok: true } as any;

      console.log("edit_template success:", requests.length, "text ops,", cleanedCount, "cleaned");
      return ok({
        success: true,
        operationsApplied: requests.length,
        emptyCleaned: cleanedCount,
        docUrl: `https://docs.google.com/document/d/${docId}/edit`,
      });
    }

    if (!userId) return ok({ error: "userId required" });

    // ══════════════════════════════════════
    //  DAILY RUN PIPELINE
    // ══════════════════════════════════════

    // 1. Create a run record
    const { data: run, error: runErr } = await supabase
      .from("agent_runs")
      .insert({ user_id: userId })
      .select("id")
      .single();
    if (runErr) throw new Error(runErr.message);
    const runId = run.id;

    // 2. Get user preferences + embedding
    const { data: prefs } = await supabase
      .from("suggestion_preferences")
      .select("preferences, embedding")
      .eq("user_id", userId)
      .maybeSingle();

    // 3. Get already-ACTED job IDs — ONLY exclude jobs user explicitly approved/skipped
    // Jobs with user_action = 'pending' are NOT excluded — they should keep appearing
    const { data: actedResults } = await supabase
      .from("agent_results")
      .select("job_directory_id")
      .eq("user_id", userId)
      .in("user_action", ["approved", "skipped", "applied"]);
    const { data: signals } = await supabase
      .from("user_signals")
      .select("job_directory_id")
      .eq("user_id", userId);

    const excludeIds = [
      ...new Set([
        ...(actedResults ?? []).map((r: any) => r.job_directory_id),
        ...(signals ?? []).map((s: any) => s.job_directory_id),
      ]),
    ].filter((id) => id != null);

    console.log("Exclude IDs count:", excludeIds.length, "(only acted-on jobs)");

    // 4. DISCOVER: MULTI-STRATEGY search — vector + title keywords + AI re-ranking
    let vectorMatches: any[] = [];
    let titleMatches: any[] = [];

    // Strategy A: Vector similarity search (broad — get 50 candidates)
    if (prefs?.embedding) {
      const embeddingStr = typeof prefs.embedding === "string" ? prefs.embedding : JSON.stringify(prefs.embedding);
      const { data: vecData, error: vecErr } = await supabase.rpc("match_jobs_by_embedding", {
        query_embedding: embeddingStr,
        exclude_ids: excludeIds.length > 0 ? excludeIds : [],
        match_threshold: 0.15,
        match_count: 50,
      });
      if (vecErr) console.error("Vector search error:", vecErr);
      vectorMatches = vecData ?? [];
      console.log("Vector matches:", vectorMatches.length, "top:", vectorMatches[0]?.title, vectorMatches[0]?.similarity);
    }

    // Strategy B: Title keyword search — target roles from preferences
    // These are the roles Basman ACTUALLY wants, searched by title
    const TARGET_TITLE_PATTERNS = [
      // Operations & Business Ops
      "operations manager", "operations lead", "head of operations",
      "director of operations", "business operations", "product operations",
      "support operations", "support lead", "customer operations",
      "operations coordinator",
      // AI & Automation — broad coverage
      "AI manager", "AI operations", "AI GTM", "AI product",
      "AI solution", "AI owner", "automation manager",
      "AI champion", "AI enabler", "AI enablement", "AI evangelist",
      "AI marketing", "AI knowledge", "AI agent", "AI insights",
      "AI growth", "AI conversational", "LLM",
      // GTM & Revenue
      "RevOps", "GTM operations", "GTM manager",
      // Implementation & Delivery
      "implementation manager", "delivery lead", "delivery manager",
      "deployment", "onboarding manager", "customer onboarding",
      // Solutions & Technical Account
      "solutions architect", "solutions manager", "solutions engineer",
      "technical account manager", "technical account",
      // Program & Project Management
      "program manager", "project manager",
      // Enablement & Adoption
      "enablement manager", "enablement lead", "enablement",
      "adoption", "platform manager",
      // Integration & Process
      "integration manager", "process manager", "process improvement",
      "process automation",
    ];

    const titleOrParts = TARGET_TITLE_PATTERNS.map((p) => `title.ilike.%${p}%`);
    const { data: titleData } = await supabase
      .from("jobs_directory")
      .select("id, title, company, city, url, source, description, category, level")
      .or(titleOrParts.join(","))
      .not("description", "is", null)
      .gt("description", "")
      .limit(200);

    // Priority scoring — AI/automation/TAM roles score higher than generic program/project manager
    const HIGH_PRIORITY_PATTERNS = [
      /\bai\b/i, /\bllm\b/i, /automation/i, /enablement/i, /enabler/i,
      /evangelist/i, /champion/i, /technical account/i, /gtm/i, /revops/i,
      /product operations/i, /adoption/i, /solutions architect/i,
    ];
    function priorityScore(title: string): number {
      let score = 0;
      for (const p of HIGH_PRIORITY_PATTERNS) {
        if (p.test(title)) score += 10;
      }
      return score;
    }

    if (titleData) {
      titleMatches = titleData
        .filter((j: any) => !excludeIds.includes(j.id))
        .filter((j: any) => j.description && j.description.length > 100)
        .map((j: any) => ({ ...j, similarity: 0.6, source_strategy: "title_keyword", _priority: priorityScore(j.title || "") }))
        .sort((a: any, b: any) => b._priority - a._priority);
      console.log("Title keyword matches:", titleMatches.length, "top priority:", titleMatches.slice(0, 5).map((j: any) => `${j.title}@${j.company}(p${j._priority})`));
    }

    // Hard-NO title filter — block roles the user explicitly rejected
    const HARD_NO_TITLES = [
      "software engineer", "developer", "devops", "qa engineer", "qa lead",
      "data engineer", "frontend", "backend", "full stack", "fullstack",
      "mlops", "security engineer", "hardware", "sdet", "test engineer",
      "embedded engineer", "firmware", "junior",
    ];
    function isHardNo(title: string): boolean {
      const t = title.toLowerCase();
      return HARD_NO_TITLES.some((no) => t.includes(no));
    }

    // QUOTA-BASED MERGE — guarantees diversity instead of letting one strategy dominate
    // Quota: max 5 from vector search, up to 10 from title keyword search
    const seenIds = new Set<string>();
    const matches: any[] = [];

    // Slot A: Top 5 non-CSM from title keywords (operations, AI, GTM, implementation, product)
    // These are the roles Basman ACTUALLY wants — they get priority
    // CSM-ish roles get their own smaller quota. "Technical Account Manager" and "Solutions" are NOT CSM.
    const csmPattern = /customer success(?! architect| engineer)|(?<!technical )account manager|retention specialist|user acquisition|sales manager/i;
    const titleNonCsm = titleMatches
      .filter((j: any) => !isHardNo(j.title || "") && !csmPattern.test(j.title || ""))
      .slice(0, 10);
    for (const m of titleNonCsm) {
      if (matches.length >= 10) break;
      if (!seenIds.has(m.id)) {
        seenIds.add(m.id);
        matches.push(m);
      }
    }
    console.log("Slot A (title non-CSM):", matches.length, matches.map((m: any) => m.title));

    // Slot B: Top 3 CSM from title keywords (some CSM is fine, just not ALL)
    const titleCsm = titleMatches
      .filter((j: any) => !isHardNo(j.title || "") && csmPattern.test(j.title || ""))
      .slice(0, 3);
    for (const m of titleCsm) {
      if (matches.length >= 13) break;
      if (!seenIds.has(m.id)) {
        seenIds.add(m.id);
        matches.push(m);
      }
    }
    console.log("After Slot B (title CSM):", matches.length);

    // Slot C: Fill remaining from vector search (best similarity, deduped)
    const vectorFiltered = vectorMatches.filter((j: any) => !isHardNo(j.title || ""));
    for (const m of vectorFiltered) {
      if (matches.length >= 15) break;
      if (!seenIds.has(m.id)) {
        seenIds.add(m.id);
        matches.push({ ...m, source_strategy: "vector" });
      }
    }
    console.log("After Slot C (vector fill):", matches.length);

    if (!matches.length) {
      await supabase
        .from("agent_runs")
        .update({ status: "completed", completed_at: new Date().toISOString(), job_count: 0 })
        .eq("id", runId);
      return ok({ runId, jobCount: 0, message: "No new matching jobs found. Try adjusting your preferences." });
    }

    console.log("Final matches to process:", matches.length, matches.map((m: any) => m.title));

    // 5. Get user settings (for CV tailoring + email + AI config)
    const { data: settings } = await supabase
      .from("settings")
      .select("base_resume_text, tailor_prompt, candidate_name, enrich_api_key, shared_google_doc_url, llm_config, anthropic_api_key, openai_api_key")
      .eq("user_id", userId)
      .maybeSingle();

    // Initialize AI provider routing from user settings
    initAiConfig(settings?.llm_config, settings?.anthropic_api_key, settings?.openai_api_key);

    // 6. Get Google access token for CV copy
    const googleToken = await getGoogleAccessToken(supabase, userId);
    const templateDocUrl = settings?.shared_google_doc_url || "";

    // 7. Get ALL user's LinkedIn contacts (no limit — need full pool for matching)
    const { data: globalContacts } = await supabase
      .from("global_contacts")
      .select("full_name, title, linkedin_url, company")
      .eq("user_id", userId);

    // 8. Process each match: contacts + CV tailoring + CV copy + messages
    const results: any[] = [];

    for (const job of matches.slice(0, 15)) {
      const result: any = {
        run_id: runId,
        user_id: userId,
        job_directory_id: job.id,
        match_score: job.similarity ?? 0.5,
        user_action: "pending",
        source: "search",
        job_title_text: job.title || null,
        job_company_text: job.company || null,
        job_city_text: job.city || null,
        job_url_text: job.url || null,
        job_level_text: job.level || null,
        job_description_text: job.description || null,
      };

      // ── Find contacts — UPGRADED v13 ──
      const bestContacts = findBestContacts(
        globalContacts ?? [],
        job.company || "",
        job.title || "",
        5
      );

      result.contacts_json = bestContacts.map((c) => ({
        name: c.full_name,
        title: c.title,
        company: c.company,
        linkedin_url: c.linkedin_url,
        relevance: c.relevance,
        score: c.score,
      }));

      // ── Generate AI analysis + CV find-and-replace pairs (PARALLELIZED v25) ──
      const hasAnyAiKey = CEREBRAS_KEY || _aiKeys.anthropic || _aiKeys.openai;
      if (hasAnyAiKey) {
        const cvText = settings?.base_resume_text || "";
        const tailorPrompt = settings?.tailor_prompt || "Focus on relevant experience and transferable skills.";
        const resumeContext = cvText
          ? `\n\nCandidate Resume:\n${cvText.slice(0, 3000)}`
          : `\n\nCandidate: ${settings?.candidate_name || "Job seeker"} — experienced in operations, customer success, and process optimization.`;

        // Steps A + B run in PARALLEL to save ~3-4s per job
        const analysisPromise = aiCall(
          `You help job seekers prepare for applications. Given a job posting and candidate info, provide:\n1. A tailored professional summary (3-4 sentences) the candidate can use in their CV for this role\n2. Key strengths that match this role\n3. Any gaps or areas to address\n4. Suggested talking points for an interview\n\nBe specific and actionable. ${tailorPrompt}`,
          `Job: ${job.title} at ${job.company}\nDescription: ${(job.description || "").slice(0, 1500)}${resumeContext}`,
          "resume_tailoring"
        ).catch((e: any) => { console.error("CV analysis error:", e); return ""; });

        const cvReplacementTools = [{
          type: "function",
          function: {
            name: "cv_replacements",
            description: "Returns find-and-replace pairs for CV tailoring",
            parameters: {
              type: "object",
              properties: {
                replacements: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      find: { type: "string", description: "Exact text from the original CV" },
                      replace: { type: "string", description: "Tailored replacement text" },
                      section: { type: "string", description: "Which CV section: summary|title|experience|skills" },
                    },
                    required: ["find", "replace"],
                  },
                },
              },
              required: ["replacements"],
            },
          },
        }];

        const replacementsPromise = (cvText.length > 100) ? aiCallFull(
          `You tailor CVs for job applications by producing find-and-replace pairs.

ABSOLUTE RULES (NEVER BREAK THESE):
- NEVER change job titles from experience section (e.g. "Support Operations & Product Delivery Lead" must stay exactly as is)
- NEVER change the candidate's identity line (the opening "Product Operations leader with 5+ years..." must keep "Product Operations" — you may adjust what follows but NEVER rename them to Engineer/Developer/Analyst/etc.)
- NEVER use em-dashes or long dashes (the character — or –). Use regular hyphens (-) only.
- Each "find" must be an EXACT character-for-character substring from the original CV text
- Each "replace" is the improved version tailored to the target job
- NEVER fabricate experience, credentials, or companies
- NEVER add tools/skills the candidate doesn't have

WHAT TO CHANGE (aim for 6-10 replacements, WOVEN THROUGHOUT the entire CV):
1. Professional summary (1-2 replacements) - reframe emphasis for the target role but KEEP "Product Operations" identity. Only adjust the description of what they specialize in.
2. Recent experience bullet points (2-3 replacements) - reword to emphasize transferable achievements that align with the job description. Use keywords from the job naturally.
3. AI Projects section bullets (1-2 replacements) - highlight the most relevant project aspects for this specific role
4. Older experience bullets (1 replacement) - connect past work to the target role's needs
5. Core competencies line (1 replacement) - reorder skills to front-load the ones most relevant to this job

STYLE:
- Keep it authentic. This person is an operations leader who builds AI tools, not an engineer.
- Use action verbs and quantified results
- Mirror keywords from the job description but keep it natural
- Subtle and professional, not over-optimized
- Use regular hyphens (-) not em-dashes`,
          `Target: ${job.title} at ${job.company}\nJob Description: ${(job.description || "").slice(0, 1500)}\n\nOriginal CV:\n${cvText}`,
          "resume_tailoring",
          { tools: cvReplacementTools, tool_choice: { type: "function", function: { name: "cv_replacements" } }, temperature: 0.3 }
        ).catch((e: any) => { console.error("CV replacements error:", e); return null; }) : Promise.resolve(null);

        // Await both in parallel
        const [cvAnalysis, repData] = await Promise.all([analysisPromise, replacementsPromise]);
        if (cvAnalysis) result.tailored_cv_text = cvAnalysis;

        // ── Process & validate replacement response ──
        let validReplacements: any[] = [];
        if (repData) {
          try {
            const raw = parseReplacementsResponse(repData);
            validReplacements = validateReplacements(raw, cvText);
            console.log(`CV replacements for ${job.company}: ${raw.length} raw, ${validReplacements.length} valid`);
          } catch (e) {
            console.error("CV replacements error:", e);
          }
        } else {
          console.log(`CV replacements call failed for ${job.company}, will retry`);
        }

        // Log failure reason for debugging (no retry here — too slow)
        if (validReplacements.length === 0 && repRes) {
          const status = typeof repRes === "object" && "status" in repRes ? (repRes as Response).status : "unknown";
          console.log(`No valid replacements for ${job.company}. Response status: ${status}`);
        }

        if (validReplacements.length) {
          result.cv_replacements = validReplacements;
        }
        await new Promise((r) => setTimeout(r, 100));

        // ── Step C — Create tailored Google Doc copy ──
        if (googleToken && templateDocUrl && result.cv_replacements?.length) {
          try {
            const docUrl = await createTailoredCV(
              googleToken,
              templateDocUrl,
              job.company || job.title || "Tailored",
              result.cv_replacements
            );
            if (docUrl) {
              result.google_doc_url = docUrl;
              console.log(`CV created for ${job.company}:`, docUrl);
            }
          } catch (e) {
            console.error("CV copy error:", e);
          }
        }
      }

      // ── Generate outreach messages — UPGRADED v13 ──
      const contactsForMessages = bestContacts.filter((c) => c.score > 0);
      if (contactsForMessages.length > 0) {
        try {
          const msgText = await aiCall(
            `You write LinkedIn outreach messages for Basman, who is looking for his next role in tech.

BASMAN'S VOICE — follow these rules exactly:
- Casual, direct, Israeli tech style. Like texting a colleague, not writing a cover letter.
- Short. 2-3 sentences MAX. No fluff, no filler.
- NEVER use hyphens (—) or em-dashes in the message text.
- NEVER start with "I'm Basman and I'm very interested in..."
- NEVER use words like "thriving", "leveraged", "I'd welcome", "I admire your"
- Start with "Hey [name]," not "Hi [name],"
- Get to the point fast: what he wants (intro, referral, quick chat, info about the role)
- If the contact works at the target company: ask about the role directly, or ask for a referral
- If the contact is a recruiter: be direct about interest
- If the contact is a random connection: ask if they know anyone at the company
- End with something actionable: "any chance you could intro me?" or "down for a quick call?"
- Sound like a real person, not a bot. Zero AI vibes.

Return a JSON array of objects: [{to: "name", text: "message"}]
Do NOT number them. Return ONLY valid JSON, no markdown.`,
            `Role I'm after: "${job.title}" at ${job.company}

Contacts to message:
${contactsForMessages.map((c) => `- ${c.full_name} (${c.title || "no title"} at ${c.company || "unknown"}) — ${c.relevance}`).join("\n")}`,
            "linkedin_messages"
          );

          // Parse the messages — handle both JSON and numbered format
          let messages: any[] = [];
          try {
            // Try JSON parse first
            const cleaned = msgText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            messages = JSON.parse(cleaned);
          } catch {
            // Fallback: parse numbered format
            const msgLines = msgText.split(/\d+[.\)]\s+/).filter(Boolean);
            messages = contactsForMessages.map((c, i) => ({
              to: c.full_name,
              text: msgLines[i]?.trim() || `Hey ${c.full_name}, saw ${job.company} is hiring for ${job.title}. Know anything about the role?`,
            }));
          }

          result.messages_json = messages;
        } catch (e) {
          console.error("Message generation error:", e);
        }
        await new Promise((r) => setTimeout(r, 150));
      }

      results.push(result);
    }

    // 8.5 BATCH RETRY — retry CV replacements for jobs that failed (max 5)
    const cvText = settings?.base_resume_text || "";
    const needsRetry = results.filter((r: any) => !r.cv_replacements?.length && cvText.length > 100);
    if (needsRetry.length > 0 && googleToken && templateDocUrl) {
      console.log(`Batch retry: ${needsRetry.length} jobs need CV replacements, retrying top 5`);
      const retryTools = [{
        type: "function",
        function: {
          name: "cv_replacements",
          description: "Returns find-and-replace pairs for CV tailoring",
          parameters: {
            type: "object",
            properties: { replacements: { type: "array", items: { type: "object", properties: { find: { type: "string" }, replace: { type: "string" } }, required: ["find", "replace"] } } },
            required: ["replacements"],
          },
        },
      }];
      for (const result of needsRetry.slice(0, 5)) {
        try {
          const data = await aiCallFull(
            `Generate 4-6 find-and-replace pairs to tailor a CV. Each "find" MUST be an EXACT substring from the original CV. Keep "Product Operations" identity. No em-dashes. No fabrication.`,
            `Target: ${result.job_title_text} at ${result.job_company_text}\nJob: ${(result.job_description_text || "").slice(0, 800)}\n\nCV:\n${cvText}`,
            "resume_tailoring",
            { tools: retryTools, tool_choice: { type: "function", function: { name: "cv_replacements" } }, temperature: 0.2 }
          );
          if (data) {
            const raw = parseReplacementsResponse(data);
            const valid = validateReplacements(raw, cvText);
            if (valid.length) {
              result.cv_replacements = valid;
              // Create Google Doc
              try {
                const docUrl = await createTailoredCV(googleToken, templateDocUrl, result.job_company_text || "Tailored", valid);
                if (docUrl) {
                  result.google_doc_url = docUrl;
                  console.log(`Retry CV created for ${result.job_company_text}:`, docUrl);
                }
              } catch (e) { console.error("Retry CV copy error:", e); }
            }
          }
          await new Promise((r) => setTimeout(r, 100));
        } catch (e) { console.error("Batch retry error:", e); }
      }
    }

    // 9. Insert all results
    if (results.length) {
      await supabase.from("agent_results").insert(results);
    }

    // 10. Complete the run
    await supabase
      .from("agent_runs")
      .update({ status: "completed", completed_at: new Date().toISOString(), job_count: results.length })
      .eq("id", runId);

    // ── 11. Send summary email ──
    const emailSent = await sendSummaryEmail("basmanab88@gmail.com", results, runId);
    console.log("Email sent:", emailSent);

    return ok({ runId, jobCount: results.length, emailSent });
  } catch (err: unknown) {
    console.error(err);
    return ok({ error: err instanceof Error ? err.message : String(err) });
  }
});
