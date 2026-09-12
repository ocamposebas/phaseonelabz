import test from "node:test";
import assert from "node:assert/strict";
import {
  findCoaForWooProduct,
  getCoaDocumentKind,
  groupCoaCatalog,
  normalizeCoaCatalog,
  scoreCoaPresentation,
} from "../src/lib/coaModel.js";

test("normalization preserves missing scientific results and legacy current flags", () => {
  const [record] = normalizeCoaCatalog([
    {
      id: 10,
      productName: "Example 10MG",
      batch: "LOT-10",
      activeShippingLot: true,
      fileUrl: "https://example.test/coa-10.pdf",
    },
  ]);

  assert.equal(record.isCurrentShippingLot, true);
  assert.equal(record.purity, "");
  assert.equal(record.document.kind, "pdf");
});

test("document types distinguish PDF, image and external verifier", () => {
  assert.equal(getCoaDocumentKind("https://example.test/report.PDF?download=1"), "pdf");
  assert.equal(getCoaDocumentKind("https://example.test/report.webp"), "image");
  assert.equal(getCoaDocumentKind("https://verify.example.test/record/123"), "external");
});

test("strict WooCommerce association uses variation before SKU and product", () => {
  const records = normalizeCoaCatalog([
    {
      id: "variation",
      matchedProductId: 50,
      matchedVariationId: 501,
      skus: ["SHARED-SKU"],
      strength: "10MG",
      currentShippingLot: true,
      batch: "V-LOT",
    },
    {
      id: "product",
      matchedProductId: 50,
      skus: ["SHARED-SKU"],
      strength: "10MG",
      currentShippingLot: true,
      batch: "P-LOT",
    },
  ]);

  const match = findCoaForWooProduct({
    records,
    productId: 50,
    variationId: 501,
    productSku: "SHARED-SKU",
    strength: "10mg",
  });

  assert.equal(match.id, "variation");
});

test("names and aliases are searchable but never authoritative association", () => {
  const records = normalizeCoaCatalog([
    {
      id: "unmatched",
      productName: "Deadpool",
      aliases: ["Example Product"],
      currentShippingLot: true,
      batch: "DP-1",
    },
  ]);

  assert.equal(
    findCoaForWooProduct({ records, productId: 999, productSku: "NO-MATCH" }),
    null
  );
});

test("separate historical COAs form interactive batch history", () => {
  const records = normalizeCoaCatalog([
    {
      id: "current",
      matchedProductId: 77,
      sku: "P1-77",
      currentShippingLot: true,
      batch: "LOT-B",
      date: "2026-08-01",
    },
    {
      id: "history",
      matchedProductId: 77,
      sku: "P1-77",
      currentShippingLot: false,
      batch: "LOT-A",
      date: "2026-06-01",
    },
  ]);
  const [family] = groupCoaCatalog(records);
  const [presentation] = family.presentations;

  assert.equal(presentation.currentRecord.batch, "LOT-B");
  assert.deepEqual(
    presentation.historicalRecords.map((record) => record.batch),
    ["LOT-A"]
  );
  assert.ok(scoreCoaPresentation(presentation, "LOT-A") > 0);
  assert.ok(scoreCoaPresentation(presentation, "P1-77") > 0);
});
