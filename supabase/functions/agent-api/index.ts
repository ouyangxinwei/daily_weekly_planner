type Json = Record<string, unknown>;

const ALLOWED_ORIGINS = new Set([
  "https://ouyangxinwei.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const TASK_TYPES = new Set(["repository_audit", "general"]);
const TASK_STATUSES = new Set(["pending", "active", "paused", "completed", "failed"]);
const OPEN_RUN_STATUSES = new Set(["queued", "running", "paused"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 32 * 1024;

class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

function config() {
  const url = Deno.env.get("SUPABASE_URL");
  let key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!key) {
    const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (raw) {
      try { key = JSON.parse(raw).default ?? ""; }
      catch { throw new ApiError(503, "SERVER_CONFIGURATION_ERROR"); }
    }
  }
  if (!url || !key) throw new ApiError(503, "SERVER_CONFIGURATION_ERROR");
  return { url: url.replace(/\/+$/, ""), key };
}

function cors(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function response(body: Json, status: number, origin: string | null, requestId: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": "application/json; charset=utf-8",
      "X-Request-Id": requestId,
    },
  });
}

function parseBasicAuth(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) throw new ApiError(401, "AUTHENTICATION_FAILED");
  try {
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(header.slice(6).trim()), (c) => c.charCodeAt(0)),
    );
    const separator = decoded.indexOf(":");
    if (separator < 1) throw new Error("invalid");
    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    if (!username || !password || username.length > 80 || password.length > 200) throw new Error("invalid");
    return { username, password };
  } catch {
    throw new ApiError(401, "AUTHENTICATION_FAILED");
  }
}

async function authenticate(req: Request, requestId: string) {
  const credentials = parseBasicAuth(req);
  const valid = await rpc<boolean>("company_verify_credentials", {
    p_username: credentials.username,
    p_password: credentials.password,
  }, requestId);
  if (valid !== true) throw new ApiError(401, "AUTHENTICATION_FAILED");
  return credentials;
}

async function sha256Hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function applyRateLimit(req: Request, requestId: string) {
  const { key } = config();
  const ip = (req.headers.get("cf-connecting-ip") ?? "unknown").slice(0, 128);
  const ipHash = await sha256Hmac(ip || "unknown", key);
  const result = await rpc<{ allowed: boolean }>("company_consume_ip_rate_limit", {
    p_ip_hash: ipHash, p_max_requests: 30, p_window_seconds: 60,
  }, requestId);
  if (!result || result.allowed !== true) throw new ApiError(429, "RATE_LIMITED");
}

async function rpc<T>(name: string, args: Json, requestId: string): Promise<T> {
  const { url, key } = config();
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Client-Info": "agent-api/1.0",
  };
  if (key.startsWith("eyJ")) headers.Authorization = "Bearer " + key;
  let res: Response;
  try {
    res = await fetch(url + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers,
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    console.error("agent-api RPC network failure", { name, requestId });
    throw new ApiError(503, "DATABASE_UNAVAILABLE");
  }
  const raw = await res.text();
  let data: unknown = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = null; }
  }
  if (!res.ok) {
    const db = data && typeof data === "object" ? data as Json : {};
    if (db.code === "28000") throw new ApiError(401, "AUTHENTICATION_FAILED");
    console.error("agent-api RPC rejected", { name, status: res.status, dbCode: db.code ?? "unknown", requestId });
    throw new ApiError(500, "INTERNAL_ERROR");
  }
  return data as T;
}

async function db<T>(path: string, method = "GET", body?: unknown, requestId = ""): Promise<T> {
  const { url, key } = config();
  const headers: Record<string, string> = {
    apikey: key,
    Accept: "application/json",
    "X-Client-Info": "agent-api/1.0",
  };
  if (key.startsWith("eyJ")) headers.Authorization = "Bearer " + key;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers.Prefer = "return=representation";
  }
  let res: Response;
  try {
    res = await fetch(url + "/rest/v1/" + path, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    console.error("agent-api database network failure", { requestId });
    throw new ApiError(503, "DATABASE_UNAVAILABLE");
  }
  const raw = await res.text();
  let parsed: unknown = null;
  if (raw) {
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
  }
  if (!res.ok) {
    const dbError = parsed && typeof parsed === "object" ? parsed as Json : {};
    if (dbError.code === "23505") throw new ApiError(409, "RUN_ALREADY_OPEN");
    if (dbError.code === "23503") throw new ApiError(400, "INVALID_RELATION");
    console.error("agent-api database request rejected", { status: res.status, dbCode: dbError.code ?? "unknown", requestId });
    throw new ApiError(500, "DATABASE_ERROR");
  }
  return parsed as T;
}

