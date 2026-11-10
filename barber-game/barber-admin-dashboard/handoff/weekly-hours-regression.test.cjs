#!/usr/bin/env node
/**
 * BarberGame Admin / weekly hours source-level regression tests.
 * Run from any working directory:
 *   node barber-game/barber-admin-dashboard/handoff/weekly-hours-regression.test.cjs
 *
 * This uses the actual demo source functions extracted from index.html.
 * Mock DOM/storage and appointments are intentional; passing is NOT equivalent
 * to iOS Safari, accessibility, or production API acceptance.
 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
function extract(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  assert(from >= 0 && to > from, "Unable to locate source: " + start);
  return html.slice(from, to);
}
const source =
  extract("function suggestDayPeriod()", "function dayTimeField(") +
  extract("function addDayPeriod()", "const profileDefaults=");

function testState({ periods = [], bookings = [], confirm = true, failCancellation = false } = {}) {
  const controls = {
    dayStart: { value: "" },
    dayEnd: { value: "" },
    dayStartDisplay: { textContent: "" },
    dayEndDisplay: { textContent: "" },
    f_status: { value: periods.length ? "Open" : "Closed" }
  };
  const storage = {};
  const messages = [];
  let prompts = 0;
  let renders = 0;
  const env = {
    selected: 2,
    days: Array.from({ length: 7 }, (_, i) => ({
      periods: i === 2 ? periods.map(p => ({ ...p })) : [],
      hours: i === 2 && periods.length ? "Open" : "Closed"
    })),
    bookings: [],
    futureBookings: bookings.map(b => ({ ...b })),
    services: [{ name: "Haircut", duration: 30 }],
    $: id => controls[id] || null,
    localDateISO: () => "2026-11-10",
    parseClock: value => {
      const twentyFour = String(value || "").match(/^(\d{2}):(\d{2})$/);
      if (twentyFour) return Number(twentyFour[1]) * 60 + Number(twentyFour[2]);
      const twelve = String(value || "").match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
      if (!twelve) return null;
      return (Number(twelve[1]) % 12 + (twelve[3] === "PM" ? 12 : 0)) * 60 + Number(twelve[2]);
    },
    formatClock: value => (Math.floor(value / 60) % 12 || 12) + ":" +
      String(value % 60).padStart(2, "0") + " " + (value >= 720 ? "PM" : "AM"),
    slotClock: value => String(Math.floor(value / 60)).padStart(2, "0") + ":" +
      String(value % 60).padStart(2, "0"),
    $dummy: null,
    toast: value => messages.push(value),
    window: { confirm: () => { prompts++; return confirm; } },
    localStorage: {
      getItem: key => storage[key] || null,
      setItem: (key, value) => {
        if (failCancellation && key === "tbg-demo-schedule-cancellations-v1")
          throw new Error("Simulated storage failure");
        storage[key] = value;
      }
    },
    saveWeeklyHours: () => {
      storage.weekly = JSON.stringify(env.days[2].periods);
      return true;
    },
    render: () => { renders++; },
    showDayPeriods: () => {},
    toggleDayHours: () => {},
    closeDayTimePicker: () => {},
    setDayTimeValues: () => {},
    scheduleBookingKey: b => [b.date, b.name, b.time, b.service].join("|"),
    currentDayPeriods: () => env.days[2].periods.map(p => ({ ...p }))
  };

  const actual = new Function("env", `with (env) { ${source}; return {
    addDayPeriod, removeDayPeriod, saveDaySchedulePeriods, dayAppointmentConflicts
  }; }`)(env);
  return { env, actual, controls, messages, storage, get prompts() { return prompts; },
    get renders() { return renders; } };
}

function test(name, fn) {
  try { fn(); process.stdout.write("PASS " + name + "\\n"); }
  catch (error) { process.stderr.write("FAIL " + name + ": " + error.message + "\\n"); process.exitCode = 1; }
}
function input(t, start, end) {
  t.controls.dayStart.value = start;
  t.controls.dayEnd.value = end;
  t.actual.addDayPeriod();
}

test("add two separate working periods; persistence and ordering", () => {
  const t = testState();
  input(t, "18:00", "20:00");
  input(t, "14:00", "16:00");
  assert.deepEqual(t.env.days[2].periods, [{ start: 840, end: 960 }, { start: 1080, end: 1200 }]);
  assert.deepEqual(JSON.parse(t.storage.weekly), t.env.days[2].periods);
});
test("reject overlap without changing saved hours", () => {
  const t = testState({ periods: [{ start: 840, end: 960 }] });
  input(t, "15:00", "17:00");
  assert.equal(t.env.days[2].periods.length, 1);
  assert.match(t.messages.at(-1), /overlap/);
});
test("reject non-five-minute time", () => {
  const t = testState();
  input(t, "14:02", "16:00");
  assert.equal(t.env.days[2].periods.length, 0);
  assert.match(t.messages.at(-1), /five-minute/);
});
test("remove one range without clearing others", () => {
  const t = testState({ periods: [{ start: 840, end: 960 }, { start: 1080, end: 1200 }] });
  t.actual.removeDayPeriod(0);
  assert.deepEqual(t.env.days[2].periods, [{ start: 1080, end: 1200 }]);
});
const booking = { date: "2026-11-11", name: "Sample Client", time: "3:00 PM",
  service: "Haircut", status: "Confirmed" };
test("reject cancellation leaves schedule and booking untouched", () => {
  const t = testState({ periods: [{ start: 840, end: 960 }], bookings: [booking], confirm: false });
  assert.equal(t.actual.saveDaySchedulePeriods([], false), false);
  assert.equal(t.prompts, 1);
  assert.equal(t.env.days[2].periods.length, 1);
  assert.equal(t.env.futureBookings[0].status, "Confirmed");
});
test("confirmed change persists hours and cancellation", () => {
  const t = testState({ periods: [{ start: 840, end: 960 }], bookings: [booking] });
  assert.equal(t.actual.saveDaySchedulePeriods([], false), true);
  assert.deepEqual(t.env.days[2].periods, []);
  assert.equal(t.env.futureBookings[0].status, "Cancelled");
  assert.equal(JSON.parse(t.storage["tbg-demo-schedule-cancellations-v1"]).length, 1);
});
test("failed cancellation storage restores hours and preserves booking", () => {
  const t = testState({ periods: [{ start: 840, end: 960 }], bookings: [booking], failCancellation: true });
  assert.equal(t.actual.saveDaySchedulePeriods([], false), false);
  assert.deepEqual(t.env.days[2].periods, [{ start: 840, end: 960 }]);
  assert.equal(t.env.futureBookings[0].status, "Confirmed");
  assert.deepEqual(JSON.parse(t.storage.weekly), [{ start: 840, end: 960 }]);
});
if (!process.exitCode) process.stdout.write("All weekly-hours source-level tests passed.\\n");
