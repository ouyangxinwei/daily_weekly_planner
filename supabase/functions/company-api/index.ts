import { collectAllPages, IncompleteListError, type ListPage } from "./list-all.ts";

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
const TASK_STATUSES = new Set(["todo", "in_progress", "blocked", "completed"]);
const TRANSACTION_STATUSES = new Set(["planned", "completed", "cancelled"]);
const TRANSACTION_DIRECTIONS = new Set(["income", "expense"]);
const DOCUMENT_STATUSES = new Set(["draft", "issued", "completed", "void"]);
const DOCUMENT_TYPES = new Set(["quote", "contract", "invoice", "order", "receipt", "other"]);
const MAX_TRANSACTION_AMOUNT = 100_000_000_000_000; // numeric(20,6) upper bound
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Stage 3-A private attachments. Must match the bucket created by
// supabase/migrations/20261121090000_company_documents_storage_stage_3a.sql.
const FILE_BUCKET = "company-documents";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SIGNED_DOWNLOAD_SECONDS = 300;
const ATTACHABLE_RECORD_TYPES = new Set(["customer", "project", "task", "follow_up", "transaction", "document"]);
const ALLOWED_FILE_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const FILE_PATH_RE = /^([0-9a-f-]{36})\/([0-9a-f-]{36})$/i;

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

