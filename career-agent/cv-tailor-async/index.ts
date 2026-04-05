import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CEREBRAS_KEY = Deno.env.get("CEREBRAS_API_KEY") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── AI Provider Routing (same as main function) ──
interface LlmTaskConfig { model: string; provider: string; }
interface AiKeys { cerebras: string; anthropic: string; openai: string; }

const FALLBACK_CONFIG: LlmTaskConfig = { model: "qwen-3-235b-a22b-instruct-2507", provider: "cerebras" };

let _llmConfig: any = null;
let _aiKeys: AiKeys = { cerebras: CEREBRAS_KEY, anthropic: "", openai: "" };

function getModelConfig(task: string): LlmTaskConfig {
  if (!_llmConfig) return FALLBACK_CONFIG;
  return _llmConfig[task] || _llmConfig.default || FALLBACK_CONFIG;
}

function getApiKey(provider: string): string {
  if (provider === "anthropic" || provider === "claude") return _aiKeys.anthropic;
  if (provider === "openai" || provider === "gpt") return _aiKeys.openai;
  return _aiKeys.cerebras;
}

async function aiCallFull(
  systemPrompt: string,
  userPrompt: string,
  task: string,
  options?: { temperature?: number; tools?: any[]; tool_choice?: any }
): Promise<any> {
  const config = getModelConfig(task);
  let apiKey = getApiKey(config.provider);
  const provider = config.provider;

  // Fallback to Cerebras if key is missing
  if (!apiKey) {
    if (!CEREBRAS_KEY) throw new Error(`No API key for ${provider} and no Cerebras fallback`);
    apiKey = CEREBRAS_KEY;
    const fallbackConfig = FALLBACK_CONFIG;
    return callProvider(systemPrompt, userPrompt, fallbackConfig, apiKey, options);
  }
  return callProvider(systemPrompt, userPrompt, config, apiKey, options);
}

async function callProvider(
  systemPrompt: string,
  userPrompt: string,
  config: LlmTaskConfig,
  apiKey: string,
  options?: { temperature?: number; tools?: any[]; tool_choice?: any }
): Promise<any> {
  const provider = config.provider;
  const temperature = options?.temperature ?? 0.3;

  if (provider === "anthropic" || provider === "claude") {
    const body: any = {
      model: config.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature,
    };
    if (options?.tools?.length) {
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
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text().catch(() => "")}`);
    const data = await res.json();
    if (options?.tools?.length) {
      const toolBlock = data.content?.find((b: any) => b.type === "tool_use");
      if (toolBlock) {
        return { choices: [{ message: { tool_calls: [{ function: { name: toolBlock.name, arguments: JSON.stringify(toolBlock.input) } }], content: null } }] };
      }
    }
    const textBlock = data.content?.find((b: any) => b.type === "text");
    return { choices: [{ message: { content: textBlock?.text ?? "" } }] };
  }

  // OpenAI / Cerebras
  const endpoint = (provider === "openai" || provider === "gpt")
    ? "https://api.openai.com/v1/chat/completions"
    : "https://api.cerebras.ai/v1/chat/completions";
  const body: any = {
    model: config.model,
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
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
  if (!res.ok) throw new Error(`${provider} ${res.status}: ${await res.text().catch(() => "")}`);
  return await res.json();
}

// ── CV helpers ──
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
    if (!cv.includes(find)) { console.log("Skipped (not in CV):", find.slice(0, 50)); return false; }
    if (PROTECTED_STRINGS.some((p) => find === p || find.includes(p))) { console.log("Blocked title:", find.slice(0, 40)); return false; }
    if (find.startsWith("Product Operations leader") && !replace.includes("Product Operations")) { console.log("Blocked identity change"); return false; }
    if (replace.includes("\u2014") || replace.includes("\u2013")) { console.log("Blocked em-dash"); return false; }
    const lenRatio = replace.length / find.length;
    if (lenRatio > 1.6 || lenRatio < 0.4) { console.log(`Blocked length (${lenRatio.toFixed(2)}):`, find.slice(0, 40)); return false; }
    if (find.length < 15) { console.log("Blocked short find:", find); return false; }
    return true;
  });
}

function parseReplacementsResponse(res: any): any[] {
  try {
    const toolCall = res.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) return JSON.parse(toolCall.function.arguments)?.replacements || [];
  } catch (e) { console.error("Parse error:", e); }
  return [];
}

function extractDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET }),
  });
  if (!res.ok) return null;
  return (await res.json()).access_token ?? null;
}

async function getGoogleAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: t } = await supabase.from("google_tokens").select("access_token, refresh_token, token_expires_at").eq("user_id", userId).maybeSingle();
  if (!t) return null;
  let token = t.access_token;
  if (t.token_expires_at && new Date(t.token_expires_at) <= new Date() && t.refresh_token) {
    const newToken = await refreshGoogleToken(t.refresh_token);
    if (newToken) {
      token = newToken;
      await supabase.from("google_tokens").update({ access_token: newToken, token_expires_at: new Date(Date.now() + 3500 * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("user_id", userId);
    }
  }
  return token;
}

async function createTailoredCV(
  accessToken: string,
  templateDocUrl: string,
  companyName: string,
  replacements: Array<{ find: string; replace: string }>
): Promise<string | null> {
  const docId = extractDocId(templateDocUrl);
  if (!docId) return null;
  const copyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${docId}/copy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: `CV - ${companyName}` }),
  });
  if (!copyRes.ok) { console.error("Drive copy error:", copyRes.status); return null; }
  const newDocId = (await copyRes.json()).id;
  if (replacements?.length) {
    const requests = replacements.map((r) => ({ replaceAllText: { containsText: { text: r.find, matchCase: true }, replaceText: r.replace } }));
    await fetch(`https://docs.googleapis.com/v1/documents/${newDocId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    });
  }
  return `https://docs.google.com/document/d/${newDocId}/edit`;
}

