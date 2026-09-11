import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { countLeaveDays, computeStage, LEAVE_POLICY } from "../src/services/leaveService.js";

describe("countLeaveDays", () => {
  test("counts a single day as 1 day", () => {
    assert.equal(countLeaveDays("2026-08-17", "2026-08-17"), 1);
  });

  test("counts every calendar day in a range, including Sundays — this company works all 7 days", () => {
    // 2026-08-17 (Mon) to 2026-08-23 (Sun) = 7 calendar days, none excluded
    assert.equal(countLeaveDays("2026-08-17", "2026-08-23"), 7);
  });

  test("returns 0 when the end date is before the start date", () => {
    assert.equal(countLeaveDays("2026-08-20", "2026-08-17"), 0);
  });

  test("returns 0 for missing dates", () => {
    assert.equal(countLeaveDays(null, "2026-08-17"), 0);
    assert.equal(countLeaveDays("2026-08-17", null), 0);
  });

  test("still excludes any date present in the given holiday set", () => {
    // Mon 2026-08-17 to Wed 2026-08-19, with Tuesday as a public holiday
    const holidays = new Set(["2026-08-18"]);
    assert.equal(countLeaveDays("2026-08-17", "2026-08-19", holidays), 2);
  });

  test("with no holiday set given, counts the full range with no exclusions", () => {
    assert.equal(countLeaveDays("2026-08-17", "2026-08-19"), 3);
  });
});

describe("computeStage", () => {
  test("returns 'unset' when there's no join date on the profile", () => {
    const stage = computeStage({ employmentType: "permanent", joinDate: null });
    assert.equal(stage.stage, "unset");
  });

  test("probation employees get the monthly probation quota regardless of tenure", () => {
    const stage = computeStage({ employmentType: "probation", joinDate: "2026-01-01" }, new Date("2026-08-15"));
    assert.equal(stage.stage, "probation");
    assert.equal(stage.scheme, "monthly");
    assert.equal(stage.quota, LEAVE_POLICY.probationMonthly);
  });

  test("permanent employee under a year gets the under-year monthly quota", () => {
    const stage = computeStage({ employmentType: "permanent", joinDate: "2026-06-01" }, new Date("2026-08-15"));
    assert.equal(stage.stage, "permanent_under_year");
    assert.equal(stage.quota, LEAVE_POLICY.permanentUnderYearMonthly);
  });

  test("permanent employee over a year, no annual allocation set, falls back to the over-year monthly rate", () => {
    const stage = computeStage(
      { employmentType: "permanent", joinDate: "2024-01-01", annualLeaveSet: false },
      new Date("2026-08-15")
    );
    assert.equal(stage.stage, "permanent_over_year");
    assert.equal(stage.scheme, "monthly");
    assert.equal(stage.quota, LEAVE_POLICY.permanentOverYearMonthly);
  });

  test("permanent employee over a year, with an annual allocation set, uses the annual pool instead", () => {
    const stage = computeStage(
      { employmentType: "permanent", joinDate: "2024-01-01", annualLeaveSet: true, annualLeaveDays: 14 },
      new Date("2026-08-15")
    );
    assert.equal(stage.stage, "permanent_over_year");
    assert.equal(stage.scheme, "annual");
    assert.equal(stage.quota, 14);
  });

  test("accepts a custom policy override (used for admin-configured accrual rates)", () => {
    const customPolicy = { ...LEAVE_POLICY, probationMonthly: 10 };
    const stage = computeStage({ employmentType: "probation", joinDate: "2026-01-01" }, new Date("2026-08-15"), customPolicy);
    assert.equal(stage.quota, 10);
  });
});