function corsHeaders(origin: string | null): Record<string, string> {
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
  const candidate = req.headers.get("cf-connecting-ip") ?? "unknown";
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

function validateTaskFields(body: JsonObject, creating: boolean) {
  if (creating && (typeof body.parent_record_id !== "string" || !UUID_RE.test(body.parent_record_id))) {
    throw new ApiError(400, "TASK_PROJECT_REQUIRED");
  }
  if (creating && (typeof body.status !== "string" || !TASK_STATUSES.has(body.status))) {
    throw new ApiError(400, "INVALID_TASK_STATUS");
  }
  if (body.status !== undefined && (typeof body.status !== "string" || !TASK_STATUSES.has(body.status))) {
    throw new ApiError(400, "INVALID_TASK_STATUS");
  }
  if (body.data !== undefined) {
    const description = (body.data as JsonObject).description;
    if (description !== undefined && (typeof description !== "string" || description.length > 5000)) {
      throw new ApiError(400, "VALIDATION_ERROR");
    }
  }
}

async function assertTaskProject(auth: JsonObject, projectId: unknown, requestId: string) {
  if (typeof projectId !== "string" || !UUID_RE.test(projectId)) {
    throw new ApiError(400, "TASK_PROJECT_REQUIRED");
  }
  const project = await rpc<Record<string, unknown>>("company_get_record", { ...auth, p_record_id: projectId }, requestId);
  if (project.record_type !== "project") throw new ApiError(400, "TASK_PROJECT_INVALID");
}

async function listProjectTasks(auth: JsonObject, projectId: string, url: URL, requestId: string) {
  const args = listArguments(url, "task");
  if (args.p_status !== null && !TASK_STATUSES.has(String(args.p_status))) throw new ApiError(400, "INVALID_TASK_STATUS");
  const limit = Number(args.p_limit), offset = Number(args.p_offset);
  const all = await listAllRecords(auth, {
    p_record_type: "task", p_business_type: null, p_status: args.p_status, p_keyword: args.p_keyword,
  }, requestId);
  const matches = all.filter(item => item.parent_record_id === projectId);
  return { items: matches.slice(offset, offset + limit), total: matches.length, limit, offset };
}

// V10.58: every internal scan reads all pages and verifies them (see list-all.ts).
async function listAllRecords(auth: JsonObject, filters: JsonObject, requestId: string): Promise<Record<string, unknown>[]> {
  try {
    return await collectAllPages<Record<string, unknown>>((offset, limit) =>
      rpc<ListPage>("company_list_records", { ...auth, ...filters, p_limit: limit, p_offset: offset }, requestId));
  } catch (error) {
    if (error instanceof IncompleteListError) {
      console.error("company-api list scan incomplete", { reason: error.reason, requestId });
      throw new ApiError(503, "LIST_INCOMPLETE");
    }
    throw error;
  }
}

function validateProjectProgressFields(body: JsonObject) {
  if (body.data === undefined) return;
  const data = body.data as JsonObject;
  if (data.progress_mode !== undefined && !["manual", "auto"].includes(String(data.progress_mode))) {
    throw new ApiError(400, "INVALID_PROJECT_PROGRESS_MODE");
  }
  for (const key of ["progress_percent", "manual_progress_percent"]) {
    if (data[key] !== undefined && (!Number.isInteger(data[key]) || Number(data[key]) < 0 || Number(data[key]) > 100)) {
      throw new ApiError(400, "INVALID_PROJECT_PROGRESS");
    }
  }
}

function optionalText(data: JsonObject, key: string, max: number) {
  const value = data[key];
  if (value !== undefined && value !== null && (typeof value !== "string" || value.length > max)) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
}

function validateTransactionFields(body: JsonObject, creating: boolean) {
  if ((creating || body.status !== undefined) &&
      (typeof body.status !== "string" || !TRANSACTION_STATUSES.has(body.status))) {
    throw new ApiError(400, "INVALID_TRANSACTION_STATUS");
  }
  if (creating || body.amount !== undefined) {
    const amount = Number(body.amount);
    if (body.amount === null || !Number.isFinite(amount) || amount <= 0 || amount >= MAX_TRANSACTION_AMOUNT) {
      throw new ApiError(400, "INVALID_TRANSACTION_AMOUNT");
    }
  }
  if (creating || body.data !== undefined) {
    const data = (body.data ?? {}) as JsonObject;
    if (typeof data.direction !== "string" || !TRANSACTION_DIRECTIONS.has(data.direction)) {
      throw new ApiError(400, "INVALID_TRANSACTION_DIRECTION");
    }
    optionalText(data, "category", 80);
    optionalText(data, "notes", 5000);
  }
}

function validateDocumentFields(body: JsonObject, creating: boolean) {
  if ((creating || body.status !== undefined) &&
      (typeof body.status !== "string" || !DOCUMENT_STATUSES.has(body.status))) {
    throw new ApiError(400, "INVALID_DOCUMENT_STATUS");
  }
  if (creating || body.data !== undefined) {
    const data = (body.data ?? {}) as JsonObject;
    if (typeof data.document_type !== "string" || !DOCUMENT_TYPES.has(data.document_type)) {
      throw new ApiError(400, "INVALID_DOCUMENT_TYPE");
    }
    optionalText(data, "document_number", 120);
    optionalText(data, "notes", 5000);
  }
}

function validateRecordCreate(body: JsonObject): JsonObject {
  validateCommonFields(body, true);
  // File metadata is only created by POST /files after the object is verified in Storage.
  if (body.record_type === "file") throw new ApiError(400, "FILE_ENDPOINT_REQUIRED");
  if (body.record_type === "task") validateTaskFields(body, true);
  if (body.record_type === "project") validateProjectProgressFields(body);
  if (body.record_type === "transaction") validateTransactionFields(body, true);
  if (body.record_type === "document") validateDocumentFields(body, true);
  return body;
}

// ---------------------------------------------------------------------------
// Storage (service role only). The browser never receives the secret key; it
// only receives short-lived signed URLs for a single object.
// ---------------------------------------------------------------------------

async function storageRequest(
  method: string,
  path: string,
  requestId: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const { url, secretKey } = getConfig();
  const headers: Record<string, string> = { "apikey": secretKey, "Accept": "application/json" };
  if (secretKey.startsWith("eyJ")) headers.Authorization = "Bearer " + secretKey;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let response: Response;
  try {
    response = await fetch(url + "/storage/v1" + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    console.error("company-api storage network failure", { requestId });
    throw new ApiError(503, "STORAGE_UNAVAILABLE");
  }
  const raw = await response.text();
  let data: unknown = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = null; }
  }
  return { status: response.status, data };
}

function encodeObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function fileNameIsValid(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 1 && value.length <= 255 &&
    !/[\\/\u0000-\u001f]/.test(value);
}

function validateFileDescriptor(body: JsonObject) {
  if (typeof body.parent_record_id !== "string" || !UUID_RE.test(body.parent_record_id)) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  if (!fileNameIsValid(body.file_name)) throw new ApiError(400, "INVALID_FILE_NAME");
  if (typeof body.mime_type !== "string" || !ALLOWED_FILE_MIME_TYPES.has(body.mime_type)) {
    throw new ApiError(400, "FILE_TYPE_NOT_ALLOWED");
  }
  if (!Number.isInteger(body.file_size) || Number(body.file_size) < 1) {
    throw new ApiError(400, "VALIDATION_ERROR");
  }
  if (Number(body.file_size) > MAX_FILE_BYTES) throw new ApiError(413, "FILE_TOO_LARGE");
}