async function readJson(req: Request): Promise<Json> {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) throw new ApiError(413, "REQUEST_TOO_LARGE");
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE");
  }
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new ApiError(413, "REQUEST_TOO_LARGE");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new ApiError(400, "INVALID_JSON"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new ApiError(400, "VALIDATION_ERROR");
  return parsed as Json;
}

function assertKeys(value: Json, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new ApiError(400, "VALIDATION_ERROR");
}

function queryValue(value: string) {
  return encodeURIComponent(value);
}

function ownerFilter(username: string) {
  return "owner_username=eq." + queryValue(username);
}

async function getOwnedTask(taskId: string, username: string, requestId: string) {
  if (!UUID_RE.test(taskId)) throw new ApiError(404, "NOT_FOUND");
  const rows = await db<Json[]>(
    "agent_tasks?select=*&id=eq." + queryValue(taskId) + "&" + ownerFilter(username) + "&limit=1",
    "GET", undefined, requestId,
  );
  if (!Array.isArray(rows) || !rows[0]) throw new ApiError(404, "NOT_FOUND");
  return rows[0];
}

async function getOwnedRun(runId: string, username: string, requestId: string) {
  if (!UUID_RE.test(runId)) throw new ApiError(404, "NOT_FOUND");
  const rows = await db<Json[]>(
    "agent_task_runs?select=*,agent_tasks!inner(owner_username)&id=eq." + queryValue(runId) +
      "&agent_tasks.owner_username=eq." + queryValue(username) + "&limit=1",
    "GET", undefined, requestId,
  );
  if (!Array.isArray(rows) || !rows[0]) throw new ApiError(404, "NOT_FOUND");
  return rows[0];
}

function makeSteps(task: Json): Json[] {
  const scope = task.scope && typeof task.scope === "object" && !Array.isArray(task.scope)
    ? task.scope as Json : {};
  const checks = Array.isArray(scope.checks) ? scope.checks : ["documentation", "code", "api", "database"];
  const allowed = new Set(["documentation", "code", "api", "database"]);
  const selected = checks.filter((item): item is string => typeof item === "string" && allowed.has(item));
  const unique = [...new Set(selected)];
  if (!unique.length) throw new ApiError(400, "INVALID_TASK_SCOPE");
  return [
    ...unique.map((check, index) => ({
      step_order: index + 1,
      step_key: "inspect_" + check,
      title: "检查 " + check,
      instructions: "只读检查目标仓库的 " + check + "，保存实际证据；无法确认时标记待验证，不得推断为未实现。",
      status: "pending",
      result: {},
      evidence: [],
    })),
    {
      step_order: unique.length + 1,
      step_key: "summarize",
      title: "汇总审查结果",
      instructions: "根据前序步骤的结果和证据生成报告，明确覆盖范围、未检查项和失败项。",
      status: "pending",
      result: {},
      evidence: [],
    },
  ];
}

async function createTask(body: Json, username: string, requestId: string) {
  assertKeys(body, ["title", "description", "task_type", "target_repository", "scope"]);
  if (typeof body.title !== "string" || body.title.trim().length < 1 || body.title.length > 200) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  const description = body.description ?? "";
  if (typeof description !== "string" || description.length > 5000) throw new ApiError(400, "VALIDATION_ERROR");
  const taskType = body.task_type ?? "repository_audit";
  if (typeof taskType !== "string" || !TASK_TYPES.has(taskType)) throw new ApiError(400, "VALIDATION_ERROR");
  if (typeof body.target_repository !== "string" ||
      !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(body.target_repository)) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  const scope = body.scope ?? {};
  if (!scope || typeof scope !== "object" || Array.isArray(scope)) throw new ApiError(400, "VALIDATION_ERROR");
  const rows = await db<Json[]>("agent_tasks?select=*", "POST", {
    owner_username: username,
    title: body.title.trim(),
    description,
    task_type: taskType,
    target_repository: body.target_repository,
    scope,
    status: "pending",
  }, requestId);
  if (!Array.isArray(rows) || !rows[0]) throw new ApiError(500, "DATABASE_ERROR");
  return rows[0];
}

