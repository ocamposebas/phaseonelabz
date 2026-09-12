import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeReputationPayload,
  normalizeReputationSource,
} from "../src/lib/reputationModel.js";

test("keeps valid provider-specific aggregate metrics", () => {
  const source = normalizeReputationSource({
    provider: "trustpilot",
    name: "Trustpilot",
    type: "Independent review platform",
    rating: 4.7,
    review_count: 125,
    public_url: "https://www.trustpilot.com/review/example.com",
    leave_review_url: "https://www.trustpilot.com/evaluate/example.com",
    last_updated: "2026-09-11T12:00:00Z",
    status: "active",
  });

  assert.equal(source.rating, 4.7);
  assert.equal(source.reviewCount, 125);
  assert.equal(source.provider, "trustpilot");
});

test("hides metrics unless the server marks them active", () => {
  for (const status of ["stale", "unavailable", "widget", "link_only"]) {
    const source = normalizeReputationSource({
      provider: `source-${status}`,
      name: "Source",
      rating: 5,
      review_count: 999,
      public_url: "https://example.com/reviews",
      status,
    });
    assert.equal(source.rating, null);
    assert.equal(source.reviewCount, null);
  }
});

test("rejects malformed sources and unsafe URLs", () => {
  assert.equal(
    normalizeReputationSource({
      provider: "bad",
      name: "Bad source",
      public_url: "javascript:alert(1)",
    }),
    null,
  );
});

test("never creates a combined score", () => {
  const payload = normalizeReputationPayload({
    rating: 4.9,
    review_count: 1000,
    sources: [],
  });

  assert.deepEqual(Object.keys(payload).sort(), [
    "disclosure",
    "generatedAt",
    "schemaVersion",
    "sources",
  ]);
});

test("normalization is stable across the Astro BFF camel-case payload", () => {
  const first = normalizeReputationPayload({
    schema_version: 1,
    generated_at: "2026-09-11T12:00:00Z",
    sources: [
      {
        provider: "trustpilot",
        name: "Trustpilot",
        rating: 4.6,
        review_count: 42,
        public_url: "https://www.trustpilot.com/review/example.com",
        status: "active",
      },
    ],
  });

  const second = normalizeReputationPayload(first);
  assert.equal(second.sources.length, 1);
  assert.equal(second.sources[0].rating, 4.6);
  assert.equal(second.sources[0].reviewCount, 42);
});

test("preserves a configured official TrustBox without inventing metrics", () => {
  const source = normalizeReputationSource({
    provider: "trustpilot",
    name: "Trustpilot",
    public_url: "https://www.trustpilot.com/review/example.com",
    status: "widget",
    widget: {
      provider: "trustpilot",
      business_unit_id: "business-unit",
      template_id: "template-id",
      locale: "en-US",
      theme: "dark",
      height: "52px",
    },
  });

  assert.equal(source.rating, null);
  assert.equal(source.reviewCount, null);
  assert.equal(source.widget.templateId, "template-id");
});
