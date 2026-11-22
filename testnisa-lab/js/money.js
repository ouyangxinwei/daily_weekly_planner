const DECIMAL_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/;
const MAX_DIGITS = 30;

function assertScale(scale) {
  if (!Number.isInteger(scale) || scale < 0 || scale > 8) {
    throw new RangeError("scale must be an integer between 0 and 8");
  }
}
function assertRounding(rounding) {
  if (rounding !== "half-up" && rounding !== "truncate") {
    throw new TypeError("unsupported rounding mode");
  }
}
function parseDecimal(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_DIGITS + 10) {
    throw new TypeError("amount must be a decimal string with at most 30 digits");
  }
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) throw new TypeError("invalid decimal format");
  const [, sign, whole, fraction = ""] = match;
  if (whole.length + fraction.length > MAX_DIGITS) {
    throw new RangeError("amount exceeds the supported digit limit");
  }
  return { negative: sign === "-", whole, fraction };
}
export function decimalToScaledInteger(value, scale, rounding = "half-up") {
  assertScale(scale);
  assertRounding(rounding);
  const parsed = parseDecimal(value);
  const kept = parsed.fraction.slice(0, scale).padEnd(scale, "0");
  const discarded = parsed.fraction.slice(scale);
  let magnitude = BigInt(parsed.whole + kept);
  if (rounding === "half-up" && discarded.length > 0 && discarded[0] >= "5") magnitude += 1n;
  return parsed.negative ? -magnitude : magnitude;
}
export function scaledIntegerToDecimal(value, scale) {
  assertScale(scale);
  if (typeof value !== "bigint") throw new TypeError("value must be a BigInt");
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const digits = absolute.toString().padStart(scale + 1, "0");
  if (scale === 0) return (negative ? "-" : "") + digits;
  const split = digits.length - scale;
  return (negative ? "-" : "") + digits.slice(0, split) + "." + digits.slice(split);
}
export function multiplyDecimalToScaledInteger(amount, rate, outputScale, rounding = "half-up") {
  assertScale(outputScale);
  assertRounding(rounding);
  const a = parseDecimal(amount);
  const r = parseDecimal(rate);
  const product = BigInt(a.whole + a.fraction) * BigInt(r.whole + r.fraction);
  const productScale = a.fraction.length + r.fraction.length;
  const shift = productScale - outputScale;
  let magnitude;
  if (shift <= 0) {
    magnitude = product * (10n ** BigInt(-shift));
  } else {
    const divisor = 10n ** BigInt(shift);
    magnitude = product / divisor;
    const remainder = product % divisor;
    if (rounding === "half-up" && remainder * 2n >= divisor) magnitude += 1n;
  }
  return a.negative !== r.negative ? -magnitude : magnitude;
}
export function formatScaledInteger(value, scale, locale = "en-US") {
  assertScale(scale);
  if (typeof value !== "bigint") throw new TypeError("value must be a BigInt");
  const decimal = scaledIntegerToDecimal(value, scale);
  const negative = decimal.startsWith("-");
  const unsigned = negative ? decimal.slice(1) : decimal;
  const [whole, fraction] = unsigned.split(".");
  const grouped = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(BigInt(whole));
  return (negative ? "-" : "") + grouped + (fraction === undefined ? "" : "." + fraction);
}
export function convertDecimalAmount(amount, rate, targetScale) {
  const minorUnits = multiplyDecimalToScaledInteger(amount, rate, targetScale, "half-up");
  return { minorUnits, decimal: scaledIntegerToDecimal(minorUnits, targetScale) };
}
