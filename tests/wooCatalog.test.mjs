import assert from "node:assert/strict";
import test from "node:test";

import {
  compactWooCatalogProduct,
  getCatalogThumbnailUrl,
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
      alt: "Test product vial",
    },
  ]);
});
