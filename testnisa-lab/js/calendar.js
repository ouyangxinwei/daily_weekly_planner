const OFFICIAL_HOLIDAYS = {
  2026: [
    ["2026-01-01","元日"],["2026-01-12","成人の日"],["2026-02-11","建国記念の日"],
    ["2026-02-23","天皇誕生日"],["2026-03-20","春分の日"],["2026-04-29","昭和の日"],
    ["2026-05-03","憲法記念日"],["2026-05-04","みどりの日"],["2026-05-05","こどもの日"],
    ["2026-05-06","休日"],["2026-07-20","海の日"],["2026-08-11","山の日"],
    ["2026-09-21","敬老の日"],["2026-09-22","休日"],["2026-09-23","秋分の日"],
    ["2026-10-12","スポーツの日"],["2026-11-03","文化の日"],["2026-11-23","勤労感謝の日"]
  ],
  2027: [
    ["2027-01-01","元日"],["2027-01-11","成人の日"],["2027-02-11","建国記念の日"],
    ["2027-02-23","天皇誕生日"],["2027-03-21","春分の日"],["2027-03-22","休日"],
    ["2027-04-29","昭和の日"],["2027-05-03","憲法記念日"],["2027-05-04","みどりの日"],
    ["2027-05-05","こどもの日"],["2027-07-19","海の日"],["2027-08-11","山の日"],
    ["2027-09-20","敬老の日"],["2027-09-23","秋分の日"],["2027-10-11","スポーツの日"],
    ["2027-11-03","文化の日"],["2027-11-23","勤労感謝の日"]
  ]
};

function pad(value) { return String(value).padStart(2, "0"); }

export function parseISODate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError("日期必须使用 YYYY-MM-DD 格式。");
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || year > 9999 || date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError("日期不存在或超出支持范围（1900–9999）。");
  }
  return date;
}

export function formatISODate(value) {
  const date = value instanceof Date ? value : parseISODate(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("无效日期。");
  return date.getUTCFullYear() + "-" + pad(date.getUTCMonth() + 1) + "-" + pad(date.getUTCDate());
}

export function addCalendarDays(value, amount) {
  const date = parseISODate(value);
  if (!Number.isInteger(amount) || Math.abs(amount) > 100000) throw new RangeError("日期偏移必须是 -100000 到 100000 之间的整数。");
  date.setUTCDate(date.getUTCDate() + amount);
  return formatISODate(date);
}

export function getWeekday(value) {
  return parseISODate(value).getUTCDay();
}

export function isWeekend(value) {
  const day = getWeekday(value);
  return day === 0 || day === 6;
}

function nthWeekday(year, month, weekday, nth) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((weekday - first + 7) % 7) + (nth - 1) * 7;
}

