import assert from "node:assert/strict";
import test from "node:test";

import {
  getCoaTestingPanel,
  groupCoaCatalog,
  normalizeCoaCatalog,
} from "../src/lib/coaModel.js";

test("full and standard panels expose the requested checked tests", () => {
  const full = getCoaTestingPanel({ panelTypes: ["full", "8x"] });
  const standard = getCoaTestingPanel({ panelTypes: ["3x", "standard"] });

  assert.equal(full.label, "7X Testing");
  assert.deepEqual(full.assays, [
    "Sterility",
    "Identification",
    "Purity",
    "Net content",
    "Heavy Metals",
    "Conformity",
    "Endotoxins",
  ]);
  assert.equal(standard.label, "3X Testing");
  assert.deepEqual(standard.assays, [
    "Identification",
    "Purity",
    "Net content",
  ]);
});

test("PL-TZ records with legacy family keys stay in one strength presentation", () => {
  const records = normalizeCoaCatalog([
    {
      id: "new-10",
      familyName: "PL-TZ",
      familyKey: "pl-tz",
      productName: "PL-TZ 10MG",
      strength: "10 mg",
      matchedProductId: 533,
      variationIds: [653],
      panelTypes: ["full", "8x"],
      currentShippingLot: true,
    },
    {
      id: "legacy-10",
      familyName: "PL-TZ",
      familyKey: "pl-sm",
      productName: "PL-TZ 10mg",
      strength: "10mg",
      matchedProductId: 533,
      productIds: [533],
      skus: ["PL-TZ"],
      panelTypes: ["3x", "standard"],
      currentShippingLot: true,
    },
  ]);
  const families = groupCoaCatalog(records);

  assert.equal(families.length, 1);
  assert.equal(families[0].name, "PL-TZ");
  assert.equal(families[0].presentations.length, 1);
  assert.equal(families[0].presentations[0].strength, "10 mg");
  assert.equal(families[0].presentations[0].records.length, 2);
});
