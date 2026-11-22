import {
  addJapaneseBusinessDays, countJapaneseBusinessDays, getJapaneseMarketDayInfo,
  getJapaneseHolidayCalendarSource, parseISODate
} from "../js/calendar.js";

const form = document.querySelector("#calendar-form");
const dateInput = document.querySelector("#target-date");
const todayButton = document.querySelector("#today");
const offsetInput = document.querySelector("#offset");
const countEndInput = document.querySelector("#count-end");
const calculateButton = document.querySelector("#calculate");
const status = document.querySelector("#status");
const details = document.querySelector("#details");
const offsetResult = document.querySelector("#offset-result");
const nextDays = document.querySelector("#next-days");

function metric(label, value) {
  const box = document.createElement("div");
  const title = document.createElement("div");
  const content = document.createElement("div");
  box.className = "metric";
  title.className = "label";
  title.textContent = label;
  content.className = "value";
  content.textContent = String(value);
  box.append(title, content);
  return box;
}
function renderDate() {
  const value = dateInput.value;
  const info = getJapaneseMarketDayInfo(value);
  details.replaceChildren(
    metric("星期", info.weekday),
    metric("市场状态", info.isBusinessDay ? "交易日" : "休市"),
    metric("休市原因", info.reason),
    metric("节假日日历来源", info.calendarSource === "cabinet-office" ? "内阁府已公布" : "规则推算")
  );
  status.textContent = info.isBusinessDay
    ? value + " 是日本股票市场交易日。"
    : value + " 不是日本股票市场交易日（" + info.reason + "）。";
  status.className = "status " + (info.isBusinessDay ? "success" : "pending");
  const items = [];
  let cursor = value;
  for (let i = 0; i < 5; i += 1) {
    cursor = addJapaneseBusinessDays(cursor, 1);
    items.push(cursor + "（" + getJapaneseMarketDayInfo(cursor).weekday + "）");
  }
  nextDays.replaceChildren();
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    nextDays.append(li);
  }
}
function calculate() {
  const offset = Number(offsetInput.value);
  if (!Number.isInteger(offset) || offset < -20 || offset > 20) throw new RangeError("偏移量必须为 -20 到 +20 的整数。");
  const result = addJapaneseBusinessDays(dateInput.value, offset);
  const count = countJapaneseBusinessDays(dateInput.value, countEndInput.value);
  offsetResult.textContent = "T" + (offset >= 0 ? "+" : "") + offset + " = " + result +
    "；从起点到结束日期的交易日数量（不含起点）= " + count + "。";
  offsetResult.className = "status success";
}
form.addEventListener("submit", event => {
  event.preventDefault();
  try { parseISODate(dateInput.value); renderDate(); }
  catch (error) { status.textContent = error.message; status.className = "status error"; }
});
todayButton.addEventListener("click", () => {
  const now = new Date();
  dateInput.value = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
  renderDate();
});
calculateButton.addEventListener("click", () => {
  try { calculate(); }
  catch (error) { offsetResult.textContent = error.message; offsetResult.className = "status error"; }
});
try { renderDate(); calculate(); } catch (error) { status.textContent = error.message; }