function vernalEquinox(year) {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}
function autumnalEquinox(year) {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function estimatedNationalHolidays(year) {
  const rows = [
    [year + "-01-01","元日"],
    [year + "-02-11","建国記念の日"],
    [year + "-02-23","天皇誕生日"],
    [year + "-03-" + pad(vernalEquinox(year)),"春分の日"],
    [year + "-04-29","昭和の日"],
    [year + "-05-03","憲法記念日"],
    [year + "-05-04","みどりの日"],
    [year + "-05-05","こどもの日"],
    [year + "-09-" + pad(autumnalEquinox(year)),"秋分の日"],
    [year + "-11-03","文化の日"],
    [year + "-11-23","勤労感謝の日"]
  ];
  if (year >= 2000) rows.push(
    [year + "-01-" + pad(nthWeekday(year,1,1,2)),"成人の日"],
    [year + "-07-" + pad(nthWeekday(year,7,1,3)),"海の日"],
    [year + "-09-" + pad(nthWeekday(year,9,1,3)),"敬老の日"],
    [year + "-10-" + pad(nthWeekday(year,10,1,2)),"スポーツの日"]
  );
  else rows.push(
    [year + "-01-15","成人の日"],
    [year + "-07-20","海の日"],
    [year + "-09-15","敬老の日"],
    [year + "-10-10","体育の日"]
  );
  if (year >= 2016) rows.push([year + "-08-11","山の日"]);
  if (year >= 2020) {
    const emperor = rows.findIndex(row => row[1] === "天皇誕生日");
    if (emperor >= 0) rows.splice(emperor, 1);
    rows.push([year + "-02-23","天皇誕生日"]);
  } else {
    const emperor = rows.findIndex(row => row[1] === "天皇誕生日");
    if (emperor >= 0) rows.splice(emperor, 1);
  }
  return rows;
}

function buildHolidayMap(year) {
  const official = Object.hasOwn(OFFICIAL_HOLIDAYS, year);
  const rows = official ? OFFICIAL_HOLIDAYS[year] : estimatedNationalHolidays(year);
  const map = new Map(rows.map(([date,name]) => [date, {
    date, name, kind: name === "休日" ? "holiday" : "national",
    source: official ? "cabinet-office" : "rule-estimate"
  }]));
  if (!official) {
    const nationalDates = [...map.values()].filter(item => item.kind === "national").map(item => item.date);
    for (const date of nationalDates) {
      if (getWeekday(date) !== 0) continue;
      let candidate = addCalendarDays(date, 1);
      while (map.has(candidate) || isWeekend(candidate)) candidate = addCalendarDays(candidate, 1);
      map.set(candidate, { date: candidate, name: "振替休日", kind: "substitute", source: "rule-estimate" });
    }
    for (let day = 2; day <= 30; day += 1) {
      const date = year + "-09-" + pad(day);
      if (map.has(date) || isWeekend(date)) continue;
      const previous = addCalendarDays(date, -1);
      const next = addCalendarDays(date, 1);
      if (map.get(previous)?.kind === "national" && map.get(next)?.kind === "national") {
        map.set(date, { date, name: "国民の休日", kind: "citizens", source: "rule-estimate" });
      }
    }
  } else {
    for (const item of map.values()) {
      if (item.name === "休日") {
        const date = item.date;
        const previous = addCalendarDays(date, -1);
        const next = addCalendarDays(date, 1);
        const officialKinds = { "2026-05-06": "substitute", "2026-09-22": "citizens", "2027-03-22": "substitute" };
        item.kind = officialKinds[date] || "holiday";
        item.name = item.kind === "substitute" ? "振替休日" :
          item.kind === "citizens" ? "国民の休日" : "休日";
      }
    }
  }
  return map;
}

const holidayCache = new Map();
function holidaysForYear(year) {
  if (!holidayCache.has(year)) holidayCache.set(year, buildHolidayMap(year));
  return holidayCache.get(year);
}

export function getJapaneseHoliday(value) {
  const date = parseISODate(value);
  return holidaysForYear(date.getUTCFullYear()).get(value) ?? null;
}

export function getJapaneseHolidayCalendarSource(year) {
  if (!Number.isInteger(year) || year < 1900 || year > 9999) throw new RangeError("年份超出支持范围。");
  return Object.hasOwn(OFFICIAL_HOLIDAYS, year) ? "cabinet-office" : "rule-estimate";
}

export function isJapaneseMarketBusinessDay(value) {
  const date = parseISODate(value);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  if (isWeekend(value) || getJapaneseHoliday(value)) return false;
  if ((month === 1 && day <= 3) || (month === 12 && day === 31)) return false;
  return true;
}

export function addJapaneseBusinessDays(value, amount) {
  parseISODate(value);
  if (!Number.isInteger(amount) || Math.abs(amount) > 10000) throw new RangeError("交易日偏移必须是 -10000 到 10000 之间的整数。");
  if (amount === 0) return value;
  const direction = Math.sign(amount);
  let remaining = Math.abs(amount);
  let cursor = value;
  let guard = 0;
  while (remaining > 0) {
    cursor = addCalendarDays(cursor, direction);
    if (isJapaneseMarketBusinessDay(cursor)) remaining -= 1;
    guard += 1;
    if (guard > 40000) throw new RangeError("交易日偏移超出计算范围。");
  }
  return cursor;
}

export function countJapaneseBusinessDays(startValue, endValue) {
  parseISODate(startValue);
  parseISODate(endValue);
  if (startValue === endValue) return 0;
  const direction = startValue < endValue ? 1 : -1;
  let cursor = startValue;
  let count = 0;
  while (cursor !== endValue) {
    cursor = addCalendarDays(cursor, direction);
    if (isJapaneseMarketBusinessDay(cursor)) count += direction;
  }
  return count;
}

export function getJapaneseMarketDayInfo(value) {
  const date = parseISODate(value);
  const holiday = getJapaneseHoliday(value);
  const weekend = isWeekend(value);
  const yearEndClosure = (date.getUTCMonth() === 0 && date.getUTCDate() <= 3) ||
    (date.getUTCMonth() === 11 && date.getUTCDate() === 31);
  return {
    date: value,
    weekday: ["日曜日","月曜日","火曜日","水曜日","木曜日","金曜日","土曜日"][date.getUTCDay()],
    isBusinessDay: isJapaneseMarketBusinessDay(value),
    reason: weekend ? "週末" : holiday ? holiday.name : yearEndClosure ? "年末年始休場" : "取引日",
    holiday,
    calendarSource: getJapaneseHolidayCalendarSource(date.getUTCFullYear())
  };
}
