import { createHash } from "node:crypto";

const WOO_TIMEOUT_MS = 15000;

export function cleanText(value = "", maxLength = 500) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeEmail(value = "") {
  return cleanText(value, 254).toLowerCase();
}

export function getClientIp(request) {
  return cleanText(
    request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown",
    80,
  );
}

export function getWooConfig() {
  const baseUrl = cleanText(
    import.meta.env.WOOCOMMERCE_URL ||
      import.meta.env.WOOCOMMERCE_URL2 ||
      import.meta.env.PUBLIC_WOOCOMMERCE_URL ||
      "",
    500,
  ).replace(/\/$/, "");

  return {
    baseUrl,
    consumerKey: cleanText(import.meta.env.WOOCOMMERCE_CONSUMER_KEY || "", 300),
    consumerSecret: cleanText(
      import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || "",
      300,
    ),
  };
}

function basicAuth(consumerKey, consumerSecret) {
  return `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;
}

export async function wooRequest(path, options = {}) {
  const config = getWooConfig();

  if (!config.baseUrl || !config.consumerKey || !config.consumerSecret) {
    throw new Error("WooCommerce contract storage is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WOO_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${config.baseUrl}/wp-json/wc/v3${path}`,
      {
        method: options.method || "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Authorization: basicAuth(config.consumerKey, config.consumerSecret),
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Phase One Labz Signed Agreement Service",
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      },
    );

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        cleanText(
          data?.message ||
            data?.error ||
            `WooCommerce request failed (${response.status}).`,
          500,
        ),
      );
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export function getOrderMeta(order = {}, key = "") {
  const item = Array.isArray(order?.meta_data)
    ? order.meta_data.find((entry) => entry?.key === key)
    : null;

  return item?.value ?? "";
}

