const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const elements = new Map();
function element() {
  return {
    value: "",
    options: [],
    children: [],
    style: {},
    append(...items) {
      this.children.push(...items);
    },
    replaceChildren() {
      this.children = [];
    },
    setAttribute() {},
    getAttribute() {
      return "./";
    },
  };
}
function get(id) {
  if (!elements.has(id)) elements.set(id, element());
  return elements.get(id);
}
const events = {};
class TestDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [2026, 9, 21, 12]));
  }
}
const context = vm.createContext({
  Date: TestDate,
  Intl,
  URLSearchParams,
  location: { pathname: "/", search: "" },
  document: {
    cookie: "weekday-system=us",
    documentElement: { dataset: {} },
    getElementById: get,
    querySelector: get,
    querySelectorAll: () => [],
    createElement: element,
  },
  window: { addEventListener: (name, callback) => (events[name] = callback) },
  localStorage: { getItem: () => null },
  setInterval() {},
});
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "../app.js"), "utf8"),
  context,
);
assert.equal(get("range").textContent, "18 Oct – 24 Oct 2026");
get("week-system").value = "iso";
get("week-system").onchange();
assert.equal(get("range").textContent, "19 Oct – 25 Oct 2026");
assert.equal(get("week").textContent, "43");
events.pageshow();
assert.equal(get("range").textContent, "19 Oct – 25 Oct 2026");
assert.equal(get("week-system").value, "iso");
get("week-system").value = "us";
get("week-system").onchange();
assert.equal(get("range").textContent, "18 Oct – 24 Oct 2026");
console.log(
  "US ↔ ISO stays in week 43 on 21 October 2026, including restoration.",
);

// Changing format after browsing another week returns to the current week.
get("prev").onclick();
get("week-system").value = "iso";
get("week-system").onchange();
assert.equal(get("range").textContent, "19 Oct – 25 Oct 2026");
for (let i = 0; i < 20; i++) {
  get("week-system").value = i % 2 ? "iso" : "us";
  get("week-system").onchange();
  events.pageshow();
  assert.equal(get("week").textContent, "43");
  assert.equal(
    get("range").textContent,
    i % 2 ? "19 Oct – 25 Oct 2026" : "18 Oct – 24 Oct 2026",
  );
}
console.log(
  "Repeated switches and switching after week navigation do not drift.",
);

assert.equal(
  get("calendar").children.filter((day) => day.className.includes("today"))
    .length,
  1,
);
const activeDay = get("calendar").children.find((day) =>
  day.className.includes("today"),
);
assert.equal(activeDay.children[1].textContent, 21);
console.log("Today stays active after settings switches.");
