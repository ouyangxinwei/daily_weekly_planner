import { requestFetch } from "./request.js";

const J = "https://api.jquants.com/v2/equities/bars/daily";
const A = "https://www.alphavantage.co/query";

function sym(value) {
  const normalized = String(value ?? "").trim();
  if (!/^[A-Za-z0-9.^_-]{1,20}$/u.test(normalized)) throw new TypeError("证券代码格式不正确");
  return normalized;
}
function key(value, provider) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > 200) throw new TypeError(provider + " API Key 无效");
  return normalized;
}
async function json(response, provider) {
  if (!response.ok) {
    const error = new Error(provider + " HTTP 请求失败（状态 " + response.status + "）");
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new TypeError("响应格式无效");
  return data;
}
function requestPolicy(timeoutMs, retries) {
  return { timeoutMs: timeoutMs ?? 10000, retries: retries ?? 2 };
}

export async function fetchJQuantsDaily({ symbol, apiKey, from, to, fetchImpl = requestFetch, signal, timeoutMs, retries } = {}) {
  const ticker = sym(symbol);
  const params = new URLSearchParams({ code: ticker });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const response = await fetchImpl(J + "?" + params, {
    headers: { "x-api-key": key(apiKey, "J-Quants"), Accept: "application/json" }, signal
  }, requestPolicy(timeoutMs, retries));
  const data = await json(response, "J-Quants");
  if (!Array.isArray(data.data)) throw new Error("J-Quants 响应缺少 data 数组");
  const rows = data.data.map(item => ({
    date: item.Date ?? "", open: item.O ?? null, high: item.H ?? null, low: item.L ?? null,
    close: item.C ?? null, adjustedClose: item.AdjC ?? null, volume: item.Vo ?? null, currency: "JPY"
  }));
  return { provider: "J-Quants API v2", symbol: ticker, rows, rowCount: rows.length, hasMore: Boolean(data.pagination_key) };
}

export async function fetchAlphaVantageDaily({ symbol, apiKey, fetchImpl = requestFetch, signal, timeoutMs, retries } = {}) {
  const ticker = sym(symbol);
  const params = new URLSearchParams({
    function: "TIME_SERIES_DAILY", symbol: ticker, outputsize: "compact", apikey: key(apiKey, "Alpha Vantage")
  });
  const response = await fetchImpl(A + "?" + params, { headers: { Accept: "application/json" }, signal }, requestPolicy(timeoutMs, retries));
  const data = await json(response, "Alpha Vantage");
  if (data.Note || data.Information || data["Error Message"]) {
    throw new Error("Alpha Vantage 提示/错误：" + String(data.Note || data.Information || data["Error Message"]).slice(0, 200));
  }
  const seriesKey = Object.keys(data).find(name => name.startsWith("Time Series"));
  if (!seriesKey || !data[seriesKey] || typeof data[seriesKey] !== "object") {
    throw new Error("Alpha Vantage 没有返回日线数据，请检查代码、额度和市场覆盖");
  }
  const rows = Object.entries(data[seriesKey]).map(([date, item]) => ({
    date, open: item["1. open"] ?? null, high: item["2. high"] ?? null,
    low: item["3. low"] ?? null, close: item["4. close"] ?? null,
    adjustedClose: null, volume: item["5. volume"] ?? null, currency: null
  })).sort((left, right) => right.date.localeCompare(left.date));
  return { provider: "Alpha Vantage TIME_SERIES_DAILY", symbol: ticker, rows, rowCount: rows.length, hasMore: false };
}