export function normalizeContract(contract = {}, context = {}) {
  const signer = contract?.signer || {};
  const method = signer?.method === "type" ? "type" : "draw";
  const signerName = cleanText(signer?.fullName, 100);
  const typedSignature = cleanText(signer?.typedSignature, 100);
  const signatureImage = String(signer?.signatureImage || "").trim();
  const acceptedAt = cleanText(contract?.acceptedAt, 80);

  if (signerName.length < 3) {
    throw new Error("A full legal signer name is required.");
  }

  if (!acceptedAt || Number.isNaN(Date.parse(acceptedAt))) {
    throw new Error("The signature timestamp is invalid.");
  }

  const acceptedTime = Date.parse(acceptedAt);
  if (
    acceptedTime > Date.now() + 5 * 60 * 1000 ||
    acceptedTime < Date.now() - 48 * 60 * 60 * 1000
  ) {
    throw new Error("The electronic signature has expired. Please sign again.");
  }

  if (method === "draw") {
    if (!/^data:image\/png;base64,[a-z0-9+/=\r\n]+$/i.test(signatureImage)) {
      throw new Error("The drawn signature image is invalid.");
    }

    if (Buffer.byteLength(signatureImage, "utf8") > 220 * 1024) {
      throw new Error("The drawn signature image is too large.");
    }
  } else if (typedSignature.length < 3) {
    throw new Error("A typed signature is required.");
  }

  const items = Array.isArray(contract?.order?.items)
    ? contract.order.items.slice(0, 50).map((item) => ({
        productId: Math.max(0, Number(item?.productId || 0)),
        variationId: Math.max(0, Number(item?.variationId || 0)),
        name: cleanText(item?.name || "Catalog item", 180),
        sku: cleanText(item?.sku, 80),
        quantity: Math.max(1, Math.min(99, Number(item?.quantity || 1))),
      }))
    : [];

  if (!items.length) {
    throw new Error("The signed agreement does not contain any products.");
  }

  const policies = Array.isArray(contract?.policies)
    ? contract.policies.slice(0, 10).map((policy) => ({
        id: cleanText(policy?.id, 80),
        title: cleanText(policy?.title, 160),
        url: cleanText(policy?.url, 300),
        version: cleanText(policy?.version, 80),
      }))
    : [];
  const policySnapshots = Array.isArray(context?.policySnapshots)
    ? context.policySnapshots.slice(0, 10).map((policy) => ({
        id: cleanText(policy?.id, 80),
        title: cleanText(policy?.title, 160),
        updated: cleanText(policy?.updated, 100),
        description: cleanText(policy?.description, 2000),
        sections: Array.isArray(policy?.sections)
          ? policy.sections.slice(0, 100).map((section) => ({
              heading: cleanText(section?.heading, 300),
              body: Array.isArray(section?.body)
                ? section.body
                    .slice(0, 100)
                    .map((paragraph) => cleanText(paragraph, 10000))
                : [],
            }))
          : [],
      }))
    : [];

  const record = {
    contractVersion: cleanText(contract?.contractVersion, 120),
    acceptedAt: new Date(acceptedTime).toISOString(),
    capturedAt: new Date().toISOString(),
    signer: {
      fullName: signerName,
      method,
      typedSignature: method === "type" ? typedSignature : "",
    },
    customer: {
      firstName: cleanText(contract?.customer?.firstName, 100),
      lastName: cleanText(contract?.customer?.lastName, 100),
      email: normalizeEmail(
        contract?.customer?.email || context.customerEmail || "",
      ),
    },
    order: {
      id: Number(context.orderId || 0),
      number: cleanText(context.orderNumber || "", 80),
      currency: cleanText(contract?.order?.currency || "USD", 10),
      total: Math.max(0, Number(contract?.order?.total || 0)),
      paymentMethod: cleanText(contract?.order?.paymentMethod, 80),
      paymentMethodTitle: cleanText(
        contract?.order?.paymentMethodTitle,
        120,
      ),
      items,
    },
    acknowledgements: {
      age21OrOlder: contract?.acknowledgements?.age21OrOlder === true,
      inVitroResearchUseOnly:
        contract?.acknowledgements?.inVitroResearchUseOnly === true,
      termsAndConditionsAccepted:
        contract?.acknowledgements?.termsAndConditionsAccepted === true,
      refundPolicyAccepted:
        contract?.acknowledgements?.refundPolicyAccepted === true,
      researchUseOnlyPolicyAccepted:
        contract?.acknowledgements?.researchUseOnlyPolicyAccepted === true,
      electronicSignatureIntent:
        contract?.acknowledgements?.electronicSignatureIntent === true,
      electronicRecordsConsent:
        contract?.acknowledgements?.electronicRecordsConsent === true,
      text: cleanText(contract?.acknowledgements?.text, 1200),
    },
    policies,
    policySnapshots,
    evidence: {
      ipAddress: cleanText(context.ipAddress || "unknown", 80),
      userAgent: cleanText(context.userAgent || "", 300),
    },
  };

  const acknowledgements = record.acknowledgements;
  if (
    !acknowledgements.age21OrOlder ||
    !acknowledgements.inVitroResearchUseOnly ||
    !acknowledgements.termsAndConditionsAccepted ||
    !acknowledgements.refundPolicyAccepted ||
    !acknowledgements.researchUseOnlyPolicyAccepted ||
    !acknowledgements.electronicSignatureIntent ||
    !acknowledgements.electronicRecordsConsent
  ) {
    throw new Error("The required policy acknowledgements are incomplete.");
  }

  const canonical = JSON.stringify({
    record,
    signatureImage: method === "draw" ? signatureImage : "",
  });
  const evidenceHash = createHash("sha256").update(canonical).digest("hex");

  return {
    record: {
      ...record,
      evidence: {
        ...record.evidence,
        sha256: evidenceHash,
      },
    },
    signatureImage: method === "draw" ? signatureImage : "",
    evidenceHash,
  };
}

export function parseStoredContract(order = {}) {
  const rawRecord = getOrderMeta(order, "_phaseone_contract_record");
  const signatureImage = String(
    getOrderMeta(order, "_phaseone_contract_signature") || "",
  );

  let record = rawRecord;
  if (typeof rawRecord === "string") {
    try {
      record = JSON.parse(rawRecord);
    } catch {
      record = null;
    }
  }

  if (!record || typeof record !== "object") {
    throw new Error("No signed agreement is attached to this order.");
  }

  return { record, signatureImage };
}
