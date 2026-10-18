import test from "node:test";
import assert from "node:assert/strict";
import config, { contentSecurityPolicy, securityHeaders } from "../next.config.ts";

const header = (name) => securityHeaders.find((h) => h.key === name)?.value ?? "";

test("the app cannot be framed, and only loads from itself and Firebase", () => {
  assert.match(contentSecurityPolicy, /frame-ancestors 'none'/);
  assert.match(contentSecurityPolicy, /object-src 'none'/);
  assert.match(contentSecurityPolicy, /base-uri 'self'/);
  assert.match(contentSecurityPolicy, /default-src 'self'/);
  assert.doesNotMatch(contentSecurityPolicy, /script-src[^;]*\*(?!\.)/); // no wildcard script source
  assert.equal(header("X-Frame-Options"), "DENY");
  assert.equal(header("X-Content-Type-Options"), "nosniff");
});

test("voice notes keep the microphone, nothing else gets a sensor", () => {
  const policy = header("Permissions-Policy");
  assert.match(policy, /microphone=\(self\)/);
  assert.match(policy, /camera=\(\)/);
  assert.match(policy, /geolocation=\(\)/);
});

test("the sign-in popup is allowed to reach back to the page", () => {
  assert.equal(header("Cross-Origin-Opener-Policy"), "same-origin-allow-popups");
});

test("every route gets the headers and the framework tag is off", async () => {
  const rules = await config.headers();
  assert.equal(rules[0].source, "/:path*");
  assert.equal(config.poweredByHeader, false);
});
