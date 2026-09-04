import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validatePasswordStrength } from "../src/services/passwordPolicy.js";
import { parseDurationMs } from "../src/config/auth.js";
import { parsePeriodLabel } from "../src/services/payrollSnapshotService.js";

describe("validatePasswordStrength", () => {
  test("rejects a password under 8 characters", () => {
    assert.ok(validatePasswordStrength("Ab1"));
  });

  test("rejects a password with no digit", () => {
    assert.ok(validatePasswordStrength("Abcdefgh"));
  });

  test("rejects a password with no letter", () => {
    assert.ok(validatePasswordStrength("12345678"));
  });

  test("accepts a password that meets all the rules", () => {
    assert.equal(validatePasswordStrength("Abcdef12"), null);
  });
});

describe("parseDurationMs", () => {
  test("parses hours", () => assert.equal(parseDurationMs("8h"), 8 * 60 * 60 * 1000));
  test("parses days", () => assert.equal(parseDurationMs("7d"), 7 * 24 * 60 * 60 * 1000));
  test("parses a bare number as seconds", () => assert.equal(parseDurationMs("3600"), 3600 * 1000));
  test("falls back to 8 hours for garbage input", () => assert.equal(parseDurationMs("not-a-duration"), 8 * 60 * 60 * 1000));
});

describe("parsePeriodLabel", () => {
  test("parses a well-formed 'Month YYYY' label", () => {
    const { year, month } = parsePeriodLabel("August 2026");
    assert.equal(year, 2026);
    assert.equal(month, 8);
  });

  test("is case-insensitive on the month name", () => {
    const { month } = parsePeriodLabel("august 2026");
    assert.equal(month, 8);
  });

  test("defaults to the current month/year when no label is given", () => {
    const now = new Date();
    const { year, month } = parsePeriodLabel(undefined);
    assert.equal(year, now.getFullYear());
    assert.equal(month, now.getMonth() + 1);
  });

  test("throws a 400 on a malformed label", () => {
    assert.throws(() => parsePeriodLabel("not a period"), (err) => err.status === 400);
  });

  test("throws a 400 on an unrecognized month name", () => {
    assert.throws(() => parsePeriodLabel("Smarch 2026"), (err) => err.status === 400);
  });
});