async function listTasks(url: URL, username: string, requestId: string) {
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
  if (!Number.isInteger(limit) || !Number.isInteger(offset)) throw new ApiError(400, "VALIDATION_ERROR");
  const rows = await db<Json[]>(
    "agent_tasks?select=*&" + ownerFilter(username) + "&order=updated_at.desc&limit=" + limit + "&offset=" + offset,
    "GET", undefined, requestId,
  );
  const countRows = await db<Json[]>(
    "agent_tasks?select=id&" + ownerFilter(username),
    "GET", undefined, requestId,
  );
  return { items: rows, total: Array.isArray(countRows) ? countRows.length : 0, limit, offset };
}

async function taskDetail(taskId: string, username: string, requestId: string) {
  const task = await getOwnedTask(taskId, username, requestId);
  const runs = await db<Json[]>(
    "agent_task_runs?select=id,run_number,status,started_at,finished_at,created_at&task_id=eq." +
      queryValue(taskId) + "&order=created_at.desc&limit=10",
    "GET", undefined, requestId,
  );
  return { ...task, runs: Array.isArray(runs) ? runs : [] };
}

async function latestCommitSha(repository: string, requestId: string): Promise<string> {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new ApiError(400, "INVALID_REPOSITORY");
  let res: Response;
  try {
    res = await fetch("https://api.github.com/repos/" + repository + "/commits?per_page=1", {
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    console.error("agent-api GitHub revision lookup failed", { repository, requestId });
    throw new ApiError(503, "SOURCE_REVISION_UNAVAILABLE");
  }
  if (!res.ok) {
    console.error("agent-api GitHub revision lookup rejected", { repository, status: res.status, requestId });
    throw new ApiError(503, "SOURCE_REVISION_UNAVAILABLE");
  }
  const data = await res.json();
  const sha = Array.isArray(data) && data[0] && typeof data[0].sha === "string" ? data[0].sha : "";
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new ApiError(503, "SOURCE_REVISION_UNAVAILABLE");
  return sha;
}

async function createRun(taskId: string, username: string, requestId: string) {
  const task = await getOwnedTask(taskId, username, requestId);
  const scope = task.scope && typeof task.scope === "object" && !Array.isArray(task.scope)
    ? task.scope as Json : {};
  const standardRepository = typeof scope.standard_repository === "string"
    ? scope.standard_repository : "ouyangxinwei/oooo_Dev_Standard";
  const [standardCommitSha, targetCommitSha] = await Promise.all([
    latestCommitSha(standardRepository, requestId),
    latestCommitSha(String(task.target_repository), requestId),
  ]);
  const latest = await db<Json[]>(
    "agent_task_runs?select=run_number,status&task_id=eq." + queryValue(taskId) +
      "&order=run_number.desc&limit=1",
    "GET", undefined, requestId,
  );
  const previous = Array.isArray(latest) && latest[0] ? Number(latest[0].run_number) : 0;
  if (Array.isArray(latest) && latest[0] && OPEN_RUN_STATUSES.has(String(latest[0].status))) {
    throw new ApiError(409, "RUN_ALREADY_OPEN");
  }
  const runRows = await db<Json[]>("agent_task_runs?select=*", "POST", {
    task_id: taskId,
    run_number: previous + 1,
    status: "queued",
    standard_commit_sha: standardCommitSha,
    target_commit_sha: targetCommitSha,
  }, requestId);
  if (!Array.isArray(runRows) || !runRows[0]) throw new ApiError(500, "DATABASE_ERROR");
  const run = runRows[0];
  try {
    const steps = makeSteps(task).map((step) => ({ ...step, run_id: run.id }));
    await db<Json[]>("agent_run_steps?select=id", "POST", steps, requestId);
    await db<Json[]>("agent_tasks?id=eq." + queryValue(taskId) + "&" + ownerFilter(username), "PATCH", {
      status: "active", updated_at: new Date().toISOString(),
    }, requestId);
  } catch (error) {
    await db<Json[]>("agent_task_runs?id=eq." + queryValue(String(run.id)), "PATCH", {
      status: "failed", error_code: "STEP_INITIALIZATION_FAILED",
      error_message: "Could not initialize the run steps.", finished_at: new Date().toISOString(),
    }, requestId).catch(() => null);
    throw error;
  }
  const savedSteps = await db<Json[]>(
    "agent_run_steps?select=*&run_id=eq." + queryValue(String(run.id)) + "&order=step_order.asc",
    "GET", undefined, requestId,
  );
  return { ...run, steps: Array.isArray(savedSteps) ? savedSteps : [] };
}

async function runDetail(runId: string, username: string, requestId: string) {
  const run = await getOwnedRun(runId, username, requestId);
  const steps = await db<Json[]>(
    "agent_run_steps?select=*&run_id=eq." + queryValue(runId) + "&order=step_order.asc",
    "GET", undefined, requestId,
  );
  const cleanRun = { ...run };
  delete cleanRun.agent_tasks;
  return { ...cleanRun, steps: Array.isArray(steps) ? steps : [] };
}

async function transitionRun(runId: string, username: string, action: "pause" | "resume", requestId: string) {
  const run = await getOwnedRun(runId, username, requestId);
  const current = String(run.status);
  if (action === "pause" && !["queued", "running"].includes(current)) throw new ApiError(409, "INVALID_STATE_TRANSITION");
  if (action === "resume" && current !== "paused") throw new ApiError(409, "INVALID_STATE_TRANSITION");
  const next = action === "pause" ? "paused" : "queued";
  if (action === "resume") {
    await db<Json[]>(
      "agent_run_steps?run_id=eq." + queryValue(runId) + "&status=eq.running",
      "PATCH",
      { status: "pending", started_at: null, error_code: null, error_message: null, updated_at: new Date().toISOString() },
      requestId,
    );
  }
  const rows = await db<Json[]>(
    "agent_task_runs?id=eq." + queryValue(runId) + "&select=*",
    "PATCH",
    { status: next, ...(action === "pause" ? {} : { error_code: null, error_message: null }) },
    requestId,
  );
  const taskId = String(run.task_id);
  await db<Json[]>(
    "agent_tasks?id=eq." + queryValue(taskId),
    "PATCH",
    { status: action === "pause" ? "paused" : "active", updated_at: new Date().toISOString() },
    requestId,
  );
  return Array.isArray(rows) ? rows[0] : { id: runId, status: next };
}


type GitTreeEntry = { path: string; type: string; size?: number };

async function githubTree(repository: string, commitSha: string, requestId: string): Promise<string[]> {
  const url = "https://api.github.com/repos/" + repository + "/git/trees/" + commitSha + "?recursive=1";
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    console.error("agent-api GitHub tree network failure", { repository, requestId });
    throw new ApiError(503, "SOURCE_TREE_UNAVAILABLE");
  }
  if (!res.ok) {
    console.error("agent-api GitHub tree rejected", { repository, status: res.status, requestId });
    throw new ApiError(503, "SOURCE_TREE_UNAVAILABLE");
  }
  const data = await res.json() as { tree?: GitTreeEntry[]; truncated?: boolean };
  if (!Array.isArray(data.tree) || data.truncated === true) {
    throw new ApiError(503, "SOURCE_TREE_INCOMPLETE");
  }
  return data.tree.filter((entry) => entry.type === "blob" && typeof entry.path === "string")
    .map((entry) => entry.path);
}

const SOURCE_EXTENSIONS = /\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|cs|php|rb|swift|kt|kts|vue|svelte)$/i;

