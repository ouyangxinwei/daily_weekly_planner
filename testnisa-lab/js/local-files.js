export const LOCAL_JSON_MAX_BYTES = 2 * 1024 * 1024;

export function normalizeJsonFilename(input, fallback = "testnisa-export.json") {
  const raw = typeof input === "string" ? input.trim() : "";
  const source = raw || fallback;
  const base = source.replace(/\.json$/i, "")
    .replace(/[\\\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-").replace(/-+/g, "-")
    .replace(/^[. -]+|[. -]+$/g, "").slice(0, 80).replace(/[. -]+$/g, "");
  return (base || "testnisa-export") + ".json";
}

export async function readJsonFile(file, { maxBytes = LOCAL_JSON_MAX_BYTES } = {}) {
  if (!file || typeof file.arrayBuffer !== "function") throw new TypeError("请选择有效的本地文件");
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new RangeError("maxBytes 必须是正整数");
  const name = typeof file.name === "string" ? file.name : "";
  if (!/\.json$/i.test(name)) throw new TypeError("仅支持 .json 文件");
  if (Number.isFinite(file.size) && file.size > maxBytes) throw new RangeError("文件超过 " + maxBytes + " bytes 限制");
  const buffer = await file.arrayBuffer();
  if (!(buffer instanceof ArrayBuffer)) throw new TypeError("无法读取文件内容");
  if (buffer.byteLength === 0) throw new TypeError("JSON 文件为空");
  if (buffer.byteLength > maxBytes) throw new RangeError("文件超过 " + maxBytes + " bytes 限制");
  let source;
  try { source = new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
  catch { throw new TypeError("文件不是有效的 UTF-8 编码"); }
  const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  if (!text.trim()) throw new TypeError("JSON 文件为空");
  let value;
  try { value = JSON.parse(text); }
  catch { throw new SyntaxError("文件内容不是有效的 JSON"); }
  return { fileName: name, byteLength: buffer.byteLength, text, value };
}

export function downloadJsonText(text, filename, {
  documentRef = globalThis.document, urlApi = globalThis.URL,
  BlobImpl = globalThis.Blob, setTimeoutImpl = globalThis.setTimeout
} = {}) {
  if (typeof text !== "string") throw new TypeError("下载内容必须是 JSON 文本");
  try { JSON.parse(text); } catch { throw new SyntaxError("下载内容不是有效的 JSON"); }
  if (!documentRef?.body || typeof documentRef.createElement !== "function") throw new Error("当前环境不支持浏览器文件下载");
  if (!urlApi || typeof urlApi.createObjectURL !== "function" || typeof urlApi.revokeObjectURL !== "function") throw new Error("当前环境不支持 Blob URL 下载");
  if (typeof BlobImpl !== "function") throw new Error("当前环境不支持 Blob");
  const safeName = normalizeJsonFilename(filename);
  const objectUrl = urlApi.createObjectURL(new BlobImpl([text], { type: "application/json;charset=utf-8" }));
  const link = documentRef.createElement("a");
  link.href = objectUrl; link.download = safeName; link.hidden = true;
  documentRef.body.append(link);
  try { link.click(); }
  catch (error) { urlApi.revokeObjectURL(objectUrl); throw error; }
  finally { link.remove(); }
  if (typeof setTimeoutImpl === "function") setTimeoutImpl(() => urlApi.revokeObjectURL(objectUrl), 1000);
  else urlApi.revokeObjectURL(objectUrl);
  return { fileName: safeName, byteLength: new TextEncoder().encode(text).byteLength };
}
