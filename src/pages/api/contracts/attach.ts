import type { APIRoute } from "astro";
import { policies } from "../../../components/data/policies.js";
import { createContractPdf } from "../../../lib/contractPdf.js";
import {
  cleanText,
  getClientIp,
  getOrderMeta,
  normalizeContract,
  normalizeEmail,
  wooRequest,
} from "../../../lib/contractServer.js";

export const prerender = false;

const MAX_BODY_BYTES = 320 * 1024;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 12;
const PDF_META_CHUNK_SIZE = 16 * 1024;

type RateStore = Map<string, number[]>;
const globalStore = globalThis as typeof globalThis & {
  __phaseoneContractAttachRateStore?: RateStore;
};
const rateStore =
  globalStore.__phaseoneContractAttachRateStore || new Map<string, number[]>();
globalStore.__phaseoneContractAttachRateStore = rateStore;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const configured = String(import.meta.env.CHECKOUT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (configured.length) return configured.includes(origin);

  return (
    /^https:\/\/([a-z0-9-]+\.)?phaseonelabz\.com$/i.test(origin) ||
    /^https?:\/\/localhost(?::\d+)?$/i.test(origin)
  );
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (rateStore.get(ip) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  rateStore.set(ip, recent);
  return false;
}

export const POST: APIRoute = async ({ request }) => {
  if (!originAllowed(request)) {
    return json({ success: false, error: "Origin not allowed." }, 403);
  }

  const ipAddress = getClientIp(request);
  if (isRateLimited(ipAddress)) {
    return json(
      { success: false, error: "Too many signature attempts. Try again shortly." },
      429,
    );
  }

  const rawBody = await request.text();
  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return json({ success: false, error: "Invalid signature payload." }, 400);
  }

  try {
    const body = JSON.parse(rawBody);
    const orderId = Number(body?.orderId || 0);
    const customerEmail = normalizeEmail(body?.customerEmail);

    if (!Number.isInteger(orderId) || orderId <= 0 || !customerEmail) {
      return json(
        { success: false, error: "Order ID and customer email are required." },
        400,
      );
    }

    const order = await wooRequest(`/orders/${orderId}`);
    const orderEmail = normalizeEmail(order?.billing?.email);

    if (!orderEmail || orderEmail !== customerEmail) {
      return json(
        { success: false, error: "The signed agreement does not match this order." },
        403,
      );
    }

    const suppliedOrderKey = cleanText(body?.orderKey, 150);
    const actualOrderKey = cleanText(order?.order_key, 150);
    if (suppliedOrderKey && actualOrderKey && suppliedOrderKey !== actualOrderKey) {
      return json({ success: false, error: "The order key is invalid." }, 403);
    }

    const existingHash = cleanText(
      getOrderMeta(order, "_phaseone_contract_hash"),
      100,
    );
    const existingPdf = String(
      getOrderMeta(order, "_phaseone_contract_pdf_base64") || "",
    );
    const existingPdfChunkCount = Number(
      getOrderMeta(order, "_phaseone_contract_pdf_chunk_count") || 0,
    );
    const needsPdfRepair =
      Boolean(existingHash) && !existingPdf && existingPdfChunkCount <= 0;

    if (existingHash && !needsPdfRepair) {
      return json({
        success: true,
        alreadyAttached: true,
        contractId: existingHash.slice(0, 16).toUpperCase(),
      });
    }

    const allowedStatuses = new Set([
      "pending",
      "on-hold",
      "failed",
      "checkout-draft",
    ]);
    if (
      !needsPdfRepair &&
      !allowedStatuses.has(String(order?.status || "").toLowerCase())
    ) {
      return json(
        {
          success: false,
          error: "This order can no longer accept a new electronic signature.",
        },
        409,
      );
    }

    const verifiedContract = {
      ...(body?.contract || {}),
      customer: {
        firstName: order?.billing?.first_name || "",
        lastName: order?.billing?.last_name || "",
        email: orderEmail,
      },
      order: {
        currency: order?.currency || "USD",
        total: Number(order?.total || 0),
        paymentMethod: order?.payment_method || "",
        paymentMethodTitle: order?.payment_method_title || "",
        items: Array.isArray(order?.line_items)
          ? order.line_items.map((item: Record<string, unknown>) => ({
              productId: Number(item?.product_id || 0),
              variationId: Number(item?.variation_id || 0),
              name: item?.name || "Catalog item",
              sku: item?.sku || "",
              quantity: Number(item?.quantity || 1),
            }))
          : [],
      },
    };

    const normalized = normalizeContract(verifiedContract, {
      orderId,
      orderNumber: order?.number || String(orderId),
      customerEmail: orderEmail,
      ipAddress,
      userAgent: request.headers.get("user-agent") || "",
      policySnapshots: [
        { id: "research-use-only", ...policies["research-use-only"] },
        { id: "terms", ...policies.terms },
        { id: "refund", ...policies.refund },
      ],
    });
    const pdfBuffer = await createContractPdf({
      record: normalized.record,
      signatureImage: normalized.signatureImage,
    });

    if (!pdfBuffer.length || pdfBuffer.length > 2 * 1024 * 1024) {
      throw new Error("The signed agreement PDF could not be prepared.");
    }
    const pdfBase64 = pdfBuffer.toString("base64");
    const pdfChunks = [];

    for (let index = 0; index < pdfBase64.length; index += PDF_META_CHUNK_SIZE) {
      pdfChunks.push(pdfBase64.slice(index, index + PDF_META_CHUNK_SIZE));
    }

    if (!pdfChunks.length || pdfChunks.length > 180) {
      throw new Error("The signed agreement PDF could not be stored safely.");
    }

    const pdfMetaData = [
      {
        key: "_phaseone_contract_pdf_chunk_count",
        value: String(pdfChunks.length),
      },
      ...pdfChunks.map((chunk, index) => ({
        key: `_phaseone_contract_pdf_chunk_${index + 1}`,
        value: chunk,
      })),
    ];

    await wooRequest(`/orders/${orderId}`, {
      method: "PUT",
      body: {
        meta_data: [
          {
            key: "_phaseone_contract_record",
            value: JSON.stringify(normalized.record),
          },
          {
            key: "_phaseone_contract_signature",
            value: normalized.signatureImage,
          },
          {
            key: "_phaseone_contract_hash",
            value: normalized.evidenceHash,
          },
          ...pdfMetaData,
          {
            key: "_phaseone_contract_pdf_filename",
            value: `Phase-One-Labz-Signed-Agreement-Order-${order?.number || orderId}.pdf`,
          },
          {
            key: "_phaseone_contract_version",
            value: normalized.record.contractVersion,
          },
          {
            key: "_phaseone_contract_accepted_at",
            value: normalized.record.acceptedAt,
          },
          {
            key: "_phaseone_contract_signer",
            value: normalized.record.signer.fullName,
          },
          {
            key: "_phaseone_contract_email_status",
            value: "pending_payment",
          },
        ],
      },
    });

    try {
      await wooRequest(`/orders/${orderId}/notes`, {
        method: "POST",
        body: {
          note: `Electronic purchase agreement signed by ${normalized.record.signer.fullName}. Evidence ID: ${normalized.evidenceHash.slice(0, 16).toUpperCase()}.`,
          customer_note: false,
        },
      });
    } catch {
      // The signed metadata is authoritative; a missing admin note is non-fatal.
    }

    return json({
      success: true,
      contractId: normalized.evidenceHash.slice(0, 16).toUpperCase(),
      acceptedAt: normalized.record.acceptedAt,
    });
  } catch (error) {
    console.error("Contract attachment failed", error);
    return json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "The signed agreement could not be attached.",
      },
      500,
    );
  }
};
