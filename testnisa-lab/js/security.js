const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

export function validateText(value, { required = false, maxLength = 200, trim = true, allowEmpty = !required } = {}) {
  if (typeof value !== "string") throw new TypeError("Value must be a string");
  if (!Number.isInteger(maxLength) || maxLength < 0) throw new RangeError("maxLength must be a non-negative integer");
  if (CONTROL_CHARS.test(value)) throw new TypeError("Text contains unsupported control characters");
  const result = trim ? value.trim() : value;
  if (!allowEmpty && result.length === 0) throw new TypeError("Text is required");
  if (Array.from(result).length > maxLength) throw new RangeError(`Text must not exceed ${maxLength} characters`);
  return result;
}

export function validateNumber(value, { min = -Infinity, max = Infinity, maxDecimals = 8, required = true } = {}) {
  if (value === "" || value === null || value === undefined) {
    if (!required) return null;
    throw new TypeError("Number is required");
  }
  if (!Number.isInteger(maxDecimals) || maxDecimals < 0) throw new RangeError("maxDecimals must be a non-negative integer");
  const text = typeof value === "number" ? String(value) : value;
  if (typeof text !== "string" || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(text)) throw new TypeError("Number must use a plain decimal format");
  if ((text.split(".")[1] ?? "").length > maxDecimals) throw new RangeError(`Number must not exceed ${maxDecimals} decimal places`);
  const number = Number(text);
  if (!Number.isFinite(number)) throw new TypeError("Number must be finite");
  if (number < min || number > max) throw new RangeError(`Number must be between ${min} and ${max}`);
  return number;
}

export function validateEnum(value, allowedValues) {
  if (!Array.isArray(allowedValues) || allowedValues.length === 0) throw new TypeError("allowedValues must be a non-empty array");
  if (!allowedValues.includes(value)) throw new TypeError("Value is not an allowed option");
  return value;
}

export function validateSafeUrl(value, { protocols = ["https:"] } = {}) {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim() || CONTROL_CHARS.test(value)) throw new TypeError("URL must be a non-empty, clean string");
  let url;
  try { url = new URL(value); } catch { throw new TypeError("URL must be an absolute URL"); }
  if (!Array.isArray(protocols) || !protocols.includes(url.protocol)) throw new TypeError("URL protocol is not allowed");
  if (url.username || url.password) throw new TypeError("URLs containing credentials are not allowed");
  return url.href;
}

// Render untrusted values as text only; never interpret them as HTML.
export function renderText(target, value) {
  if (!target || typeof target !== "object" || !("textContent" in target)) throw new TypeError("A text-capable DOM element is required");
  target.textContent = value === null || value === undefined ? "" : String(value);
}
