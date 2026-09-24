import test from "node:test";
import assert from "node:assert/strict";

import {
  getProductCatalogCategory,
  productMatchesCatalogCategory,
  resolveCatalogCategory,
} from "../src/lib/catalogTaxonomy.js";

test("catalog query labels and legacy labels resolve to the same customer categories", () => {
  assert.equal(resolveCatalogCategory("Peptide Blends"), "Peptide Blends");
  assert.equal(resolveCatalogCategory("Research Blends"), "Peptide Blends");
  assert.equal(resolveCatalogCategory("research-peptides"), "Peptides");
  assert.equal(resolveCatalogCategory("Aminos & Liquids"), "Aminos & Liquids");
  assert.equal(resolveCatalogCategory("Reconstituition Solution"), "Aminos & Liquids");
  assert.equal(resolveCatalogCategory("raw"), "Raws");
});

test("products are assigned to one precise customer-facing catalog category", () => {
  assert.equal(
    getProductCatalogCategory({
      name: "GHK-Cu + KPV Blend",
      categories: [{ name: "Cosmetic & Skin" }],
      tags: [{ name: "Blend" }],
    }),
    "Peptide Blends",
  );
  assert.equal(
    getProductCatalogCategory({
      name: "GHK-Cu (RAW) 1g",
      tags: [{ name: "RAW" }],
    }),
    "Raws",
  );
  assert.equal(
    getProductCatalogCategory({
      name: "H- Recon Water",
      categories: [{ name: "Reconstituition Solution" }],
    }),
    "Aminos & Liquids",
  );
  assert.equal(
    getProductCatalogCategory({
      name: "NAD+",
      categories: [{ name: "Longevity & Other" }],
    }),
    "Aminos & Liquids",
  );
  assert.equal(
    getProductCatalogCategory({
      name: "BPC-157",
      categories: [{ name: "Healing & Recovery" }],
    }),
    "Peptides",
  );
  assert.equal(
    getProductCatalogCategory({
      name: "Need Money For Peptides Tee",
      categories: [{ name: "Accesories" }],
    }),
    null,
  );
});

test("specific category filters never fall back to the full catalog", () => {
  const blend = {
    name: "GLOW",
    categories: [{ name: "Research Blends" }],
    tags: [{ name: "Blend" }],
  };

  assert.equal(productMatchesCatalogCategory(blend, "Shop All"), true);
  assert.equal(productMatchesCatalogCategory(blend, "Peptide Blends"), true);
  assert.equal(productMatchesCatalogCategory(blend, "Peptides"), false);
  assert.equal(productMatchesCatalogCategory(blend, "Aminos & Liquids"), false);
});