function pathsForCheck(paths: string[], check: string): string[] {
  switch (check) {
    case "documentation":
      return paths.filter((path) =>
        /(^|\/)readme(?:\.[^/]*)?$/i.test(path) ||
        /(^|\/)docs?\//i.test(path) ||
        /\.mdx?$/i.test(path)
      );
    case "code":
      return paths.filter((path) => SOURCE_EXTENSIONS.test(path));
    case "api":
      return paths.filter((path) =>
        /(^|\/)(api|apis|routes|controllers|openapi|swagger)(\/|\.|$)/i.test(path) ||
        /(^|\/)(openapi|swagger)\.[^/]+$/i.test(path)
      );
    case "database":
      return paths.filter((path) =>
        /(^|\/)(migrations?|schema|prisma|drizzle)(\/|\.|$)/i.test(path) ||
        /\.(sql|prisma)$/i.test(path)
      );
    default:
      return [];
  }
}

async function executeInventoryStep(step: Json, task: Json, run: Json, requestId: string) {
  const check = String(step.step_key).replace(/^inspect_/, "");
  const targetRepository = String(task.target_repository);
  const scope = task.scope && typeof task.scope === "object" && !Array.isArray(task.scope)
    ? task.scope as Json : {};
  const standardRepository = typeof scope.standard_repository === "string"
    ? scope.standard_repository : "ouyangxinwei/oooo_Dev_Standard";
  const [targetPaths, standardPaths] = await Promise.all([
    githubTree(targetRepository, String(run.target_commit_sha), requestId),
    githubTree(standardRepository, String(run.standard_commit_sha), requestId),
  ]);
  const targetMatches = pathsForCheck(targetPaths, check);
  const standardMatches = pathsForCheck(standardPaths, check);
  const targetSample = targetMatches.slice(0, 20);
  const standardSample = standardMatches.slice(0, 20);
  return {
    result: {
      check,
      assessment_type: "repository_file_inventory",
      conclusion: "inventory_only",
      target_repository: {
        name: targetRepository,
        commit_sha: String(run.target_commit_sha),
        matching_file_count: targetMatches.length,
        sample_paths: targetSample,
      },
      standard_repository: {
        name: standardRepository,
        commit_sha: String(run.standard_commit_sha),
        matching_file_count: standardMatches.length,
        sample_paths: standardSample,
      },
      limitations: [
        "本步骤只检查固定 Commit 的文件路径和文件类型，不代表已审查文件内容。",
        "文件存在不等于功能已实现；文件缺失也不能单独证明功能未实现。",
        "语义符合性、运行行为和实际部署状态仍需后续专项检查。",
      ],
    },
    evidence: [
      {
        type: "github_tree_inventory",
        repository: targetRepository,
        commit_sha: String(run.target_commit_sha),
        matched_count: targetMatches.length,
        sample_paths: targetSample,
      },
      {
        type: "github_tree_inventory",
        repository: standardRepository,
        commit_sha: String(run.standard_commit_sha),
        matched_count: standardMatches.length,
        sample_paths: standardSample,
      },
    ],
  };
}

