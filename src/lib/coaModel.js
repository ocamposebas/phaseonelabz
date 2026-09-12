const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|webp)(?:$|[?#])/i;
const PDF_EXTENSION = /\.pdf(?:$|[?#])/i;

export function normalizeCoaText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9.%+\-/\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function coaValueList(...values) {
  return values
    .flat(Infinity)
    .flatMap((value) => {
      if (typeof value !== "string") return [value];
      return value.split(/[,|\n]+/);
    })
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

function idList(...values) {
  return unique(
    coaValueList(...values)
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 0)
  );
}

function booleanValue(value) {
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "on"].includes(
    String(value ?? "").trim().toLowerCase()
  );
}

function firstText(...values) {
  return values
    .flat(Infinity)
    .map((value) => String(value ?? "").trim())
    .find(Boolean) || "";
}

function stripHtml(value = "") {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function safeHttpUrl(value) {
  const candidate = String(value || "").trim();
  if (!candidate) return "";

  try {
    const parsed = new URL(candidate);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return candidate.startsWith("/") ? candidate : "";
  }
}

export function getCoaDocumentKind(value) {
  const url = String(value || "").trim();
  if (!url) return "missing";
  if (PDF_EXTENSION.test(url)) return "pdf";
  if (IMAGE_EXTENSION.test(url)) return "image";
  return "external";
}

function normalizeDocument(record = {}, current = {}) {
  const fileUrl = safeHttpUrl(
    firstText(
      current.fileUrl,
      current.file_url,
      record.fileUrl,
      record.file_url
    )
  );
  const verificationUrl = safeHttpUrl(
    firstText(
      current.verifyUrl,
      current.verify_url,
      current.coaUrl,
      current.coa_url,
      current.url,
      record.verifyUrl,
      record.verify_url,
      record.coaUrl,
      record.coa_url,
      record.url
    )
  );
  const viewUrl = fileUrl || verificationUrl;
  const kind = getCoaDocumentKind(viewUrl);

  return {
    kind,
    viewUrl,
    previewUrl: kind === "pdf" || kind === "image" ? viewUrl : "",
    downloadUrl: kind === "pdf" && fileUrl ? fileUrl : "",
    verificationUrl:
      verificationUrl && verificationUrl !== viewUrl ? verificationUrl : "",
    attachmentId: Number(
      current.fileAttachmentId ||
        current.file_attachment_id ||
        record.fileAttachmentId ||
        record.file_attachment_id ||
        0
    ),
  };
}

export function normalizeCoaAssays(value) {
  return unique(
    coaValueList(value)
      .flatMap((item) => item.split(/\s*\/\s*|\s*;\s*/))
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

export function createWooProductIndex(products = []) {
  const byProductId = new Map();
  const byVariationId = new Map();

  products.forEach((product) => {
    if (!product || typeof product !== "object") return;

    const firstImage = product.images?.[0] || {};
    const productId = Number(product.id || 0);
    if (!productId) return;

    const normalized = {
      id: productId,
      name: stripHtml(product.name),
      slug: String(product.slug || ""),
      sku: String(product.sku || ""),
      category: stripHtml(product.categories?.[0]?.name || ""),
      image: {
        src: safeHttpUrl(firstImage.thumbnail || firstImage.src || product.image),
        fullSrc: safeHttpUrl(firstImage.src || firstImage.thumbnail || product.image),
        srcSet: String(firstImage.srcset || ""),
        sizes: String(firstImage.sizes || ""),
        alt: stripHtml(firstImage.alt || product.name),
      },
    };

    byProductId.set(productId, normalized);

    coaValueList(product.variations).forEach((variation) => {
      const variationId = Number(
        typeof variation === "object" ? variation?.id : variation
      );
      if (variationId > 0) byVariationId.set(variationId, normalized);
    });
  });

  return { byProductId, byVariationId };
}

function resolveWooProduct(record, productIndex) {
  if (!productIndex) return null;

  const variationIds = idList(
    record.matchedVariationId,
    record.matched_variation_id,
    record.variationIds,
    record.variation_ids
  );
  for (const id of variationIds) {
    if (productIndex.byVariationId?.has(id)) {
      return productIndex.byVariationId.get(id);
    }
  }

  const productIds = idList(
    record.matchedProductId,
    record.matched_product_id,
    record.productIds,
    record.product_ids,
    record.parentProductIds,
    record.parent_product_ids,
    record.wooIds,
    record.woo_ids
  );
  for (const id of productIds) {
    if (productIndex.byProductId?.has(id)) {
      return productIndex.byProductId.get(id);
    }
  }

  return null;
}

function normalizeCoaRecordInternal(record = {}, productIndex, overrides = {}) {
  const current =
    record.currentCoa && typeof record.currentCoa === "object"
      ? record.currentCoa
      : record.current_coa && typeof record.current_coa === "object"
        ? record.current_coa
        : {};
  const matchedProductId = Number(
    record.matchedProductId || record.matched_product_id || 0
  );
  const matchedVariationId = Number(
    record.matchedVariationId || record.matched_variation_id || 0
  );
  const productIds = idList(
    record.productIds,
    record.product_ids,
    record.productId,
    record.product_id
  );
  const parentProductIds = idList(
    record.parentProductIds,
    record.parent_product_ids
  );
  const variationIds = idList(
    record.variationIds,
    record.variation_ids,
    record.variationId,
    record.variation_id,
    matchedVariationId
  );
  const wooIds = idList(record.wooIds, record.woo_ids);
  const skus = unique(coaValueList(record.skus, record.sku));
  const aliases = unique(coaValueList(record.aliases, record.alias));
  const wooProduct = resolveWooProduct(record, productIndex);
  const tested = firstText(
    overrides.tested,
    current.tested,
    record.tested,
    current.method,
    record.method
  );
  const method = firstText(
    overrides.method,
    current.method,
    record.method,
    current.tested,
    record.tested
  );
  const isCurrentShippingLot =
    overrides.isCurrentShippingLot ??
    booleanValue(
      record.currentShippingLot ||
        record.current_shipping_lot ||
        record.activeShippingLot ||
        record.active_shipping_lot ||
        current.currentShippingLot ||
        current.current_shipping_lot
    );
  const rawId = firstText(
    overrides.id,
    record.id,
    record.coaId,
    record.coa_id,
    record.wpPostId,
    record.wp_post_id
  );
  const document = normalizeDocument(
    { ...record, ...overrides },
    overrides.documentSource || current
  );

  return {
    id: rawId || `coa-${overrides.index || 0}`,
    source: overrides.source || "manager",
    wpPostId: Number(record.wpPostId || record.wp_post_id || 0),
    coaNumber: firstText(
      overrides.coaNumber,
      record.coaNumber,
      record.coa_number,
      record.number
    ),
    product: {
      matchedProductId,
      matchedVariationId,
      productIds,
      parentProductIds,
      variationIds,
      wooIds,
      skus,
      aliases,
      name: stripHtml(
        firstText(
          overrides.productName,
          record.productName,
          record.product_name,
          record.product,
          wooProduct?.name,
          record.compound
        )
      ),
      familyName: stripHtml(
        firstText(
          record.familyName,
          record.family_name,
          wooProduct?.name,
          record.productName,
          record.product_name,
          record.compound
        )
      ),
      familyKey: firstText(record.familyKey, record.family_key),
      strength: firstText(overrides.strength, record.strength, record.dose),
      category: wooProduct?.category || "",
      image: wooProduct?.image || {
        src: safeHttpUrl(firstText(record.productImage, record.product_image)),
        fullSrc: safeHttpUrl(firstText(record.productImage, record.product_image)),
        srcSet: "",
        sizes: "",
        alt: "",
      },
      publicProductFound: Boolean(wooProduct),
    },
    batch: firstText(overrides.batch, record.batch, record.lot),
    testingDate: firstText(
      overrides.testingDate,
      current.date,
      current.coa_date,
      record.date,
      record.testingDate,
      record.testing_date
    ),
    laboratory: firstText(
      overrides.laboratory,
      current.laboratory,
      current.lab,
      record.laboratory,
      record.lab
    ),
    purity: firstText(overrides.purity, current.purity, record.purity),
    method,
    assays: normalizeCoaAssays(tested),
    panelTypes: unique(
      coaValueList(record.panelTypes, record.panel_types)
        .map((value) => normalizeCoaText(value).replace(/\s+/g, ""))
        .filter(Boolean)
    ),
    status: firstText(record.status, "Available"),
    isCurrentShippingLot: Boolean(isCurrentShippingLot),
    document,
  };
}

function nestedHistoryRecords(record, normalized, productIndex) {
  const history = Array.isArray(record.history) ? record.history : [];

  return history.map((item, index) => {
    const historyRecord = {
      ...record,
      currentCoa: item,
      current_coa: item,
      currentShippingLot: false,
      activeShippingLot: false,
      batch: firstText(item.batch, item.lot),
      date: firstText(item.date, item.coa_date),
      purity: firstText(item.purity),
      laboratory: firstText(item.laboratory, item.lab),
      method: firstText(item.method),
      tested: firstText(item.tested),
      fileUrl: firstText(item.fileUrl, item.file_url),
      verifyUrl: firstText(item.verifyUrl, item.verify_url),
      history: [],
    };

    return normalizeCoaRecordInternal(historyRecord, productIndex, {
      id: `${normalized.id}:history:${index}`,
      coaNumber: firstText(item.coaNumber, item.coa_number, normalized.coaNumber),
      productName: normalized.product.name,
      strength: normalized.product.strength,
      source: "legacy_history",
      isCurrentShippingLot: false,
      index,
    });
  });
}

export function normalizeCoaRecord(record = {}, productIndex, index = 0) {
  return normalizeCoaRecordInternal(record, productIndex, { index });
}

export function normalizeCoaCatalog(records = [], products = []) {
  const productIndex = createWooProductIndex(products);
  const normalized = [];

  records.forEach((record, index) => {
    if (!record || typeof record !== "object") return;
    const primary = normalizeCoaRecord(record, productIndex, index);
    normalized.push(primary, ...nestedHistoryRecords(record, primary, productIndex));
  });

  const uniqueRecords = new Map();
  normalized.forEach((record) => {
    const key = [
      record.id,
      normalizeCoaText(record.batch),
      record.testingDate,
      record.document.viewUrl,
    ].join("|");
    if (!uniqueRecords.has(key)) uniqueRecords.set(key, record);
  });

  return [...uniqueRecords.values()];
}

export function getCoaAssociation(record = {}) {
  const product = record.product || {};
  const variationId =
    Number(product.matchedVariationId || 0) ||
    Number(product.variationIds?.[0] || 0);
  if (variationId) {
    return { level: "variation", key: `variation:${variationId}` };
  }

  const sku = String(product.skus?.[0] || "").trim().toLowerCase();
  if (sku) return { level: "sku", key: `sku:${sku}` };

  const productId =
    Number(product.matchedProductId || 0) ||
    Number(product.productIds?.[0] || 0) ||
    Number(product.wooIds?.[0] || 0);
  if (productId) return { level: "product", key: `product:${productId}` };

  const parentId = Number(product.parentProductIds?.[0] || 0);
  if (parentId) return { level: "parent", key: `parent:${parentId}` };

  return { level: "record", key: `record:${record.id}` };
}

function familyIdentityIds(record) {
  const product = record.product || {};
  return idList(
    product.matchedProductId,
    product.productIds,
    product.parentProductIds
  );
}

function declaredFamilyKey(record) {
  const product = record.product || {};
  const normalizedKey = normalizeCoaText(product.familyKey).replace(
    /\s+/g,
    "-"
  );
  return normalizedKey ? `family:${normalizedKey}` : "";
}

function familyAssociationKey(record, familyKeysByProductId) {
  const explicitKey = declaredFamilyKey(record);
  if (explicitKey) return explicitKey;

  const inheritedKeys = unique(
    familyIdentityIds(record).flatMap((id) => [
      ...(familyKeysByProductId.get(id) || []),
    ])
  );
  if (inheritedKeys.length === 1) return inheritedKeys[0];

  const product = record.product || {};
  const parentId =
    Number(product.matchedProductId || 0) ||
    Number(product.parentProductIds?.[0] || 0) ||
    Number(product.productIds?.[0] || 0);
  return parentId ? `product:${parentId}` : `record:${record.id}`;
}

function familyDisplayName(record, familyKey) {
  const product = record.product || {};
  const configuredName = product.familyName || product.name || "COA product";
  const keyIdentity = normalizeCoaText(String(familyKey).replace(/^family:/, ""))
    .replace(/[\s-]+/g, "");
  const nameIdentity = normalizeCoaText(configuredName).replace(/[\s-]+/g, "");
  if (!familyKey.startsWith("family:") || keyIdentity === nameIdentity) {
    return configuredName;
  }

  const productName = String(product.name || "").trim();
  const strength = String(product.strength || "").trim();
  if (!productName || !strength) return configuredName;
  const strengthIndex = productName.toLowerCase().lastIndexOf(strength.toLowerCase());
  if (strengthIndex <= 0 || strengthIndex + strength.length !== productName.length) {
    return configuredName;
  }

  return productName.slice(0, strengthIndex).trim().replace(/[\s-]+$/, "") || configuredName;
}

function dateValue(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function groupCoaCatalog(records = []) {
  const families = new Map();
  const familyKeysByProductId = new Map();

  records.forEach((record) => {
    const familyKey = declaredFamilyKey(record);
    if (!familyKey) return;
    familyIdentityIds(record).forEach((id) => {
      if (!familyKeysByProductId.has(id)) familyKeysByProductId.set(id, new Set());
      familyKeysByProductId.get(id).add(familyKey);
    });
  });

  records.forEach((record) => {
    const familyKey = familyAssociationKey(record, familyKeysByProductId);
    if (!families.has(familyKey)) {
      families.set(familyKey, {
        key: familyKey,
        name: familyDisplayName(record, familyKey),
        category: record.product.category || "",
        image: record.product.image,
        publicProductFound: record.product.publicProductFound,
        presentations: new Map(),
      });
    }

    const family = families.get(familyKey);
    const association = getCoaAssociation(record);
    if (!family.presentations.has(association.key)) {
      family.presentations.set(association.key, {
        key: association.key,
        associationLevel: association.level,
        name: record.product.name || family.name,
        strength: record.product.strength || "",
        skus: record.product.skus || [],
        image: record.product.image,
        records: [],
      });
    }

    family.presentations.get(association.key).records.push(record);
  });

  return [...families.values()]
    .map((family) => ({
      ...family,
      presentations: [...family.presentations.values()]
        .map((presentation) => {
          const records = [...presentation.records].sort((left, right) => {
            const currentDifference =
              Number(right.isCurrentShippingLot) -
              Number(left.isCurrentShippingLot);
            return currentDifference || dateValue(right.testingDate) - dateValue(left.testingDate);
          });

          return {
            ...presentation,
            records,
            currentRecord: records.find((record) => record.isCurrentShippingLot) || null,
            historicalRecords: records.filter(
              (record) => !record.isCurrentShippingLot
            ),
          };
        })
        .sort((left, right) =>
          `${left.name} ${left.strength}`.localeCompare(
            `${right.name} ${right.strength}`
          )
        ),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function scoreCoaPresentation(presentation, query) {
  const cleanQuery = normalizeCoaText(query);
  if (!cleanQuery) return 1;

  const records = presentation.records || [];
  const productText = normalizeCoaText(
    [
      presentation.name,
      presentation.strength,
      ...(presentation.skus || []),
    ].join(" ")
  );
  const recordText = normalizeCoaText(
    records
      .flatMap((record) => [
        record.coaNumber,
        record.batch,
        record.testingDate,
        record.laboratory,
        record.purity,
        record.method,
        ...record.assays,
        ...record.product.aliases,
        ...record.product.skus,
      ])
      .join(" ")
  );

  let score = 0;
  if (productText === cleanQuery) score += 180;
  if (productText.includes(cleanQuery)) score += 110;
  if (recordText.includes(cleanQuery)) score += 80;

  records.forEach((record) => {
    if (normalizeCoaText(record.batch) === cleanQuery) score += 180;
    if (normalizeCoaText(record.coaNumber) === cleanQuery) score += 180;
    if (
      record.product.skus.some(
        (sku) => normalizeCoaText(sku) === cleanQuery
      )
    ) {
      score += 170;
    }
  });

  return score;
}

export function findPreferredCoaRecord(presentation, query, filter = "all") {
  const records = presentation?.records || [];
  const cleanQuery = normalizeCoaText(query);

  if (cleanQuery) {
    const exact = records.find((record) =>
      [record.batch, record.coaNumber, ...record.product.skus].some(
        (value) => normalizeCoaText(value) === cleanQuery
      )
    );
    if (exact) return exact;
  }

  if (filter === "historical") {
    return presentation.historicalRecords?.[0] || null;
  }

  return presentation.currentRecord || records[0] || null;
}

function recordProductIds(record = {}) {
  const product = record.product || {};
  return idList(
    product.matchedProductId,
    product.productIds,
    product.wooIds
  );
}

function recordVariationIds(record = {}) {
  const product = record.product || {};
  return idList(product.matchedVariationId, product.variationIds);
}

function chooseAssociatedRecord(records = [], strength = "") {
  if (!records.length) return null;

  const normalizedStrength = normalizeCoaText(strength);
  if (normalizedStrength) {
    const strengthMatches = records.filter((record) => {
      const recordStrength = normalizeCoaText(record.product?.strength);
      if (!recordStrength) return false;
      return (
        recordStrength === normalizedStrength ||
        recordStrength.includes(normalizedStrength) ||
        normalizedStrength.includes(recordStrength)
      );
    });
    if (strengthMatches.length) records = strengthMatches;
  }

  const distinctStrengths = unique(
    records.map((record) => normalizeCoaText(record.product?.strength)).filter(Boolean)
  );
  if (!normalizedStrength && distinctStrengths.length > 1) return null;

  return [...records].sort(
    (left, right) => dateValue(right.testingDate) - dateValue(left.testingDate)
  )[0];
}

export function findCoaForWooProduct({
  records = [],
  productId = 0,
  parentProductId = 0,
  variationId = 0,
  productSku = "",
  variationSku = "",
  strength = "",
  currentOnly = true,
} = {}) {
  const normalizedRecords = (Array.isArray(records) ? records : []).filter(
    (record) => !currentOnly || record?.isCurrentShippingLot
  );
  const selectedVariationId = Number(variationId || 0);
  const selectedProductId = Number(productId || 0);
  const selectedParentId = Number(parentProductId || 0);
  const skuCandidates = unique(
    [variationSku, productSku].map(normalizeCoaText).filter(Boolean)
  );

  if (selectedVariationId) {
    const variationMatches = normalizedRecords.filter((record) =>
      recordVariationIds(record).includes(selectedVariationId)
    );
    const match = chooseAssociatedRecord(variationMatches, strength);
    if (match) return match;
  }

  const eligibleForFallback = normalizedRecords.filter((record) => {
    const ids = recordVariationIds(record);
    return !selectedVariationId || !ids.length || ids.includes(selectedVariationId);
  });

  if (skuCandidates.length) {
    const skuMatches = eligibleForFallback.filter((record) =>
      (record.product?.skus || []).some((sku) =>
        skuCandidates.includes(normalizeCoaText(sku))
      )
    );
    const match = chooseAssociatedRecord(skuMatches, strength);
    if (match) return match;
  }

  if (selectedProductId) {
    const productMatches = eligibleForFallback.filter((record) =>
      recordProductIds(record).includes(selectedProductId)
    );
    const match = chooseAssociatedRecord(productMatches, strength);
    if (match) return match;
  }

  const parentId = selectedParentId || selectedProductId;
  if (parentId) {
    const parentMatches = eligibleForFallback.filter((record) =>
      idList(record.product?.parentProductIds).includes(parentId)
    );
    const match = chooseAssociatedRecord(parentMatches, strength);
    if (match) return match;
  }

  return null;
}

export function formatCoaDate(value, fallback = "Not reported") {
  if (!value) return fallback;
  const parsed = new Date(
    String(value).includes("T") ? String(value) : `${value}T00:00:00`
  );
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
