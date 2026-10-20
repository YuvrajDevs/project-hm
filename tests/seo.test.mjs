// Public content hub guardrails. Run with: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_PAGES, PILLARS, CHILDREN } from "../lib/seo/pages.ts";
import { PUBLIC_SAMPLE_DECKS, isPublicDeck } from "../lib/seo/sfw-decks.ts";
import { DECK_BY_ID } from "../lib/games/decks.ts";

// Mirrors app/robots.ts's disallow list — kept in sync by hand since robots.ts
// imports "@/lib/seo" and can't be loaded by plain node without a bundler.
const PRIVATE_ROUTES = ["/settings", "/profile", "/pair", "/onboarding", "/admin", "/api"];

test("no two public pages share a path, title, meta description or primary query", () => {
  const paths = new Set(), titles = new Set(), descriptions = new Set(), queries = new Set();
  for (const page of ALL_PAGES) {
    assert.ok(!paths.has(page.path), `duplicate path: ${page.path}`);
    paths.add(page.path);
    assert.ok(!titles.has(page.title), `duplicate title "${page.title}" (${page.path})`);
    titles.add(page.title);
    assert.ok(!descriptions.has(page.description), `duplicate description (${page.path})`);
    descriptions.add(page.description);
    assert.ok(!queries.has(page.primaryQuery), `duplicate primaryQuery "${page.primaryQuery}" (${page.path})`);
    queries.add(page.primaryQuery);
  }
});

test("every title is <=60 chars and every description is <=160 chars", () => {
  for (const page of ALL_PAGES) {
    assert.ok(page.title.length <= 60, `${page.path} title is ${page.title.length} chars`);
    assert.ok(page.description.length <= 160, `${page.path} description is ${page.description.length} chars`);
  }
});

test("every page has an H1, an FAQ, and a way to reach other pages", () => {
  for (const page of ALL_PAGES) {
    assert.ok(page.h1 && page.h1.length > 0, `${page.path} has no h1`);
    assert.ok(page.faqs.length >= 4, `${page.path} has only ${page.faqs.length} FAQs`);
    const hasLinks = page.kind === "pillar" ? page.children.length > 0 : page.relatedSlugs.length > 0;
    assert.ok(hasLinks, `${page.path} has no outgoing links`);
  }
});

test("every child's source decks are public and known to the game engine", () => {
  for (const page of CHILDREN) {
    for (const deckId of page.sourceDecks) {
      assert.ok(isPublicDeck(deckId), `${page.path} uses non-public deck "${deckId}"`);
      assert.ok(DECK_BY_ID[deckId], `${page.path} uses unknown deck "${deckId}"`);
    }
  }
});

test("the public deck allow-list never includes an excluded/after-dark deck", () => {
  // Brief's explicit exclude list, plus the ones that invert the list would miss.
  const excluded = [
    "thats_kinky", "raw_it_is", "yay_or_nay", "tod_no_limits", "tod_spicy",
    "wyr_spicy", "wyr_unhinged", "after_12", "thats_spicy", "closer",
    "tot_after_dark", "nhie_after_dark", "likely_after_dark",
    "getting_warmer", "long_distance", "when_we_meet", "tod_flirty", "unspoken",
  ];
  for (const id of excluded) {
    assert.ok(!PUBLIC_SAMPLE_DECKS.includes(id), `excluded deck "${id}" is in PUBLIC_SAMPLE_DECKS`);
  }
});

test("no public page registers a private route's path", () => {
  for (const page of ALL_PAGES) {
    assert.ok(!PRIVATE_ROUTES.includes(page.path), `private route ${page.path} is in the content registry`);
  }
});

test("every pillar's children[] list matches the children that point back at it", () => {
  for (const pillar of PILLARS) {
    const actualChildren = CHILDREN.filter((c) => c.pillarPath === pillar.path).map((c) => c.path);
    assert.deepEqual(
      [...pillar.children].sort(),
      [...actualChildren].sort(),
      `${pillar.path} children[] out of sync with child pages`
    );
  }
});

test("every relatedSlugs and pillarPath entry resolves to a real page", () => {
  const allPaths = new Set(ALL_PAGES.map((p) => p.path));
  for (const page of CHILDREN) {
    for (const path of page.relatedSlugs) {
      assert.ok(allPaths.has(path), `${page.path} links to missing page ${path}`);
    }
    if (page.pillarPath) {
      assert.ok(allPaths.has(page.pillarPath), `${page.path} pillarPath ${page.pillarPath} doesn't exist`);
    }
  }
  for (const pillar of PILLARS) {
    for (const path of pillar.children) {
      assert.ok(allPaths.has(path), `${pillar.path} links to missing child ${path}`);
    }
  }
});
