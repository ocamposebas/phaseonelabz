import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { policies } from "../components/data/policies.js";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 52;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
  navy: rgb(0.035, 0.075, 0.15),
  navySoft: rgb(0.075, 0.13, 0.24),
  blue: rgb(0.12, 0.38, 0.78),
  cyan: rgb(0.08, 0.63, 0.78),
  ink: rgb(0.08, 0.12, 0.2),
  slate: rgb(0.31, 0.38, 0.48),
  muted: rgb(0.56, 0.62, 0.7),
  line: rgb(0.86, 0.89, 0.93),
  pale: rgb(0.95, 0.97, 1),
  white: rgb(1, 1, 1),
};

function pdfSafe(value = "") {
  return String(value || "")
    .replace(/â€™|â€˜|’|‘/g, "'")
    .replace(/â€œ|â€|“|”/g, '"')
    .replace(/â€“|â€”|–|—/g, "-")
    .replace(/â€¦|…/g, "...")
    .replace(/Â/g, "")
    .replace(/[^\x20-\x7e\xa0-\xff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(text, font, size, maxWidth) {
  const clean = pdfSafe(text);
  if (!clean) return [];

  const words = clean.split(" ");
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      return;
    }

    if (line) lines.push(line);

    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      line = word;
      return;
    }

    let fragment = "";
    [...word].forEach((character) => {
      const next = fragment + character;
      if (font.widthOfTextAtSize(next, size) > maxWidth && fragment) {
        lines.push(fragment);
        fragment = character;
      } else {
        fragment = next;
      }
    });
    line = fragment;
  });

  if (line) lines.push(line);
  return lines;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return pdfSafe(value);

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

function formatMoney(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(Number(value || 0));
}