async function assertAttachableParent(auth: JsonObject, parentId: string, requestId: string) {
  const parent = await rpc<Record<string, unknown>>("company_get_record", { ...auth, p_record_id: parentId }, requestId);
  if (!ATTACHABLE_RECORD_TYPES.has(String(parent.record_type))) throw new ApiError(400, "INVALID_FILE_PARENT");
  return parent;
}

async function createSignedUpload(auth: JsonObject, body: JsonObject, requestId: string) {
  assertAllowedKeys(body, ["parent_record_id", "file_name", "mime_type", "file_size"]);
  validateFileDescriptor(body);
  const parentId = String(body.parent_record_id);
  await assertAttachableParent(auth, parentId, requestId);
  // Server-generated, unpredictable object path. The original file name is metadata only.
  const path = parentId.toLowerCase() + "/" + crypto.randomUUID();
  const result = await storageRequest("POST", "/object/upload/sign/" + FILE_BUCKET + "/" + encodeObjectPath(path), requestId, {});
  const signed = result.data && typeof result.data === "object" ? result.data as JsonObject : {};
  if (result.status !== 200 || typeof signed.url !== "string") {
    console.error("company-api signed upload failed", { status: result.status, requestId });
    throw new ApiError(502, "STORAGE_SIGN_FAILED");
  }
  const { url } = getConfig();
  return { path, upload_url: url + "/storage/v1" + signed.url, max_bytes: MAX_FILE_BYTES };
}

async function findStoredObject(path: string, requestId: string) {
  const [folder, name] = path.split("/");
  const result = await storageRequest("POST", "/object/list/" + FILE_BUCKET, requestId, {
    prefix: folder, search: name, limit: 10, offset: 0,
  });
  if (result.status !== 200 || !Array.isArray(result.data)) throw new ApiError(502, "STORAGE_UNAVAILABLE");
  const item = (result.data as JsonObject[]).find((entry) => entry.name === name);
  if (!item) return null;
  const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata as JsonObject : {};
  return { size: Number(metadata.size ?? metadata.contentLength ?? -1), mimeType: String(metadata.mimetype ?? "") };
}

async function removeStoredObject(path: string, requestId: string): Promise<boolean> {
  // Bulk delete is idempotent: an already-missing object is not an error.
  const result = await storageRequest("DELETE", "/object/" + FILE_BUCKET, requestId, { prefixes: [path] });
  if (result.status !== 200) {
    console.error("company-api storage delete failed", { status: result.status, requestId });
    return false;
  }
  return true;
}

async function completeUpload(auth: JsonObject, body: JsonObject, requestId: string) {
  assertAllowedKeys(body, ["parent_record_id", "path", "file_name", "mime_type", "file_size"]);
  validateFileDescriptor(body);
  const parentId = String(body.parent_record_id).toLowerCase();
  const match = typeof body.path === "string" ? body.path.match(FILE_PATH_RE) : null;
  if (!match || match[1].toLowerCase() !== parentId || !UUID_RE.test(match[2])) {
    throw new ApiError(400, "INVALID_FILE_PATH");
  }
  const path = String(body.path);
  const parent = await assertAttachableParent(auth, parentId, requestId);
  const stored = await findStoredObject(path, requestId);
  if (!stored) throw new ApiError(409, "FILE_NOT_UPLOADED");
  if (stored.size !== Number(body.file_size) || (stored.mimeType && stored.mimeType !== body.mime_type)) {
    await removeStoredObject(path, requestId);
    throw new ApiError(400, "FILE_VERIFICATION_FAILED");
  }
  const fileName = String(body.file_name).trim();
  try {
    return await rpc("company_create_record", {
      ...auth,
      p_record: {
        record_type: "file",
        title: fileName.slice(0, 300),
        business_type: parent.business_type ?? null,
        status: "stored",
        parent_record_id: parentId,
        data: {
          file: {
            bucket: FILE_BUCKET,
            path,
            fileName,
            mimeType: body.mime_type,
            fileSize: Number(body.file_size),
            uploadedAt: new Date().toISOString(),
          },
        },
      },
    }, requestId);
  } catch (error) {
    // Avoid orphaned objects when metadata cannot be saved.
    await removeStoredObject(path, requestId);
    throw error;
  }
}