// ══════════════════════════════════════════
//  MAIN HANDLER — Async CV Tailoring
// ══════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const { userId, runId } = body;
    if (!userId || !runId) return ok({ error: "userId and runId required" });

    console.log(`cv-tailor-async: starting for run ${runId}`);

    // 1. Load settings
    const { data: settings } = await supabase
      .from("settings")
      .select("base_resume_text, shared_google_doc_url, llm_config, anthropic_api_key, openai_api_key, prompts")
      .eq("user_id", userId)
      .maybeSingle();

    const cvText = settings?.base_resume_text || "";
    if (cvText.length < 100) return ok({ error: "CV text too short", length: cvText.length });

    // Initialize AI config
    _llmConfig = settings?.llm_config || null;
    _aiKeys = { cerebras: CEREBRAS_KEY, anthropic: settings?.anthropic_api_key || "", openai: settings?.openai_api_key || "" };

    const templateDocUrl = settings?.shared_google_doc_url || "";
    const googleToken = await getGoogleAccessToken(supabase, userId);
    const cvTailorPrompt = settings?.prompts?.cv_tailor || `You tailor CVs by producing find-and-replace pairs. Extract top 5 JD keywords first. Each "find" MUST be EXACT substring (15+ chars). Each "replace" SIMILAR LENGTH (within 20%). Keep "Product Operations" identity. No em-dashes. No fabrication. 4-6 replacements.`;

    // 2. Get results from this run that are missing CV replacements
    const { data: results } = await supabase
      .from("agent_results")
      .select("id, job_title_text, job_company_text, job_description_text")
      .eq("run_id", runId)
      .eq("user_id", userId)
      .is("cv_replacements", null);

    if (!results?.length) {
      console.log("No results need CV tailoring");
      return ok({ message: "All results already have CVs", count: 0 });
    }

    console.log(`${results.length} results need CV tailoring`);

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

    let successCount = 0;
    let errorCount = 0;

    // 3. Process each result (max 10 to stay within timeout)
    for (const result of results.slice(0, 10)) {
      try {
        const data = await aiCallFull(
          cvTailorPrompt,
          `Target: ${result.job_title_text} at ${result.job_company_text}\nJob Description: ${(result.job_description_text || "").slice(0, 1500)}\n\nOriginal CV:\n${cvText}`,
          "resume_tailoring",
          { tools: cvTools, tool_choice: { type: "function", function: { name: "cv_replacements" } }, temperature: 0.3 }
        );

        const raw = parseReplacementsResponse(data);
        const valid = validateReplacements(raw, cvText);
        console.log(`${result.job_company_text}: ${raw.length} raw -> ${valid.length} valid`);

        if (valid.length > 0) {
          const updateData: any = { cv_replacements: valid };

          // Create Google Doc if we have a token and template
          if (googleToken && templateDocUrl) {
            try {
              const docUrl = await createTailoredCV(googleToken, templateDocUrl, result.job_company_text || "Tailored", valid);
              if (docUrl) {
                updateData.google_doc_url = docUrl;
                console.log(`CV created for ${result.job_company_text}:`, docUrl);
              }
            } catch (e) {
              console.error("CV doc error:", e);
            }
          }

          await supabase.from("agent_results").update(updateData).eq("id", result.id);
          successCount++;
        }

        await new Promise((r) => setTimeout(r, 200)); // Small delay between calls
      } catch (e: any) {
        console.error(`Error for ${result.job_company_text}:`, e?.message || e);
        errorCount++;
      }
    }

    console.log(`cv-tailor-async done: ${successCount} success, ${errorCount} errors out of ${results.length}`);
    return ok({ success: true, tailored: successCount, errors: errorCount, total: results.length });
  } catch (err: unknown) {
    console.error(err);
    return ok({ error: err instanceof Error ? err.message : String(err) });
  }
});