export async function createContractPdf({ record, signatureImage = "" }) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const createdAt = new Date(record?.capturedAt || Date.now());

  pdf.setTitle(
    `Signed Purchase & Research Use Agreement - Order ${record?.order?.number || record?.order?.id}`,
  );
  pdf.setAuthor("Phase One Labz");
  pdf.setSubject("Electronic signature and policy acceptance record");
  pdf.setKeywords([
    "Phase One Labz",
    "electronic signature",
    "research use only",
    "purchase agreement",
  ]);
  pdf.setCreationDate(createdAt);
  pdf.setModificationDate(createdAt);

  const addPage = (sectionLabel = "SIGNED AGREEMENT") => {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 12,
      width: PAGE_WIDTH,
      height: 12,
      color: COLORS.blue,
    });
    page.drawRectangle({
      x: PAGE_WIDTH - 148,
      y: PAGE_HEIGHT - 12,
      width: 148,
      height: 12,
      color: COLORS.cyan,
    });
    page.drawText("PHASE ONE LABZ", {
      x: MARGIN,
      y: PAGE_HEIGHT - 38,
      font: bold,
      size: 8,
      color: COLORS.navy,
    });
    page.drawText(sectionLabel, {
      x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(sectionLabel, 7),
      y: PAGE_HEIGHT - 38,
      font: bold,
      size: 7,
      color: COLORS.muted,
    });
    page.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 48 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 48 },
      thickness: 0.7,
      color: COLORS.line,
    });
    return page;
  };

  let page = addPage("EXECUTED COPY");

  page.drawText("PURCHASE &", {
    x: MARGIN,
    y: 665,
    font: bold,
    size: 29,
    color: COLORS.navy,
  });
  page.drawText("RESEARCH USE AGREEMENT", {
    x: MARGIN,
    y: 632,
    font: bold,
    size: 29,
    color: COLORS.blue,
  });
  page.drawText("Electronic signature record and policy acceptance certificate", {
    x: MARGIN,
    y: 605,
    font: regular,
    size: 10,
    color: COLORS.slate,
  });

  page.drawRectangle({
    x: MARGIN,
    y: 530,
    width: CONTENT_WIDTH,
    height: 50,
    borderColor: COLORS.line,
    borderWidth: 0.8,
    color: COLORS.pale,
  });

  const coverColumns = [
    ["ORDER", `#${record?.order?.number || record?.order?.id || "-"}`],
    ["ACCEPTED (UTC)", formatDate(record?.acceptedAt)],
    ["EVIDENCE ID", String(record?.evidence?.sha256 || "").slice(0, 16).toUpperCase()],
  ];
  const coverColumnWidth = CONTENT_WIDTH / coverColumns.length;

  coverColumns.forEach(([label, value], index) => {
    const x = MARGIN + index * coverColumnWidth + 12;
    page.drawText(label, {
      x,
      y: 562,
      font: bold,
      size: 6.5,
      color: COLORS.muted,
    });
    const lines = wrapText(value, bold, 8.5, coverColumnWidth - 22).slice(0, 2);
    lines.forEach((line, lineIndex) => {
      page.drawText(line, {
        x,
        y: 546 - lineIndex * 10,
        font: bold,
        size: 8.5,
        color: COLORS.ink,
      });
    });
  });

  page.drawText("SIGNED BY", {
    x: MARGIN,
    y: 487,
    font: bold,
    size: 7,
    color: COLORS.muted,
  });
  page.drawText(pdfSafe(record?.signer?.fullName), {
    x: MARGIN,
    y: 466,
    font: bold,
    size: 15,
    color: COLORS.ink,
  });
  page.drawText(pdfSafe(record?.customer?.email), {
    x: MARGIN,
    y: 448,
    font: regular,
    size: 9,
    color: COLORS.slate,
  });

  page.drawRectangle({
    x: MARGIN,
    y: 285,
    width: CONTENT_WIDTH,
    height: 135,
    borderColor: COLORS.line,
    borderWidth: 0.8,
    color: COLORS.white,
  });
  page.drawText("ELECTRONIC SIGNATURE", {
    x: MARGIN + 15,
    y: 399,
    font: bold,
    size: 6.5,
    color: COLORS.muted,
  });

  if (record?.signer?.method === "draw" && signatureImage) {
    try {
      const signatureBytes = Buffer.from(
        signatureImage.replace(/^data:image\/png;base64,/i, ""),
        "base64",
      );
      const signature = await pdf.embedPng(signatureBytes);
      const dimensions = signature.scaleToFit(CONTENT_WIDTH - 60, 82);
      page.drawImage(signature, {
        x: MARGIN + (CONTENT_WIDTH - dimensions.width) / 2,
        y: 315,
        width: dimensions.width,
        height: dimensions.height,
      });
    } catch {
      page.drawText("[Drawn signature image could not be rendered]", {
        x: MARGIN + 18,
        y: 350,
        font: italic,
        size: 12,
        color: COLORS.slate,
      });
    }
  } else {
    const typed = pdfSafe(
      record?.signer?.typedSignature || record?.signer?.fullName,
    );
    const signatureSize = Math.min(
      31,
      Math.max(17, (CONTENT_WIDTH - 50) / Math.max(typed.length * 0.46, 1)),
    );
    page.drawText(typed, {
      x: MARGIN + 22,
      y: 343,
      font: italic,
      size: signatureSize,
      color: COLORS.navySoft,
    });
  }

  page.drawLine({
    start: { x: MARGIN + 18, y: 310 },
    end: { x: PAGE_WIDTH - MARGIN - 18, y: 310 },
    thickness: 0.8,
    color: COLORS.line,
  });

  const acknowledgement = wrapText(
    record?.acknowledgements?.text,
    regular,
    8.5,
    CONTENT_WIDTH,
  );
  acknowledgement.slice(0, 5).forEach((line, index) => {
    page.drawText(line, {
      x: MARGIN,
      y: 245 - index * 12,
      font: regular,
      size: 8.5,
      color: COLORS.slate,
    });
  });

  page.drawRectangle({
    x: MARGIN,
    y: 108,
    width: CONTENT_WIDTH,
    height: 66,
    color: COLORS.navy,
  });
  page.drawText("DOCUMENT INTEGRITY", {
    x: MARGIN + 16,
    y: 151,
    font: bold,
    size: 7,
    color: rgb(0.55, 0.74, 1),
  });
  page.drawText(pdfSafe(record?.evidence?.sha256), {
    x: MARGIN + 16,
    y: 133,
    font: regular,
    size: 7.2,
    color: COLORS.white,
  });
  page.drawText(
    `Contract version: ${pdfSafe(record?.contractVersion)}  |  Signature method: ${pdfSafe(record?.signer?.method)}`,
    {
      x: MARGIN + 16,
      y: 117,
      font: regular,
      size: 7,
      color: rgb(0.65, 0.7, 0.78),
    },
  );

  page = addPage("ORDER & ACCEPTANCE");
  let y = PAGE_HEIGHT - 82;

  const ensureSpace = (height, sectionLabel = "AGREEMENT") => {
    if (y - height >= 60) return;
    page = addPage(sectionLabel);
    y = PAGE_HEIGHT - 74;
  };

  const heading = (text, level = 1, sectionLabel = "AGREEMENT") => {
    const size = level === 1 ? 18 : 11;
    const space = level === 1 ? 38 : 27;
    ensureSpace(space, sectionLabel);
    page.drawText(pdfSafe(text), {
      x: MARGIN,
      y,
      font: bold,
      size,
      color: level === 1 ? COLORS.navy : COLORS.blue,
    });
    y -= level === 1 ? 28 : 20;
  };

  const paragraph = (
    text,
    {
      font = regular,
      size = 9,
      color = COLORS.slate,
      gap = 9,
      indent = 0,
      sectionLabel = "AGREEMENT",
    } = {},
  ) => {
    const lines = wrapText(text, font, size, CONTENT_WIDTH - indent);
    const lineHeight = size * 1.45;
    ensureSpace(lines.length * lineHeight + gap, sectionLabel);
    lines.forEach((line) => {
      page.drawText(line, {
        x: MARGIN + indent,
        y,
        font,
        size,
        color,
      });
      y -= lineHeight;
    });
    y -= gap;
  };

  heading("Order record");
  const orderFacts = [
    ["Customer", record?.signer?.fullName],
    ["Email", record?.customer?.email],
    ["Order", `#${record?.order?.number || record?.order?.id}`],
    [
      "Payment",
      record?.order?.paymentMethodTitle || record?.order?.paymentMethod || "-",
    ],
    [
      "Order total",
      formatMoney(record?.order?.total, record?.order?.currency),
    ],
  ];

  orderFacts.forEach(([label, value], index) => {
    const rowY = y - index * 24;
    if (index % 2 === 0) {
      page.drawRectangle({
        x: MARGIN,
        y: rowY - 7,
        width: CONTENT_WIDTH,
        height: 22,
        color: COLORS.pale,
      });
    }
    page.drawText(pdfSafe(label).toUpperCase(), {
      x: MARGIN + 10,
      y: rowY,
      font: bold,
      size: 6.5,
      color: COLORS.muted,
    });
    page.drawText(pdfSafe(value), {
      x: MARGIN + 130,
      y: rowY,
      font: regular,
      size: 8.5,
      color: COLORS.ink,
    });
  });
  y -= orderFacts.length * 24 + 14;

  heading("Products covered by this signature", 2);
  (record?.order?.items || []).forEach((item, index) => {
    ensureSpace(25);
    page.drawText(String(index + 1).padStart(2, "0"), {
      x: MARGIN,
      y,
      font: bold,
      size: 7,
      color: COLORS.blue,
    });
    page.drawText(pdfSafe(item?.name), {
      x: MARGIN + 28,
      y,
      font: bold,
      size: 8.5,
      color: COLORS.ink,
    });
    const qty = `QTY ${Number(item?.quantity || 1)}`;
    page.drawText(qty, {
      x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(qty, 7),
      y,
      font: bold,
      size: 7,
      color: COLORS.slate,
    });
    y -= 20;
  });
  y -= 7;

  heading("What the signer expressly accepted", 2);
  [
    "The signer is 21 years of age or older and has authority to place this order.",
    "Every product is acquired strictly for lawful laboratory, analytical, reference, educational, or in-vitro research use only.",
    "No product is intended or authorized for human consumption, animal use, medical use, diagnosis, treatment, compounding, injection, ingestion, or any other prohibited use.",
    "The signer reviewed and accepted the Terms and Conditions, Refund Policy, and Research Use Only Policy identified in this executed copy.",
    "The signer intends the electronic signature shown in this document to evidence consent to the purchase and incorporated policies.",
    "The signer consented to receive and retain the executed agreement electronically at the order email address.",
  ].forEach((item) => paragraph(`-  ${item}`, { indent: 8, gap: 5 }));

  heading("Electronic evidence", 2);
  paragraph(
    `Acceptance time (UTC): ${formatDate(record?.acceptedAt)}. Capture time (UTC): ${formatDate(record?.capturedAt)}. IP address recorded by the checkout: ${record?.evidence?.ipAddress || "unavailable"}.`,
  );
  paragraph(
    `SHA-256 evidence hash: ${record?.evidence?.sha256}. This identifier links the signer, order, accepted policy versions, timestamp, and signature evidence stored with the order.`,
    { size: 8 },
  );

  const selectedPolicies =
    Array.isArray(record?.policySnapshots) && record.policySnapshots.length
      ? record.policySnapshots
      : [
          policies["research-use-only"],
          policies.terms,
          policies.refund,
        ].filter(Boolean);

  selectedPolicies.forEach((policy) => {
    page = addPage("INCORPORATED POLICIES");
    y = PAGE_HEIGHT - 82;
    heading(policy.title, 1, "INCORPORATED POLICIES");
    paragraph(policy.updated, {
      font: bold,
      size: 7.5,
      color: COLORS.blue,
      sectionLabel: "INCORPORATED POLICIES",
    });
    paragraph(policy.description, {
      size: 9.5,
      color: COLORS.ink,
      sectionLabel: "INCORPORATED POLICIES",
    });

    (policy.sections || []).forEach((section) => {
      heading(section.heading, 2, "INCORPORATED POLICIES");
      (section.body || []).forEach((body) =>
        paragraph(body, {
          size: 8.4,
          gap: 7,
          sectionLabel: "INCORPORATED POLICIES",
        }),
      );
    });
  });

  const pages = pdf.getPages();
  pages.forEach((currentPage, index) => {
    const footerText = `PHASE ONE LABZ  |  EXECUTED COPY  |  PAGE ${index + 1} OF ${pages.length}`;
    currentPage.drawLine({
      start: { x: MARGIN, y: 45 },
      end: { x: PAGE_WIDTH - MARGIN, y: 45 },
      thickness: 0.6,
      color: COLORS.line,
    });
    currentPage.drawText(footerText, {
      x: MARGIN,
      y: 29,
      font: bold,
      size: 6.5,
      color: COLORS.muted,
    });
    currentPage.drawText(
      String(record?.evidence?.sha256 || "").slice(0, 16).toUpperCase(),
      {
        x:
          PAGE_WIDTH -
          MARGIN -
          bold.widthOfTextAtSize(
            String(record?.evidence?.sha256 || "")
              .slice(0, 16)
              .toUpperCase(),
            6.5,
          ),
        y: 29,
        font: bold,
        size: 6.5,
        color: COLORS.blue,
      },
    );
  });

  return Buffer.from(await pdf.save());
}
