// V10.58: pure server-side checks for Phase 3-A (no Deno APIs, erasable TypeScript only,
// so scripts/validate-v10.58.mjs can import this file in Node).

// Amounts are NUMERIC(20,6). Reject anything the database would silently round:
// at most 14 integer digits, at most 6 decimals, plain decimal notation only.
const AMOUNT_RE = /^\d{1,14}(?:\.\d{1,6})?$/;

export function isValidTransactionAmount(value: unknown): boolean {
  let text: string;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return false;
    text = String(value); // exponent notation (1e-7, 1e+21) fails the pattern
  } else if (typeof value === "string") {
    text = value.trim();
  } else {
    return false;
  }
  if (!AMOUNT_RE.test(text)) return false;
  return /[1-9]/.test(text); // must be greater than 0
}

// --- File content signatures ----------------------------------------------------
// The declared MIME type is checked against the first bytes of the stored object.
// Deliberately tolerant where users commonly rename files:
// - any of PNG / JPEG / WebP is accepted for any image type;
// - DOCX / XLSX / PPTX are ZIP containers and cannot be told apart from the first bytes;
// - legacy .doc may also be RTF; legacy .xls may also be a text/HTML/XML export.
export const SIGNATURE_BYTES = 64;

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

function ascii(text: string): number[] {
  return Array.from(text, (char) => char.charCodeAt(0));
}

const PDF = ascii("%PDF-");
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const RIFF = ascii("RIFF");
const WEBP = ascii("WEBP");
const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const RTF = ascii("{\\rtf");

function isImage(bytes: Uint8Array): boolean {
  return startsWith(bytes, PNG) || startsWith(bytes, JPEG) || (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8));
}

// Text files must not contain NUL bytes (binary content renamed to .txt/.csv).
function isText(bytes: Uint8Array): boolean {
  return bytes.length > 0 && !bytes.includes(0);
}

export function matchesFileSignature(mimeType: string, bytes: Uint8Array): boolean {
  switch (mimeType) {
    case "application/pdf":
      return startsWith(bytes, PDF);
    case "image/png":
    case "image/jpeg":
    case "image/webp":
      return isImage(bytes);
    case "text/plain":
    case "text/csv":
      return isText(bytes);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return startsWith(bytes, ZIP);
    case "application/msword":
      return startsWith(bytes, OLE) || startsWith(bytes, RTF);
    case "application/vnd.ms-excel":
      return startsWith(bytes, OLE) || isText(bytes);
    case "application/vnd.ms-powerpoint":
      return startsWith(bytes, OLE);
    default:
      return false;
  }
}