function storedFileInfo(record: Record<string, unknown>) {
  if (record.record_type !== "file") throw new ApiError(404, "RECORD_NOT_FOUND");
  const data = record.data && typeof record.data === "object" ? record.data as JsonObject : {};
  const file = data.file && typeof data.file === "object" ? data.file as JsonObject : {};
  if (file.bucket !== FILE_BUCKET || typeof file.path !== "string" || !FILE_PATH_RE.test(file.path)) {
    throw new ApiError(409, "FILE_METADATA_INVALID");
  }
  return { path: file.path, fileName: typeof file.fileName === "string" ? file.fileName : String(record.title ?? "file") };
}

async function createSignedDownload(auth: JsonObject, id: string, requestId: string) {
  const record = await rpc<Record<string, unknown>>("company_get_record", { ...auth, p_record_id: id }, requestId);
  const info = storedFileInfo(record);
  const result = await storageRequest("POST", "/object/sign/" + FILE_BUCKET + "/" + encodeObjectPath(info.path), requestId, {
    expiresIn: SIGNED_DOWNLOAD_SECONDS,
  });
  const signed = result.data && typeof result.data === "object" ? result.data as JsonObject : {};
  if (result.status === 404 || result.status === 400) throw new ApiError(404, "FILE_OBJECT_MISSING");
  if (result.status !== 200 || typeof signed.signedURL !== "string") throw new ApiError(502, "STORAGE_SIGN_FAILED");
  const { url } = getConfig();
  const separator = signed.signedURL.includes("?") ? "&" : "?";
  return {
    url: url + "/storage/v1" + signed.signedURL + separator + "download=" + encodeURIComponent(info.fileName),
    expires_in: SIGNED_DOWNLOAD_SECONDS,
    file_name: info.fileName,
  };
}

async function deleteStoredFile(auth: JsonObject, id: string, requestId: string) {
  const record = await rpc<Record<string, unknown>>("company_get_record", { ...auth, p_record_id: id }, requestId);
  const info = storedFileInfo(record);
  // Storage first; if that fails keep the metadata so the user can retry.
  if (!await removeStoredObject(info.path, requestId)) throw new ApiError(502, "STORAGE_DELETE_FAILED");
  const deleted = await rpc("company_delete_record", { ...auth, p_record_id: id }, requestId);
  return { deleted: deleted === true };
}

async function listRecordFiles(auth: JsonObject, parentId: string, requestId: string) {
  const all = await listAllRecords(auth, {
    p_record_type: "file", p_business_type: null, p_status: null, p_keyword: null,
  }, requestId);
  const items = all.filter((item) => String(item.parent_record_id).toLowerCase() === parentId.toLowerCase());
  return { items, total: items.length };
}

