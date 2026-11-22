export function parseWikiImportText(input) {
  if (typeof input !== "string") throw new TypeError("导入内容必须是文本");
  const source = input.replace(/^\uFEFF/u, "").replace(/\r\n?/gu, "\n").trim();
  if (!source) throw new TypeError("请先粘贴 Markdown 文本");
  if (source.length > 50000) throw new RangeError("导入文本不能超过 50000 个字符");

  const lines = source.split("\n");
  let titleIndex = lines.findIndex(line => /^#\s+\S/u.test(line.trim()));
  const title = titleIndex >= 0 ? lines[titleIndex].trim().replace(/^#\s+/u, "").trim() : "";
  const bodyLines = titleIndex >= 0
    ? [...lines.slice(0, titleIndex), ...lines.slice(titleIndex + 1)]
    : lines;
  const body = bodyLines.join("\n").trim();
  const summary = bodyLines
    .map(line => line.trim())
    .find(line => line && !/^#{1,6}\s/u.test(line) && !/^\s*([-*+]\s|\d+[.)]\s|>)/u.test(line)) ?? "";
  return {
    title: title.slice(0, 200),
    summary: summary.slice(0, 500),
    category: "",
    tags: [],
    aliases: [],
    body,
    status: "draft",
    format: "markdown",
    warnings: title ? [] : ["未发现一级标题，请在预览中补充标题。"]
  };
}

function normalizeDuplicateText(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

export function findWikiImportDuplicates(candidate, entries) {
  if (!Array.isArray(entries)) throw new TypeError("entries must be an array");
  const title = normalizeDuplicateText(candidate?.title);
  const aliases = new Set((candidate?.aliases ?? []).map(normalizeDuplicateText).filter(Boolean));
  const matches = [];
  for (const entry of entries) {
    const existingTitle = normalizeDuplicateText(entry.title);
    const existingAliases = new Set((entry.aliases ?? []).map(normalizeDuplicateText).filter(Boolean));
    const reasons = [];
    if (title && title === existingTitle) reasons.push("标题相同");
    if (title && existingAliases.has(title)) reasons.push("与已有别名相同");
    if (aliases.has(existingTitle)) reasons.push("导入别名与已有标题相同");
    if ([...aliases].some(alias => existingAliases.has(alias))) reasons.push("别名重叠");
    if (reasons.length) matches.push({ id: entry.id, title: entry.title, reasons });
  }
  return matches;
}
