const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/gu;

export function parseWikiLinks(markdown = "") {
  const links = [];
  const source = String(markdown);
  for (const match of source.matchAll(WIKI_LINK_PATTERN)) {
    const targetId = match[1].trim();
    if (!targetId) continue;
    links.push({ targetId, label: (match[2] ?? "").trim(), index: match.index });
  }
  return links;
}

export function buildWikiLinkGraph(entries) {
  if (!Array.isArray(entries)) throw new TypeError("entries must be an array");
  const ids = new Set(entries.map(entry => entry.id));
  const outgoing = new Map();
  const incoming = new Map();
  for (const entry of entries) {
    const uniqueTargets = [...new Set(parseWikiLinks(entry.body).map(link => link.targetId))];
    outgoing.set(entry.id, uniqueTargets.map(targetId => ({
      targetId, resolved: ids.has(targetId), target: entries.find(item => item.id === targetId) ?? null
    })));
  }
  for (const entry of entries) {
    for (const link of outgoing.get(entry.id) ?? []) {
      if (!incoming.has(link.targetId)) incoming.set(link.targetId, []);
      incoming.get(link.targetId).push(entry);
    }
  }
  return {
    outgoing,
    incoming,
    forEntry(id) {
      return {
        outgoing: outgoing.get(id) ?? [],
        incoming: incoming.get(id) ?? []
      };
    }
  };
}

export function parseMarkdownBlocks(markdown = "") {
  const lines = String(markdown).replace(/\r\n?/gu, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  let list = null;
  let code = null;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join("\n") });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };
  for (const line of lines) {
    if (code) {
      if (/^\s*\x60{3,}\s*$/u.test(line)) {
        blocks.push({ type: "code", text: code.join("\n") });
        code = null;
      } else code.push(line);
      continue;
    }
    if (/^\s*\x60{3,}[^\x60]*$/u.test(line)) {
      flushParagraph(); flushList(); code = [];
      continue;
    }
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    const heading = /^(#{1,6})\s+(.+)$/u.exec(line);
    if (heading) { flushParagraph(); flushList(); blocks.push({ type: "heading", level: heading[1].length, text: heading[2] }); continue; }
    if (/^\s*>\s?/u.test(line)) { flushParagraph(); flushList(); blocks.push({ type: "quote", text: line.replace(/^\s*>\s?/u, "") }); continue; }
    const unordered = /^\s*[-*+]\s+(.+)$/u.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.+)$/u.exec(line);
    if (unordered || ordered) {
      flushParagraph();
      const type = unordered ? "ul" : "ol";
      if (list?.type !== type) { flushList(); list = { type, items: [] }; }
      list.items.push(unordered?.[1] ?? ordered[1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph(); flushList();
  if (code) blocks.push({ type: "code", text: code.join("\n"), unterminated: true });
  return blocks;
}

function appendInline(parent, text, entriesById, onNavigate) {
  const pattern = /(\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\x60([^\x60]+)\x60|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_)/gu;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) parent.append(document.createTextNode(text.slice(cursor, match.index)));
    const whole = match[0];
    if (match[2] !== undefined) {
      const id = match[2].trim();
      const target = entriesById.get(id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = target ? "wiki-inline-link" : "wiki-inline-link unresolved";
      button.textContent = (match[3] ?? target?.title ?? id).trim();
      button.disabled = !target;
      button.title = target ? "打开知识条目" : "未解析的条目引用：" + id;
      if (target) button.addEventListener("click", () => onNavigate?.(target));
      parent.append(button);
    } else if (match[4] !== undefined) {
      const node = document.createElement("code"); node.textContent = match[4]; parent.append(node);
    } else {
      const strong = match[5] ?? match[6];
      const emphasis = match[7] ?? match[8];
      const node = document.createElement(strong !== undefined ? "strong" : "em");
      node.textContent = strong ?? emphasis;
      parent.append(node);
    }
    cursor = match.index + whole.length;
  }
  if (cursor < text.length) parent.append(document.createTextNode(text.slice(cursor)));
}

export function renderMarkdown(container, markdown, { entries = [], onNavigate } = {}) {
  if (!container || typeof container.replaceChildren !== "function") throw new TypeError("A DOM container is required");
  const entriesById = new Map(entries.map(entry => [entry.id, entry]));
  const fragment = document.createDocumentFragment();
  for (const block of parseMarkdownBlocks(markdown)) {
    let node;
    if (block.type === "ul" || block.type === "ol") {
      node = document.createElement(block.type);
      for (const item of block.items) {
        const li = document.createElement("li");
        appendInline(li, item, entriesById, onNavigate);
        node.append(li);
      }
    } else if (block.type === "code") {
      node = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = block.text;
      node.append(code);
    } else {
      const tag = block.type === "heading" ? "h" + block.level : block.type === "quote" ? "blockquote" : "p";
      node = document.createElement(tag);
      appendInline(node, block.text, entriesById, onNavigate);
    }
    fragment.append(node);
  }
  container.replaceChildren(fragment);
  return container;
}

