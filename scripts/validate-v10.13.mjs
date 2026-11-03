import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const i18n = fs.readFileSync('i18n.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');

const required = [
  ["planner local key", "KEY='personal-planner:v1'"],
  ["organizer local key", "ORGANIZE_KEY='personal-organizer:v1'"],
  ["module switching", "function switchModule(module)"],
  ["five organizer defaults", "['书籍','电子产品','软件/APP','网站','其他']"],
  ["module-specific JSON backup", "moduleType:activeModule"],
  ["organizer backup import guard", "raw?.moduleType!=='organize'"],
  ["organizer cloud partition", "organizer:state"],
  ["planner upload preserves organizer", "if(remote&&remote.organizer)payload.organizer=remote.organizer"],
  ["organizer upload preserves planner", "loadModuleState('plan')"],
  ["flat organizer list", "activeModule==='organize'||p.period===activePeriod"],
  ["hidden plan period in organizer", ".organize-mode .periods"],
  ["V10.13 changelog", "## V10.13 · organize_module"]
];

for (const [label, needle] of required) {
  const source = label === "V10.13 changelog" ? changelog : label === "five organizer defaults" ? html : html;
  if (!source.includes(needle)) throw new Error("Missing V10.13 requirement: " + label);
}
if (!i18n.includes('"整理":"Organize"') || !i18n.includes('"整理":"整理"')) {
  throw new Error("Missing English/Japanese organization labels");
}
if (!sw.includes("daily-weekly-planner-v10-13-organize-module")) {
  throw new Error("Service Worker cache version was not upgraded");
}
console.log("V10.13 static module-isolation checks passed.");
