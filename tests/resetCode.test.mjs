// Chat-key reset code tests. Run with: npm run test:unit
// Pure functions only (no Firebase/network) - see lib/resetCode.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeResetCode, hashResetCode, isResetCodeExpired, RESET_CODE_TTL_MS, RESET_CODE_MAX_ATTEMPTS } from "../lib/resetCode.ts";

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