function makeReport(steps: Json[], task: Json, run: Json) {
  const checks = steps.filter((step) => String(step.step_key).startsWith("inspect_"));
  const completed = checks.filter((step) => step.status === "completed").length;
  const failed = checks.filter((step) => step.status === "failed").length;
  const pending = checks.filter((step) => step.status === "pending" || step.status === "running").length;
  const lines = [
    "# Agent 仓库检查报告",
    "",
    "- 任务：" + String(task.title ?? ""),
    "- 目标仓库：" + String(task.target_repository ?? ""),
    "- 目标 Commit：" + String(run.target_commit_sha ?? ""),
    "- 规范仓库 Commit：" + String(run.standard_commit_sha ?? ""),
    "- 检查步骤：" + completed + " 完成 / " + failed + " 失败 / " + pending + " 未完成",
    "",
    "> 本报告第一版仅包含确定性的仓库文件清单检查，不等同于代码语义审查或功能验证。",
    "",
    "## 检查结果",
  ];
  for (const step of checks) {
    const result = step.result && typeof step.result === "object" ? step.result as Json : {};
    const target = result.target_repository && typeof result.target_repository === "object"
      ? result.target_repository as Json : {};
    const standard = result.standard_repository && typeof result.standard_repository === "object"
      ? result.standard_repository as Json : {};
    lines.push(
      "",
      "### " + String(step.title ?? step.step_key),
      "- 状态：" + String(step.status),
      "- 目标仓库匹配文件：" + Number(target.matching_file_count ?? 0),
      "- 规范仓库匹配文件：" + Number(standard.matching_file_count ?? 0),
      "- 结论：仅完成文件清单盘点，尚未判断实现状态。",
    );
    if (step.error_message) lines.push("- 错误：" + String(step.error_message));
  }
  lines.push(
    "",
    "## 覆盖范围说明",
    "- 已检查：上述状态为 completed 的文件清单步骤。",
    "- 未检查或失败：必须按步骤状态查看，不得解释为未实现。",
    "- 后续需要补充：文件内容规则检查、API 契约核对、数据库 migration 与运行态验证。",
  );
  return {
    result: {
      report_markdown: lines.join("\n"),
      coverage: { total: checks.length, completed, failed, pending },
      report_type: "deterministic_inventory_v1",
    },
    evidence: checks.map((step) => ({
      step_key: step.step_key,
      status: step.status,
      result: step.result ?? {},
    })),
  };
}

