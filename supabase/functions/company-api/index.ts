type JsonObject = Record<string, unknown>;

const ALLOWED_ORIGINS = new Set([
  "https://ouyangxinwei.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT = 30;
const RATE_WINDOW_SECONDS = 60;
const RECORD_TYPES = new Set([
  "customer", "project", "task", "follow_up", "transaction", "document", "file",
]);
const BUSINESS_TYPES = new Set(["trade", "software", "ecommerce"]);
const CURRENCIES = new Set(["JPY", "CNY", "USD"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function getConfig() {
  const url = Deno.env.get("SUPABASE_URL");
  let secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Supabase's newer secret keys are exposed as a JSON dictionary.
  if (!secretKey) {
    const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (raw) {
      try {
        secretKey = JSON.parse(raw).default ?? "";
      } catch {
        throw new ApiError(503, "SERVER_CONFIGURATION_ERROR");
      }
    }
  }
  if (!url || !secretKey) throw new ApiError(503, "SERVER_CONFIGURATION_ERROR");
  return { url: url.replace(/\/+$/, ""), secretKey };
}

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonResponse(
  body: JsonObject,
  status: number,
  origin: string | null,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      ...extraHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function parseBasicAuth(req: Request): { username: string; password: string } {
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
    if (!username || !password || username.length > 80 || password.length > 200) {
      throw new Error("invalid");
    }
    return { username, password };
  } catch {
    throw new ApiError(401, "AUTHENTICATION_FAILED");
  }
}

async function sha256Hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

function requestIp(req: Request): string {
  // Supabase's edge proxy provides cf-connecting-ip. Fall back only when absent.
  const candidate = req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
  return candidate.slice(0, 128) || "unknown";
}

async function rpc<T>(
  name: string,
  args: JsonObject,
  requestId: string,
): Promise<T> {
  const { url, secretKey } = getConfig();
  const headers: Record<string, string> = {
    "apikey": secretKey,
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Client-Info": "company-api/1.0",
  };

  // Legacy service_role keys are JWTs and need Authorization too.
  // New sb_secret_* keys must be sent on apikey only.
  if (secretKey.startsWith("eyJ")) headers.Authorization = "Bearer " + secretKey;

  let response: Response;
  try {
    response = await fetch(url + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers,
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    console.error("company-api RPC network failure", { rpc: name, requestId });
    throw new ApiError(503, "DATABASE_UNAVAILABLE");
  }

  const raw = await response.text();
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  if (!response.ok) {
    const dbError = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
    const dbCode = typeof dbError.code === "string" ? dbError.code : "";
    console.error("company-api RPC rejected", { rpc: name, status: response.status, dbCode, requestId });
    if (dbCode === "28000") throw new ApiError(401, "AUTHENTICATION_FAILED");
    if (dbCode === "P0002") throw new ApiError(404, "RECORD_NOT_FOUND");
    if (dbCode === "23503") throw new ApiError(409, "RECORD_IN_USE_OR_INVALID_RELATION");
    if (dbCode === "23514" || dbCode === "22023" || dbCode.startsWith("22")) {
      throw new ApiError(400, "VALIDATION_ERROR");
    }
    throw new ApiError(500, "INTERNAL_ERROR");
  }
  return parsed as T;
}

async function applyRateLimit(req: Request, requestId: string): Promise<void> {
  const { secretKey } = getConfig();
  const ipHash = await sha256Hmac(requestIp(req), secretKey);
  const result = await rpc<{ allowed: boolean; remaining: number; retry_after: number }>(
    "company_consume_ip_rate_limit",
    {
      p_ip_hash: ipHash,
      p_max_requests: RATE_LIMIT,
      p_window_seconds: RATE_WINDOW_SECONDS,
    },
    requestId,
  );
  if (!result?.allowed) {
    throw new ApiError(429, "RATE_LIMITED");
  }
}

async function authenticate(req: Request, requestId: string) {
  const credentials = parseBasicAuth(req);
  const valid = await rpc<boolean>(
    "company_verify_credentials",
    {
      p_username: credentials.username,
      p_password: credentials.password,
    },
    requestId,
  );
  if (valid !== true) throw new ApiError(401, "AUTHENTICATION_FAILED");
  return credentials;
}

async function readJson(req: Request): Promise<JsonObject> {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new ApiError(413, "REQUEST_TOO_LARGE");
  }
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE");
  }
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    throw new ApiError(413, "REQUEST_TOO_LARGE");
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "INVALID_JSON");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  return body as JsonObject;
}

function assertAllowedKeys(body: JsonObject, allowed: string[]) {
  const extra = Object.keys(body).filter((key) => !allowed.includes(key));
  if (extra.length) throw new ApiError(400, "VALIDATION_ERROR");
}

function validateCommonFields(body: JsonObject, creating: boolean) {
  const allowed = [
    "record_type", "business_type", "title", "status", "parent_record_id",
    "related_record_ids", "amount", "currency", "record_date", "due_date", "data",
  ];
  assertAllowedKeys(body, allowed);

  if (creating && (typeof body.record_type !== "string" || !RECORD_TYPES.has(body.record_type))) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  if (body.business_type !== undefined && body.business_type !== null &&
      (typeof body.business_type !== "string" || !BUSINESS_TYPES.has(body.business_type))) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  if (body.title !== undefined &&
      (typeof body.title !== "string" || body.title.trim().length < 1 || body.title.trim().length > 300)) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  if (creating && typeof body.title !== "string") throw new ApiError(400, "VALIDATION_ERROR");
  if (body.status !== undefined && body.status !== null &&
      (typeof body.status !== "string" || body.status.length > 80)) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  if (body.parent_record_id !== undefined && body.parent_record_id !== null &&
      (typeof body.parent_record_id !== "string" || !UUID_RE.test(body.parent_record_id))) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  if (body.related_record_ids !== undefined &&
      (!Array.isArray(body.related_record_ids) ||
        body.related_record_ids.length > 100 ||
        body.related_record_ids.some((id) => typeof id !== "string" || !UUID_RE.test(id)))) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  if (body.amount !== undefined && body.amount !== null &&
      !(typeof body.amount === "number" || (typeof body.amount === "string" && body.amount.trim() !== ""))) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  if (body.currency !== undefined && body.currency !== null &&
      (typeof body.currency !== "string" || !CURRENCIES.has(body.currency))) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  const amountProvided = body.amount !== undefined && body.amount !== null;
  const currencyProvided = body.currency !== undefined && body.currency !== null;
  if (amountProvided !== currencyProvided) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  if (creating && body.record_type === "transaction" && (!amountProvided || !currencyProvided)) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  for (const key of ["record_date", "due_date"]) {
    if (body[key] !== undefined && body[key] !== null &&
        (typeof body[key] !== "string" || Number.isNaN(Date.parse(body[key])))) {
      throw new ApiError(400, "VALIDATION_ERROR");
    }
  }
  if (body.data !== undefined &&
      (!body.data || typeof body.data !== "object" || Array.isArray(body.data))) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
}

function listArguments(url: URL, recordType: string | null): JsonObject {
  const rawLimit = url.searchParams.get("limit") ?? "20";
  const rawOffset = url.searchParams.get("offset") ?? "0";
  const limit = Number(rawLimit);
  const offset = Number(rawOffset);
  const businessType = url.searchParams.get("business_type");
  const status = url.searchParams.get("status");
  const keyword = url.searchParams.get("q");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
      !Number.isInteger(offset) || offset < 0 || offset > 1_000_000 ||
      (businessType !== null && !BUSINESS_TYPES.has(businessType)) ||
      (status !== null && status.length > 80) ||
      (keyword !== null && keyword.length > 100)) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  return {
    p_record_type: recordType,
    p_business_type: businessType,
    p_status: status,
    p_keyword: keyword,
    p_limit: limit,
    p_offset: offset,
  };
}

function validateCustomerCreate(body: JsonObject): JsonObject {
  assertAllowedKeys(body, ["title", "business_type", "status", "data", "record_date"]);
  validateCommonFields({ ...body, record_type: "customer" }, true);
  return { ...body, record_type: "customer" };
}

function validateCustomerPatch(body: JsonObject): JsonObject {
  assertAllowedKeys(body, [
    "title", "business_type", "status", "parent_record_id",
    "related_record_ids", "record_date", "data",
  ]);
  if (Object.keys(body).length === 0) throw new ApiError(400, "VALIDATION_ERROR");
  validateCommonFields(body, false);
  return body;
}

function validateRecordCreate(body: JsonObject): JsonObject {
  validateCommonFields(body, true);
  return body;
}

function validateRecordPatch(body: JsonObject): JsonObject {
  if (Object.keys(body).length === 0) throw new ApiError(400, "VALIDATION_ERROR");
  validateCommonFields(body, false);
  return body;
}

function mapRpcError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError(500, "INTERNAL_ERROR");
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get("origin");

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse({ error: "ORIGIN_NOT_ALLOWED", request_id: requestId }, 403, null);
  }

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const functionIndex = segments.indexOf("company-api");
    if (functionIndex >= 0) segments.splice(0, functionIndex + 1);
    const route = "/" + segments.join("/");
    if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method)) {
      throw new ApiError(405, "METHOD_NOT_ALLOWED");
    }

    await applyRateLimit(req, requestId);

    if (route === "/auth/verify" && req.method === "POST") {
      await authenticate(req, requestId);
      return jsonResponse({ data: { authenticated: true, username: "oooo" }, request_id: requestId }, 200, origin);
    }

    const credentials = await authenticate(req, requestId);
    const auth = {
      p_username: credentials.username,
      p_password: credentials.password,
    };

    const customerMatch = route.match(/^\/customers(?:\/([0-9a-f-]{36}))?$/i);
    const recordMatch = route.match(/^\/records(?:\/([0-9a-f-]{36}))?$/i);

    if (customerMatch) {
      const id = customerMatch[1];
      if (!id && req.method === "GET") {
        const result = await rpc("company_list_records", {
          ...auth,
          ...listArguments(url, "customer"),
        }, requestId);
        return jsonResponse({ data: result, request_id: requestId }, 200, origin);
      }
      if (!id && req.method === "POST") {
        const body = validateCustomerCreate(await readJson(req));
        const result = await rpc("company_create_record", { ...auth, p_record: body }, requestId);
        return jsonResponse({ data: result }, 201, origin, { "X-Request-Id": requestId });
      }
      if (id && !UUID_RE.test(id)) throw new ApiError(400, "VALIDATION_ERROR");
      if (id && req.method === "GET") {
        const result = await rpc("company_get_record", { ...auth, p_record_id: id }, requestId);
        if ((result as Record<string, unknown>).record_type !== "customer") {
          throw new ApiError(404, "RECORD_NOT_FOUND");
        }
        return jsonResponse({ data: result, request_id: requestId }, 200, origin);
      }
      if (id && req.method === "PATCH") {
        const patch = validateCustomerPatch(await readJson(req));
        const existing = await rpc<Record<string, unknown>>(
          "company_get_record", { ...auth, p_record_id: id }, requestId,
        );
        if (existing.record_type !== "customer") throw new ApiError(404, "RECORD_NOT_FOUND");
        const result = await rpc("company_update_record", {
          ...auth, p_record_id: id, p_patch: patch,
        }, requestId);
        return jsonResponse({ data: result, request_id: requestId }, 200, origin);
      }
      if (id && req.method === "DELETE") {
        const existing = await rpc<Record<string, unknown>>(
          "company_get_record", { ...auth, p_record_id: id }, requestId,
        );
        if (existing.record_type !== "customer") throw new ApiError(404, "RECORD_NOT_FOUND");
        const result = await rpc("company_delete_record", {
          ...auth, p_record_id: id,
        }, requestId);
        return jsonResponse({ data: { deleted: result === true }, request_id: requestId }, 200, origin);
      }
    }

    if (recordMatch) {
      const id = recordMatch[1];
      if (!id && req.method === "GET") {
        const recordType = url.searchParams.get("record_type");
        if (recordType && !RECORD_TYPES.has(recordType)) throw new ApiError(400, "VALIDATION_ERROR");
        const result = await rpc("company_list_records", {
          ...auth,
          ...listArguments(url, recordType),
        }, requestId);
        return jsonResponse({ data: result, request_id: requestId }, 200, origin);
      }
      if (!id && req.method === "POST") {
        const body = validateRecordCreate(await readJson(req));
        const result = await rpc("company_create_record", { ...auth, p_record: body }, requestId);
        return jsonResponse({ data: result }, 201, origin, { "X-Request-Id": requestId });
      }
      if (id && !UUID_RE.test(id)) throw new ApiError(400, "VALIDATION_ERROR");
      if (id && req.method === "GET") {
        const result = await rpc("company_get_record", { ...auth, p_record_id: id }, requestId);
        return jsonResponse({ data: result, request_id: requestId }, 200, origin);
      }
      if (id && req.method === "PATCH") {
        const patch = validateRecordPatch(await readJson(req));
        const result = await rpc("company_update_record", {
          ...auth, p_record_id: id, p_patch: patch,
        }, requestId);
        return jsonResponse({ data: result, request_id: requestId }, 200, origin);
      }
      if (id && req.method === "DELETE") {
        const result = await rpc("company_delete_record", {
          ...auth, p_record_id: id,
        }, requestId);
        return jsonResponse({ data: { deleted: result === true }, request_id: requestId }, 200, origin);
      }
    }

    throw new ApiError(404, "NOT_FOUND");
  } catch (error) {
    const apiError = mapRpcError(error);
    const headers: Record<string, string> = { "X-Request-Id": requestId };
    if (apiError.status === 429) headers["Retry-After"] = String(RATE_WINDOW_SECONDS);
    return jsonResponse({
      error: apiError.code,
      request_id: requestId,
    }, apiError.status, origin, headers);
  }
});