function validateRecordPatch(body: JsonObject): JsonObject {
  if (Object.keys(body).length === 0) throw new ApiError(400, "VALIDATION_ERROR");
  assertAllowedKeys(body, [
    "business_type", "title", "status", "parent_record_id",
    "related_record_ids", "amount", "currency", "record_date", "due_date", "data",
  ]);
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

    if (route === "/files/upload-url" && req.method === "POST") {
      const result = await createSignedUpload(auth, await readJson(req), requestId);
      return jsonResponse({ data: result, request_id: requestId }, 200, origin);
    }
    if (route === "/files" && req.method === "POST") {
      const result = await completeUpload(auth, await readJson(req), requestId);
      return jsonResponse({ data: result }, 201, origin, { "X-Request-Id": requestId });
    }
    if (route === "/files" && req.method === "GET") {
      const parentId = url.searchParams.get("parent_record_id") ?? "";
      if (!UUID_RE.test(parentId)) throw new ApiError(400, "VALIDATION_ERROR");
      await assertAttachableParent(auth, parentId, requestId);
      const result = await listRecordFiles(auth, parentId, requestId);
      return jsonResponse({ data: result, request_id: requestId }, 200, origin);
    }
    const fileDownloadMatch = route.match(/^\/files\/([0-9a-f-]{36})\/download-url$/i);
    if (fileDownloadMatch && req.method === "GET") {
      if (!UUID_RE.test(fileDownloadMatch[1])) throw new ApiError(400, "VALIDATION_ERROR");
      const result = await createSignedDownload(auth, fileDownloadMatch[1], requestId);
      return jsonResponse({ data: result, request_id: requestId }, 200, origin);
    }
    const fileMatch = route.match(/^\/files\/([0-9a-f-]{36})$/i);
    if (fileMatch && req.method === "DELETE") {
      if (!UUID_RE.test(fileMatch[1])) throw new ApiError(400, "VALIDATION_ERROR");
      const result = await deleteStoredFile(auth, fileMatch[1], requestId);
      return jsonResponse({ data: result, request_id: requestId }, 200, origin);
    }

    const projectTasksMatch = route.match(/^\/projects\/([0-9a-f-]{36})\/tasks$/i);
    const customerMatch = route.match(/^\/customers(?:\/([0-9a-f-]{36}))?$/i);
    const recordMatch = route.match(/^\/records(?:\/([0-9a-f-]{36}))?$/i);

    if (projectTasksMatch && req.method === "GET") {
      const projectId = projectTasksMatch[1];
      if (!UUID_RE.test(projectId)) throw new ApiError(400, "VALIDATION_ERROR");
      const project = await rpc<Record<string, unknown>>("company_get_record", { ...auth, p_record_id: projectId }, requestId);
      if (project.record_type !== "project") throw new ApiError(404, "RECORD_NOT_FOUND");
      const result = await listProjectTasks(auth, projectId, url, requestId);
      return jsonResponse({ data: result, request_id: requestId }, 200, origin);
    }

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
        if (recordType === "task" && url.searchParams.get("status") && !TASK_STATUSES.has(url.searchParams.get("status")!)) throw new ApiError(400, "INVALID_TASK_STATUS");
        const result = await rpc("company_list_records", {
          ...auth,
          ...listArguments(url, recordType),
        }, requestId);
        return jsonResponse({ data: result, request_id: requestId }, 200, origin);
      }
      if (!id && req.method === "POST") {
        const body = validateRecordCreate(await readJson(req));
        if (body.record_type === "task") await assertTaskProject(auth, body.parent_record_id, requestId);
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
        const existing = await rpc<Record<string, unknown>>("company_get_record", { ...auth, p_record_id: id }, requestId);
        if (existing.record_type === "file") throw new ApiError(400, "FILE_ENDPOINT_REQUIRED");
        if (existing.record_type === "transaction") validateTransactionFields(patch, false);
        if (existing.record_type === "document") validateDocumentFields(patch, false);
        if (existing.record_type === "project") {
          validateProjectProgressFields(patch);
          const existingData = existing.data && typeof existing.data === "object" ? existing.data as JsonObject : {};
          const incomingData = patch.data && typeof patch.data === "object" ? patch.data as JsonObject : {};
          const nextMode = String(incomingData.progress_mode ?? existingData.progress_mode ?? "manual");
          if (existingData.progress_mode === "auto" && nextMode === "auto") {
            for (const key of ["progress_percent", "manual_progress_percent"]) {
              if (incomingData[key] !== undefined && incomingData[key] !== existingData[key]) {
                throw new ApiError(400, "AUTOMATIC_PROGRESS_IS_READ_ONLY");
              }
            }
          }
        }
        if (existing.record_type === "task") {
          validateTaskFields(patch, false);
          const nextProjectId = patch.parent_record_id === undefined ? existing.parent_record_id : patch.parent_record_id;
          await assertTaskProject(auth, nextProjectId, requestId);
        }
        const result = await rpc("company_update_record", {
          ...auth, p_record_id: id, p_patch: patch,
        }, requestId);
        return jsonResponse({ data: result, request_id: requestId }, 200, origin);
      }
      if (id && req.method === "DELETE") {
        const existing = await rpc<Record<string, unknown>>("company_get_record", { ...auth, p_record_id: id }, requestId);
        // Attachments must be removed through DELETE /files/:id so the Storage object is deleted too.
        if (existing.record_type === "file") throw new ApiError(400, "FILE_ENDPOINT_REQUIRED");
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
