// Chat-key reset code tests. Run with: npm run test:unit
// Pure functions only (no Firebase/network) - see lib/resetCode.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeResetCode, hashResetCode, isResetCodeExpired, RESET_CODE_TTL_MS, RESET_CODE_MAX_ATTEMPTS,
  makeResetTicket, hashResetTicket, RESET_TICKET_TTL_MS,
} from "../lib/resetCode.ts";

test("a code is always exactly 6 digits", () => {
  for (let i = 0; i < 50; i++) {
    const code = makeResetCode();
    assert.equal(code.length, 6);
    assert.match(code, /^[0-9]{6}$/);
  }
});

test("hashing is stable and salted by uid", () => {
  const h1 = hashResetCode("123456", "alice-uid");
  const h2 = hashResetCode("123456", "alice-uid");
  const h3 = hashResetCode("123456", "bob-uid");
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});

test("a wrong code hashes differently from the right one", () => {
  assert.notEqual(hashResetCode("111111", "alice-uid"), hashResetCode("222222", "alice-uid"));
});

test("expiry is a plain timestamp comparison", () => {
  assert.equal(isResetCodeExpired(Date.now() - 1000), true);
  assert.equal(isResetCodeExpired(Date.now() + 1000), false);
});

test("TTL and attempt cap are sane bounds", () => {
  assert.equal(RESET_CODE_TTL_MS, 10 * 60 * 1000);
  assert.ok(RESET_CODE_MAX_ATTEMPTS >= 1 && RESET_CODE_MAX_ATTEMPTS <= 10);
});

test("a ticket is long, random and never repeats", () => {
  const seen = new Set();
  for (let i = 0; i < 50; i++) {
    const ticket = makeResetTicket();
    assert.match(ticket, /^[0-9a-f]{64}$/);
    assert.ok(!seen.has(ticket));
    seen.add(ticket);
  }
});

test("ticket hashing is stable, salted by uid, and distinct from code hashing", () => {
  const t1 = hashResetTicket("abc123", "alice-uid");
  const t2 = hashResetTicket("abc123", "alice-uid");
  const t3 = hashResetTicket("abc123", "bob-uid");
  assert.equal(t1, t2);
  assert.notEqual(t1, t3);
  assert.notEqual(hashResetTicket("abc123", "alice-uid"), hashResetCode("abc123", "alice-uid"));
});

test("ticket TTL is short - just long enough to finish one reset", () => {
  assert.equal(RESET_TICKET_TTL_MS, 5 * 60 * 1000);
  assert.ok(RESET_TICKET_TTL_MS <= RESET_CODE_TTL_MS);
});
