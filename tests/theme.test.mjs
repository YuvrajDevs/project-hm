import test from "node:test";
import assert from "node:assert/strict";
import { THEME_BOOT_SCRIPT, rememberSignedIn } from "../lib/theme.ts";

// Run the pre-paint script against a fake page and report whether it chose light
const runBoot = (store, { throws = false } = {}) => {
  const attrs = {};
  const localStorage = {
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] ?? null,
    getItem: (k) => { if (throws) throw new Error("blocked"); return k in store ? store[k] : null; },
  };
  const document = { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } };
  new Function("localStorage", "document", THEME_BOOT_SCRIPT)(localStorage, document);
  return attrs["data-theme"] === "light";
};

test("the public site is light by default and only dark when chosen there", () => {
  assert.equal(runBoot({}), true);
  assert.equal(runBoot({ hm_theme_site: "dark" }), false);
  assert.equal(runBoot({ hm_theme_site: "light" }), true);
});

test("the app is dark by default once signed in, and light only when chosen in Settings", () => {
  assert.equal(runBoot({ hm_signed_in: "1" }), false);
  assert.equal(runBoot({ hm_signed_in: "1", hm_theme_app: "light" }), true);
  assert.equal(runBoot({ hm_signed_in: "1", hm_theme_app: "dark" }), false);
});

test("the two choices do not leak into each other", () => {
  assert.equal(runBoot({ hm_signed_in: "1", hm_theme_site: "light" }), false); // site choice ignored in the app
  assert.equal(runBoot({ hm_theme_app: "light" }), true);                      // app choice ignored on the public site
  assert.equal(runBoot({ hm_theme_site: "dark", hm_theme_app: "light" }), false);
});

test("a stored Firebase sign-in counts as signed in, and blocked storage falls back to light", () => {
  assert.equal(runBoot({ "firebase:authUser:key:[DEFAULT]": "{}" }), false);
  assert.equal(runBoot({}, { throws: true }), true);
});

test("every fresh sign-in starts the app in dark, but a reload keeps the Settings choice", () => {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  store.hm_theme_app = "light";           // picked in Settings on an earlier visit
  rememberSignedIn(true);                  // a new sign-in
  assert.equal(store.hm_theme_app, undefined);
  assert.equal(store.hm_signed_in, "1");
  store.hm_theme_app = "light";           // picked again while signed in
  rememberSignedIn(true);                  // the page reloads, still signed in
  assert.equal(store.hm_theme_app, "light");
  rememberSignedIn(false);                 // signed out
  assert.equal(store.hm_signed_in, undefined);
  delete globalThis.localStorage;
});
