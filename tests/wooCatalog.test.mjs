import assert from "node:assert/strict";
import test from "node:test";

import {
  compactWooCatalogProduct,
  fetchWooCatalog,
  fetchWooProductVariations,
  getCatalogThumbnailUrl,
  getResponsiveImageCandidate,
} from "../src/lib/wooCatalog.js";

test("catalog thumbnails use the lightweight WordPress image variant", () => {
  assert.equal(
    getCatalogThumbnailUrl(
      "https://example.com/wp-content/uploads/2026/09/product.png?ver=1"
    ),
    "https://example.com/wp-content/uploads/2026/09/product-300x300.png?ver=1"
  );

  assert.equal(
    getCatalogThumbnailUrl(
      "https://example.com/wp-content/uploads/2026/09/product-1024x1024.webp"
    ),
    "https://example.com/wp-content/uploads/2026/09/product-300x300.webp"
  );

  assert.equal(
    getCatalogThumbnailUrl("https://cdn.example.com/product.png"),
    "https://cdn.example.com/product.png"
  );
});

test("catalog search chooses the smallest adequate responsive image", () => {
  assert.equal(
    getResponsiveImageCandidate(
      "https://example.com/product-96.png 96w, https://example.com/product-192.png 192w, https://example.com/product.png 1200w",
      160
    ),
    "https://example.com/product-192.png"
  );
});

test("compact catalog products retain the full image as a fallback", () => {
  const product = compactWooCatalogProduct({
    id: 42,
    name: "Test product",
    images: [
      {
        src: "https://example.com/wp-content/uploads/2026/09/product.png",
        alt: "Test product vial",
      },
    ],
  });

  assert.deepEqual(product.images, [
    {
      id: undefined,
      src: "https://example.com/wp-content/uploads/2026/09/product.png",
      thumbnail:
        "https://example.com/wp-content/uploads/2026/09/product-300x300.png",
      searchThumbnail:
        "https://example.com/wp-content/uploads/2026/09/product-300x300.png",
      alt: "Test product vial",
    },
  ]);
});

test("small catalogs use one compact 50-product upstream request", async () => {
  const requests = [];
  const products = await fetchWooCatalog({
    baseUrl: "https://store.example.com",
    consumerKey: "key",
    consumerSecret: "secret",
    perPage: 100,
    fetchImpl: async (url) => {
      requests.push(new URL(url));
      return {
        ok: true,
        json: async () => [{ id: 1, name: "Only product", type: "simple" }],
      };
    },
  });

  assert.equal(products.length, 1);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].searchParams.get("per_page"), "50");
  assert.equal(requests[0].searchParams.get("page"), "1");
  assert.ok(requests[0].searchParams.get("_fields")?.includes("images"));
});

test("variation requests match the known count and omit unused fields", async () => {
  let requestUrl;
  await fetchWooProductVariations({
    baseUrl: "https://store.example.com",
    consumerKey: "key",
    consumerSecret: "secret",
    productId: 42,
    expectedCount: 3,
    fetchImpl: async (url) => {
      requestUrl = new URL(url);
      return { ok: true, json: async () => [] };
    },
  });

  assert.equal(requestUrl.searchParams.get("per_page"), "3");
  assert.ok(requestUrl.searchParams.get("_fields")?.includes("stock_status"));
  assert.ok(!requestUrl.searchParams.get("_fields")?.includes("date_created"));
});