async function executeNextStep(runId: string, username: string, requestId: string) {
  const run = await getOwnedRun(runId, username, requestId);
  const runStatus = String(run.status);
  if (runStatus === "paused") throw new ApiError(409, "RUN_PAUSED");
  if (runStatus === "completed") return { run_id: runId, status: "completed", next_step_available: false };
  if (runStatus === "failed") throw new ApiError(409, "RUN_FAILED");
  if (!["queued", "running"].includes(runStatus)) throw new ApiError(409, "INVALID_STATE_TRANSITION");

  const task = await getOwnedTask(String(run.task_id), username, requestId);
  const allSteps = await db<Json[]>(
    "agent_run_steps?select=*&run_id=eq." + queryValue(runId) + "&order=step_order.asc",
    "GET", undefined, requestId,
  );
  if (!Array.isArray(allSteps) || !allSteps.length) throw new ApiError(409, "RUN_HAS_NO_STEPS");
  if (allSteps.some((item) => item.status === "running")) {
    throw new ApiError(409, "STEP_IN_PROGRESS");
  }

  const pending = allSteps.find((item) => item.status === "pending");
  if (!pending) {
    const summary = allSteps.find((item) => item.step_key === "summarize");
    if (summary?.status === "completed") {
      await db<Json[]>("agent_task_runs?id=eq." + queryValue(runId), "PATCH", {
        status: "completed", finished_at: new Date().toISOString(),
      }, requestId);
      await db<Json[]>("agent_tasks?id=eq." + queryValue(String(task.id)), "PATCH", {
        status: "completed", updated_at: new Date().toISOString(),
      }, requestId);
      return { run_id: runId, status: "completed", next_step_available: false };
    }
    throw new ApiError(409, "NO_PENDING_STEP");
  }

  const claimed = await db<Json[]>(
    "agent_run_steps?id=eq." + queryValue(String(pending.id)) + "&status=eq.pending&select=*",
    "PATCH",
    { status: "running", started_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    requestId,
  );
  if (!Array.isArray(claimed) || !claimed[0]) throw new ApiError(409, "STEP_ALREADY_CLAIMED");

  const claimedRun = await db<Json[]>(
    "agent_task_runs?id=eq." + queryValue(runId) + "&status=in.(queued,running)&select=id",
    "PATCH",
    { status: "running", started_at: run.started_at ?? new Date().toISOString() },
    requestId,
  );
  if (!Array.isArray(claimedRun) || !claimedRun[0]) {
    await db<Json[]>("agent_run_steps?id=eq." + queryValue(String(pending.id)), "PATCH", {
      status: "pending", started_at: null, updated_at: new Date().toISOString(),
    }, requestId).catch(() => null);
    throw new ApiError(409, "RUN_PAUSED");
  }

  try {
    let output: { result: Json; evidence: unknown[] };
    if (pending.step_key === "summarize") {
      const refreshed = await db<Json[]>(
        "agent_run_steps?select=*&run_id=eq." + queryValue(runId) + "&order=step_order.asc",
        "GET", undefined, requestId,
      );
      output = makeReport(Array.isArray(refreshed) ? refreshed : [], task, run);
    } else {
      output = await executeInventoryStep(pending, task, run, requestId);
    }

    await db<Json[]>("agent_run_steps?id=eq." + queryValue(String(pending.id)), "PATCH", {
      status: "completed",
      result: output.result,
      evidence: output.evidence,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
    }, requestId);

    const remaining = await db<Json[]>(
      "agent_run_steps?select=id,status&run_id=eq." + queryValue(runId) + "&status=eq.pending",
      "GET", undefined, requestId,
    );
    const nextAvailable = Array.isArray(remaining) && remaining.length > 0;
    const latestRunState = await db<Json[]>(
      "agent_task_runs?select=status&id=eq." + queryValue(runId) + "&limit=1",
      "GET", undefined, requestId,
    );
    const pausedAfterStep = Array.isArray(latestRunState) && latestRunState[0]?.status === "paused";
    if (!nextAvailable && !pausedAfterStep) {
      await db<Json[]>("agent_task_runs?id=eq." + queryValue(runId), "PATCH", {
        status: "completed", finished_at: new Date().toISOString(),
      }, requestId);
      await db<Json[]>("agent_tasks?id=eq." + queryValue(String(task.id)), "PATCH", {
        status: "completed", updated_at: new Date().toISOString(),
      }, requestId);
    }
    return {
      run_id: runId,
      step_id: pending.id,
      step_key: pending.step_key,
      step_status: "completed",
      run_status: pausedAfterStep ? "paused" : (nextAvailable ? "running" : "completed"),
      next_step_available: nextAvailable,
      result: output.result,
    };
  } catch (error) {
    const code = error instanceof ApiError ? error.code : "WORKER_STEP_FAILED";
    await db<Json[]>("agent_run_steps?id=eq." + queryValue(String(pending.id)), "PATCH", {
      status: "failed",
      error_code: code,
      error_message: "Worker could not complete this step. Review the request logs before retrying.",
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, requestId).catch(() => null);
    if (pending.step_key === "summarize") {
      await db<Json[]>("agent_task_runs?id=eq." + queryValue(runId), "PATCH", {
        status: "failed",
        error_code: code,
        error_message: "The Master summary step failed.",
        finished_at: new Date().toISOString(),
      }, requestId).catch(() => null);
      await db<Json[]>("agent_tasks?id=eq." + queryValue(String(task.id)), "PATCH", {
        status: "failed", updated_at: new Date().toISOString(),
      }, requestId).catch(() => null);
      throw error;
    }
    return {
      run_id: runId,
      step_id: pending.id,
      step_key: pending.step_key,
      step_status: "failed",
      run_status: "running",
      next_step_available: true,
      error_code: code,
    };
  }
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return response({ error: "ORIGIN_NOT_ALLOWED", request_id: requestId }, 403, null, requestId);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });

  try {
    if (!["GET", "POST"].includes(req.method)) throw new ApiError(405, "METHOD_NOT_ALLOWED");
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const functionIndex = segments.indexOf("agent-api");
    if (functionIndex >= 0) segments.splice(0, functionIndex + 1);
    const route = "/" + segments.join("/");
    await applyRateLimit(req, requestId);
    const credentials = await authenticate(req, requestId);

    if (route === "/agent/tasks" && req.method === "POST") {
      const task = await createTask(await readJson(req), credentials.username, requestId);
      return response({ data: task, request_id: requestId }, 201, origin, requestId);
    }
    if (route === "/agent/tasks" && req.method === "GET") {
      return response({ data: await listTasks(url, credentials.username, requestId), request_id: requestId }, 200, origin, requestId);
    }

    let match = route.match(/^\/agent\/tasks\/([^/]+)$/);
    if (match && req.method === "GET") {
      return response({ data: await taskDetail(match[1], credentials.username, requestId), request_id: requestId }, 200, origin, requestId);
    }
    match = route.match(/^\/agent\/tasks\/([^/]+)\/runs$/);
    if (match && req.method === "POST") {
      const body = await readJson(req);
      assertKeys(body, ["reason"]);
      if (body.reason !== undefined && body.reason !== "manual") throw new ApiError(400, "VALIDATION_ERROR");
      const run = await createRun(match[1], credentials.username, requestId);
      return response({ data: run, request_id: requestId }, 201, origin, requestId);
    }
    match = route.match(/^\/agent\/runs\/([^/]+)$/);
    if (match && req.method === "GET") {
      return response({ data: await runDetail(match[1], credentials.username, requestId), request_id: requestId }, 200, origin, requestId);
    }
    match = route.match(/^\/agent\/runs\/([^/]+)\/execute$/);
    if (match && req.method === "POST") {
      const body = await readJson(req);
      assertKeys(body, []);
      const result = await executeNextStep(match[1], credentials.username, requestId);
      return response({ data: result, request_id: requestId }, 200, origin, requestId);
    }
    match = route.match(/^\/agent\/runs\/([^/]+)\/(pause|resume)$/);
    if (match && req.method === "POST") {
      const body = await readJson(req);
      assertKeys(body, []);
      const run = await transitionRun(match[1], credentials.username, match[2] as "pause" | "resume", requestId);
      return response({ data: run, request_id: requestId }, match[2] === "resume" ? 202 : 200, origin, requestId);
    }
    throw new ApiError(404, "NOT_FOUND");
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(500, "INTERNAL_ERROR");
    if (apiError.status >= 500) console.error("agent-api request failed", { code: apiError.code, requestId });
    return response({ error: apiError.code, request_id: requestId }, apiError.status, origin, requestId);
  }
});
