const ALLOWED_ORIGIN = "https://ouyangxinwei.github.io";
const CACHE_TTL_MS = 10 * 60 * 1000;
const STOCKS = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "META", name: "Meta" },
  { symbol: "TSLA", name: "Tesla" },
];
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};
const responseHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300, s-maxage=900",
};
let cached = null;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}
function dateInZone(timestamp, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(timestamp * 1000));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function todayInZone(timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function weekStart(dateString) {
  const date = new Date(`${dateString}T12:00:00Z`);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - ((day + 6) % 7));
  return date.toISOString().slice(0, 10);
}
function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}
async function fetchStock(stock) {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${stock.symbol}`);
  url.searchParams.set("range", "1mo");
  url.searchParams.set("interval", "1d");
  url.searchParams.set("events", "div,splits");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; PlannerMarketDashboard/1.0)",
      },
    });
    if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    if (!result) throw new Error(payload?.chart?.error?.description || "No chart data");
    const timeZone = result.meta?.exchangeTimezoneName || "America/New_York";
    const quote = result.indicators?.quote?.[0] || {};
    const rows = (result.timestamp || []).map((timestamp, index) => ({
      date: dateInZone(timestamp, timeZone),
      open: quote.open?.[index] ?? null,
      high: quote.high?.[index] ?? null,
      low: quote.low?.[index] ?? null,
      close: quote.close?.[index] ?? null,
      volume: quote.volume?.[index] ?? null,
    })).filter((row) => finite(row.close)).sort((a, b) => a.date.localeCompare(b.date));
    if (!rows.length) throw new Error("No daily closing prices");
    const today = todayInZone(timeZone);
    const latest = rows[rows.length - 1];
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
    const currentWeekStart = weekStart(today);
    const latestWeekStart = weekStart(latest.date);
    const selectedWeekStart = weekday >= 1 && weekday <= 5 && currentWeekStart === latestWeekStart
      ? currentWeekStart
      : latestWeekStart;
    const weekRows = rows.filter((row) => weekStart(row.date) === selectedWeekStart);
    const firstIndex = rows.findIndex((row) => row.date === weekRows[0].date);
    const previousClose = firstIndex > 0 ? rows[firstIndex - 1].close : null;
    const previousRow = firstIndex > 0 ? rows[firstIndex - 1] : null;
    const enriched = weekRows.map((row) => {
      const index = rows.findIndex((item) => item.date === row.date);
      const prior = index > 0 ? rows[index - 1].close : null;
      const change = finite(prior) ? row.close - prior : null;
      return {
        ...row,
        change,
        changePercent: finite(prior) && prior !== 0 ? change / prior * 100 : null,
      };
    });
    const last = enriched[enriched.length - 1];
    const weekChange = finite(previousClose) ? last.close - previousClose : null;
    const weekChangePercent = finite(previousClose) && previousClose !== 0
      ? weekChange / previousClose * 100
      : null;
    const nowParts = new Intl.DateTimeFormat("en-US", {
      timeZone, hour: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date());
    const hour = Number(nowParts.find((part) => part.type === "hour")?.value ?? 0);
    return {
      symbol: stock.symbol,
      name: stock.name,
      currency: result.meta?.currency || "USD",
      exchange: result.meta?.fullExchangeName || result.meta?.exchangeName || "US market",
      latestDate: last.date,
      latestClose: last.close,
      dayChange: last.change,
      dayChangePercent: last.changePercent,
      weekChange,
      weekChangePercent,
      previousWeekClose: previousRow?.close ?? null,
      isProvisional: last.date === today && hour < 16,
      days: enriched,
    };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);
  if (cached && Date.now() < cached.expiresAt) return json(cached.payload);
  const results = await Promise.all(STOCKS.map(async (stock) => {
    try {
      return await fetchStock(stock);
    } catch (error) {
      console.error("Stock data unavailable:", stock.symbol, error?.message || error);
      return null;
    }
  }));
  const stocks = results.filter(Boolean);
  if (!stocks.length) {
    return json({
      ok: false,
      error: "Stock data provider is temporarily unavailable. Please retry later.",
      source: "Yahoo Finance chart endpoint",
    }, 502);
  }
  const dates = stocks.flatMap((stock) => stock.days.map((day) => day.date)).sort();
  const payload = {
    ok: true,
    source: "Yahoo Finance chart endpoint",
    fetchedAt: new Date().toISOString(),
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
    partial: stocks.length !== STOCKS.length,
    missingSymbols: STOCKS.filter((stock) => !stocks.some((item) => item.symbol === stock.symbol)).map((stock) => stock.symbol),
    stocks,
    disclaimer: "Unofficial public market-data endpoint. Prices may be delayed or unavailable; not investment advice.",
  };
  cached = { expiresAt: Date.now() + CACHE_TTL_MS, payload };
  return json(payload);
});
