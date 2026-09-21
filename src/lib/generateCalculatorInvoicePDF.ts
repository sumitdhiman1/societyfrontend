import { authService } from "./authService";
import { countryService } from "./countryService";
import { getVatRateForCountry } from "./vatHelper";

// ─── Shared Utilities ────────────────────────────────────────────────────────

function loadScript(src: string): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined")
    return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensurePdfLibraries(): Promise<{
  html2canvasLib: any;
  jsPdfLib: any;
}> {
  if (typeof window === "undefined") {
    throw new Error("Window is not available");
  }

  if (!(window as any).html2canvas) {
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
    );
  }

  if (!(window as any).jspdf) {
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
    );
  }

  let tries = 0;
  while (
    (!(window as any).html2canvas || !(window as any).jspdf) &&
    tries < 25
  ) {
    await new Promise((r) => setTimeout(r, 100));
    tries++;
  }

  const html2canvasLib = (window as any).html2canvas;
  const jsPdfLib =
    (window as any).jspdf?.jsPDF || (window as any).jsPDF;

  if (!html2canvasLib || !jsPdfLib) {
    throw new Error("PDF generation libraries could not be loaded");
  }

  return { html2canvasLib, jsPdfLib };
}

function fmtCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "USD").toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function fmtDate(dateInput: any): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Data Types ───────────────────────────────────────────────────────────────

export interface CalcInvoiceLineItem {
  description: string;
  details?: string;
  qty: number;
  unitPrice: number;
  amount: number;
  isAddOn?: boolean;
}

export interface CalcInvoicePayment {
  reference: string;
  description: string;
  amount: number;
  date: string;
  status: string;
}

export interface CalcInvoiceData {
  invoiceNumber: string;
  rawInvoiceNumber: string;
  projectNumber: string;
  date: string;
  status: string;
  clientName: string;
  companyName: string;
  clientEmail: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  clientZip?: string;
  clientCountry?: string;
  title: string;
  duration?: string;
  lineItems: CalcInvoiceLineItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  amountPaid: number;
  pendingBalance: number;
  currency: string;
  paymentMethod?: string;
  payments: CalcInvoicePayment[];
  isMarketing?: boolean;
}

// ─── Data Extraction ──────────────────────────────────────────────────────────

export function extractCalcInvoiceData(data: any): CalcInvoiceData {
  const project = data.project || data;
  const quote =
    data.quote ||
    (typeof project.quoteId === "object" ? project.quoteId : null) ||
    project.quote ||
    {};
  const specs =
    project.calculatorSpecs ||
    quote?.requirements ||
    project.requirements ||
    {};
  const currentUser = authService.getUser() || ({} as any);
  const clientObj = project?.client || quote?.client || currentUser;

  // Project Number (Format: SOC-YYYY-XXXX)
  const rawProjectNum =
    data.projectNumber ||
    project.projectNumber ||
    (quote.quoteNumber && !String(quote.quoteNumber).startsWith("INV-") ? quote.quoteNumber : "") ||
    (project.quoteNumber && !String(project.quoteNumber).startsWith("INV-") ? project.quoteNumber : "") ||
    (project._id ? `SOC-2026-${project._id.slice(-4).toUpperCase()}` : "SOC-2026-001");

  const cleanProjectNum = String(rawProjectNum)
    .replace(/^Project\s*#?/i, "")
    .replace(/^#/, "");
  const projectNumber = cleanProjectNum.toUpperCase().startsWith("SOC-")
    ? cleanProjectNum.toUpperCase()
    : `SOC-2026-${cleanProjectNum.replace(/^INV-2026-/i, "").replace(/^INV-/i, "")}`;

  // Invoice Number (Format: #INV-YYYY-XXXXX)
  let rawInvoiceNum =
    data.invoiceNumber ||
    project.invoiceNumber ||
    (Array.isArray(data.payments) && data.payments[0]?.invoiceNumber ? data.payments[0].invoiceNumber : "") ||
    (project._id ? `INV-2026-${project._id.slice(-4).toUpperCase()}` : "INV-2026-00021");

  // Ensure invoiceNumber has distinct INV- format and does not mimic projectNumber
  if (String(rawInvoiceNum).toUpperCase().startsWith("SOC-") || String(rawInvoiceNum).toUpperCase().startsWith("PRJ-")) {
    rawInvoiceNum = project._id
      ? `INV-2026-${project._id.slice(-4).toUpperCase()}`
      : `INV-2026-${cleanProjectNum.replace(/^SOC-2026-/i, "").replace(/^SOC-/i, "")}`;
  }

  const cleanInvoiceNum = String(rawInvoiceNum)
    .replace(/^Project\s*#?/i, "")
    .replace(/^#/, "");
  const invoiceNumber = cleanInvoiceNum.toUpperCase().startsWith("INV-")
    ? `#${cleanInvoiceNum.toUpperCase()}`
    : `#INV-${cleanInvoiceNum.toUpperCase()}`;

  // Date
  const rawDate =
    data.date || data.paymentDate || project.createdAt || quote.createdAt || new Date();
  const date = fmtDate(rawDate);

  // Client
  const clientName =
    data.clientName ||
    clientObj.fullName ||
    (clientObj.firstName
      ? `${clientObj.firstName} ${clientObj.lastName || ""}`.trim()
      : "") ||
    specs.businessInfo?.name ||
    currentUser.fullName ||
    "Sourav Singh";

  const companyName =
    data.companyName ||
    clientObj.companyName ||
    clientObj.company ||
    specs.businessInfo?.companyName ||
    "";

  const clientEmail =
    data.clientEmail ||
    clientObj.email ||
    project.clientEmail ||
    currentUser.email ||
    "";

  const clientAddress =
    data.clientAddress ||
    clientObj.billingStreetAddress ||
    clientObj.streetAddress ||
    clientObj.address ||
    "";
  const clientCity =
    data.clientCity || clientObj.billingCity || clientObj.city || "";
  const clientState =
    data.clientState || clientObj.billingState || clientObj.state || "";
  const clientZip =
    data.clientZip || clientObj.billingZipCode || clientObj.zipCode || "";
  const clientCountry =
    data.clientCountry || clientObj.billingCountry || clientObj.country || "United States";

  // Category & Marketing Check
  const categoryKey = (
    data.categoryKey ||
    project.categoryKey ||
    specs.categoryKey ||
    ""
  ).toLowerCase();

  const isMarketing =
    categoryKey === "marketing" ||
    /market|campaign/i.test(data.title || "") ||
    /market|campaign/i.test(project.title || "") ||
    /market|campaign/i.test(data.categoryName || "") ||
    /market|campaign/i.test(project.categoryName || "") ||
    /market|campaign/i.test(specs.categoryName || "");

  // Title / Duration
  const title =
    data.title ||
    project.title ||
    specs.categoryName ||
    (isMarketing ? "A Marketing Campaign" : "Wordpress Website Development Tasks");

  let duration =
    data.duration ||
    data.timeline ||
    specs.estimatedTimeline ||
    (project.timelineInDays ? `${project.timelineInDays} Days` : "") ||
    project.timeline ||
    "";

  if (!duration && isMarketing) {
    duration = "Monthly Service";
  }

  // Line items
  let lineItems: CalcInvoiceLineItem[] = [];
  if (Array.isArray(data.deliverableItems) && data.deliverableItems.length > 0) {
    lineItems = data.deliverableItems.map((item: any) => {
      const amt = Number(item.amount ?? 0);
      const qty = Number(item.quantity ?? 1) || 1;
      return {
        description: item.description || item.title || item.name || (isMarketing ? "Marketing campaign deliverable" : "Website development deliverable"),
        details: item.details || "",
        qty,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : amt / qty,
        amount: amt,
        isAddOn: Boolean(item.isAddOn),
      };
    });
  } else if (
    Array.isArray(project.deliverableItems) &&
    project.deliverableItems.length > 0
  ) {
    lineItems = project.deliverableItems.map((item: any) => {
      const amt = Number(item.amount ?? 0);
      const qty = Number(item.quantity ?? 1) || 1;
      return {
        description: item.description || item.title || item.name || (isMarketing ? "Marketing campaign deliverable" : "Website development deliverable"),
        details: item.details || "",
        qty,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : amt / qty,
        amount: amt,
        isAddOn: Boolean(item.isAddOn),
      };
    });
  } else {
    const rawCost = Number(
      data.subtotal ??
        project.subtotal ??
        project.price ??
        project.totalCost ??
        0
    );
    lineItems = [
      {
        description: title,
        details: duration ? (isMarketing ? "Monthly service" : `Estimated delivery: ${duration}`) : undefined,
        qty: 1,
        unitPrice: rawCost,
        amount: rawCost,
      },
    ];
  }

  // Financials
  const isEstoniaClient = (c?: string) => {
    if (!c) return false;
    const upper = c.trim().toUpperCase();
    return upper === "EE" || upper === "EST" || upper === "ESTONIA";
  };
  const explicitVatRate = Number(
    data.vatRate ??
      project.vatRate ??
      data.vatPercentage ??
      project.vatPercentage ??
      (data.taxPercentage != null ? data.taxPercentage : (project.taxPercentage != null ? project.taxPercentage : 0))
  ) || 0;

  let loggedUserCountry = "";
  try {
    const user = authService.getUser();
    loggedUserCountry = user?.country || user?.clientCountry || user?.billingCountry || "";
  } catch {}

  const countryStr = String(
    data.clientCountry ||
      project.clientCountry ||
      project.country ||
      project.client?.country ||
      project.client?.clientCountry ||
      loggedUserCountry ||
      ""
  );
  // VAT applies for explicit vatRate or Estonian clients (24%)
  const vatRate = explicitVatRate > 0 ? explicitVatRate : getVatRateForCountry(countryStr);

  const subtotal = Number(
    data.subtotal ??
      project.subtotal ??
      lineItems.reduce((s: number, i: CalcInvoiceLineItem) => s + (i.amount || 0), 0)
  );

  const vatAmount = Number(
    data.vatAmount ??
      project.vatAmount ??
      (vatRate > 0
        ? Math.round(((subtotal * vatRate) / 100) * 100) / 100
        : 0)
  );

  const totalAmount = Number(
    data.totalAmount ??
      data.totalPrice ??
      project.totalCost ??
      project.price ??
      subtotal + vatAmount
  );

  // Transactions / Payments
  const rawPayments = Array.isArray(data.payments)
    ? data.payments
    : Array.isArray(project.payments)
    ? project.payments
    : [];

  const successfulPayments = rawPayments.filter((p: any) =>
    ["succeeded", "paid", "completed"].includes(p.status?.toLowerCase())
  );

  const txPaid = successfulPayments.reduce(
    (sum: number, p: any) => sum + (Number(p.amount) || 0),
    0
  );

  const amountPaid = Number(
    data.amountPaid !== undefined
      ? data.amountPaid
      : project.amountPaid !== undefined
      ? project.amountPaid
      : txPaid > 0
      ? txPaid
      : (data.paymentStatus === "paid" || data.status === "PAID" ? totalAmount : 0)
  );

  const pendingBalance = Number(
    data.pendingBalance !== undefined
      ? data.pendingBalance
      : project.amountDue !== undefined && !isNaN(Number(project.amountDue))
      ? Number(project.amountDue)
      : Math.max(0, totalAmount - amountPaid)
  );

  // Status resolution matching payments tab logic
  let status = "PAID";
  if (pendingBalance > 0.01 && amountPaid > 0.01) {
    status = "PARTIALLY PAID";
  } else if (totalAmount > 0 && amountPaid >= totalAmount - 0.01) {
    status = "PAID";
  } else if (amountPaid <= 0.01) {
    status = "PENDING";
  } else if (data.status && typeof data.status === "string") {
    status = data.status.toUpperCase().replace(/_/g, " ");
  } else {
    const rawSt = String(data.paymentStatus || project.paymentStatus || project.status || "PAID").toUpperCase();
    if (rawSt.includes("PARTIAL")) status = "PARTIALLY PAID";
    else if (rawSt.includes("PENDING")) status = "PENDING";
    else if (rawSt.includes("UNPAID")) status = "UNPAID";
    else status = "PAID";
  }

  const payments: CalcInvoicePayment[] = rawPayments.map((p: any) => ({
    reference:
      p.transactionNumber ||
      p.paymentIntentId?.slice(-8).toUpperCase() ||
      (p._id || p.id ? String(p._id || p.id).slice(-8).toUpperCase() : "TX-101"),
    description: p.description || "Project Payment",
    amount: Number(p.amount || 0),
    date: fmtDate(p.createdAt || p.date || new Date()),
    status: (p.status || "succeeded").toUpperCase(),
  }));

  const currency = (
    data.currency ||
    project.currency ||
    quote.currency ||
    "USD"
  ).toUpperCase();

  return {
    invoiceNumber,
    rawInvoiceNumber: cleanInvoiceNum,
    projectNumber,
    date,
    status,
    clientName,
    companyName,
    clientEmail,
    clientAddress,
    clientCity,
    clientState,
    clientZip,
    clientCountry,
    title,
    duration,
    lineItems,
    subtotal,
    vatRate,
    vatAmount,
    totalAmount,
    amountPaid,
    pendingBalance,
    currency,
    paymentMethod: data.paymentMethod || "Credit / Debit Card",
    payments,
    isMarketing,
  };
}

// ─── Society Web Solutions Logo SVG (Matching Calculator PDF) ─────────────────

const LOGO_SVG = `<img width="158" height="50" src="/images/logo.svg" style="display: block;" alt="Society Logo" />`;

function estimateInvoiceLineItemHeight(item: CalcInvoiceLineItem): number {
  const title = (item.description || "").trim();
  const details = (item.details || "").trim();
  const titleLines = Math.max(1, Math.ceil(title.length / 45));
  const detailLines = details ? Math.max(1, Math.ceil(details.length / 55)) : 0;
  return 28 + titleLines * 16 + detailLines * 14;
}

interface InvoicePageItem {
  pageItems: CalcInvoiceLineItem[];
  hasSummaryCard: boolean;
}

function paginateCalculatorInvoice(
  items: CalcInvoiceLineItem[],
  d: CalcInvoiceData
): InvoicePageItem[] {
  if (!items || items.length === 0) {
    return [{ pageItems: [], hasSummaryCard: true }];
  }

  const heights = items.map(estimateInvoiceLineItemHeight);
  const totalItemsHeight = heights.reduce((sum, h) => sum + h, 0);

  const hasVat = d.vatRate > 0 && d.vatAmount > 0;
  const hasPartialPayment =
    typeof d.pendingBalance === "number" &&
    d.pendingBalance > 0.009 &&
    typeof d.amountPaid === "number" &&
    d.amountPaid > 0.009;

  let summaryCardHeight = 110;
  if (d.duration) summaryCardHeight += 44;
  if (hasVat) summaryCardHeight += 44;
  if (hasPartialPayment) summaryCardHeight += 88;

  const footerHeight = 100;
  const page1MaxContent = 680;
  const subsequentMaxContent = 880;

  const page1MaxWithSummaryAndFooter = Math.max(180, page1MaxContent - summaryCardHeight - footerHeight);
  const page1MaxWithSummaryOnly = Math.max(180, page1MaxContent - summaryCardHeight);
  const page1MaxItemsOnly = page1MaxContent;

  const subsequentMaxWithSummaryAndFooter = Math.max(260, subsequentMaxContent - summaryCardHeight - footerHeight);
  const subsequentMaxWithSummaryOnly = Math.max(260, subsequentMaxContent - summaryCardHeight);
  const subsequentMaxItemsOnly = subsequentMaxContent;

  // Case 1: Everything fits on Page 1 (items + summary + footer) -> 1 Page PDF
  if (totalItemsHeight <= page1MaxWithSummaryAndFooter) {
    return [{ pageItems: items, hasSummaryCard: true }];
  }

  // Case 2: Items + Summary Card fit on Page 1, but footer does NOT fit on Page 1.
  // Keep Items + Summary Card on Page 1, and Page 2 contains ONLY the footer!
  if (totalItemsHeight <= page1MaxWithSummaryOnly) {
    return [
      { pageItems: items, hasSummaryCard: true },
      { pageItems: [], hasSummaryCard: false },
    ];
  }

  // Case 3: Items fit on Page 1, but adding Summary Card overflows Page 1.
  // Page 1 has Items only, Page 2 has Summary Card + Footer.
  if (totalItemsHeight <= page1MaxItemsOnly) {
    return [
      { pageItems: items, hasSummaryCard: false },
      { pageItems: [], hasSummaryCard: true },
    ];
  }

  // Case 4: Items exceed Page 1 capacity.
  // Distribute items across pages.
  const pages: InvoicePageItem[] = [];
  let currentItems: CalcInvoiceLineItem[] = [];
  let currentHeight = 0;
  let isPage1 = true;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const h = heights[i];
    const capacity = isPage1 ? page1MaxItemsOnly : subsequentMaxItemsOnly;

    if (currentItems.length > 0 && currentHeight + h > capacity) {
      pages.push({ pageItems: currentItems, hasSummaryCard: false });
      currentItems = [item];
      currentHeight = h;
      isPage1 = false;
    } else {
      currentItems.push(item);
      currentHeight += h;
    }
  }

  const isSinglePageOfItems = pages.length === 0;
  const maxWithSummaryAndFooter = isSinglePageOfItems
    ? page1MaxWithSummaryAndFooter
    : subsequentMaxWithSummaryAndFooter;
  const maxWithSummaryOnly = isSinglePageOfItems
    ? page1MaxWithSummaryOnly
    : subsequentMaxWithSummaryOnly;

  if (currentHeight <= maxWithSummaryAndFooter) {
    pages.push({ pageItems: currentItems, hasSummaryCard: true });
  } else if (currentHeight <= maxWithSummaryOnly) {
    // Items + Summary fit on this page, but footer needs its own page
    pages.push({ pageItems: currentItems, hasSummaryCard: true });
    pages.push({ pageItems: [], hasSummaryCard: false });
  } else {
    // Summary doesn't fit on this page, push Summary + Footer to next page
    pages.push({ pageItems: currentItems, hasSummaryCard: false });
    pages.push({ pageItems: [], hasSummaryCard: true });
  }

  return pages;
}

function renderInvoiceSummaryCard(d: CalcInvoiceData): string {
  const hasVat = d.vatRate > 0 && d.vatAmount > 0;
  const hasPartialPayment =
    typeof d.pendingBalance === "number" &&
    d.pendingBalance > 0.009 &&
    typeof d.amountPaid === "number" &&
    d.amountPaid > 0.009;

  return `
    <div class="invoice-summary-container" style="display: flex; justify-content: flex-end; margin-top: 24px; margin-bottom: 20px; width: 100%;">
      <div class="invoice-summary-card" style="width: 380px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06); border: 1px solid #1E293B; background-color: #0B1220;">
        ${
          d.duration
            ? `
        <div class="summary-row" style="background-color: #0B1220; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 44px;">
          <span class="summary-label" style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">ESTIMATED TIMELINE</span>
          <span class="summary-value" style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 14.5px; color: #FFFFFF; white-space: nowrap;">${d.duration}</span>
        </div>
            `
            : ""
        }
        <div class="summary-row" style="background-color: #0B1220; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 44px; ${d.duration ? "border-top: 1px solid #1E293B;" : ""}">
          <span class="summary-label" style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">SUBTOTAL</span>
          <span class="summary-value" style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 14.5px; color: #FFFFFF; white-space: nowrap;">${fmtCurrency(d.subtotal, d.currency)}</span>
        </div>

        ${
          hasVat && d.vatRate > 0
            ? `
        <div class="summary-row" style="background-color: #0B1220; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 44px; border-top: 1px solid #1E293B;">
          <span class="summary-label" style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">VAT (${d.vatRate}%)</span>
          <span class="summary-value" style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 14.5px; color: #FFFFFF; white-space: nowrap;">${fmtCurrency(d.vatAmount, d.currency)}</span>
        </div>
            `
            : ""
        }
        ${
          hasPartialPayment
            ? `
        <div class="summary-row" style="background-color: #0B1220; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 44px; border-top: 1px solid #1E293B;">
          <span class="summary-label" style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">PAID TO DATE</span>
          <span class="summary-value" style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 14.5px; color: #FFFFFF; white-space: nowrap;">${fmtCurrency(d.amountPaid, d.currency)}</span>
        </div>
        <div class="summary-row" style="background-color: #0B1220; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 44px; border-top: 1px solid #1E293B;">
          <span class="summary-label" style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">BALANCE DUE</span>
          <span class="summary-value" style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 14.5px; color: #FFFFFF; white-space: nowrap;">${fmtCurrency(d.pendingBalance, d.currency)}</span>
        </div>
            `
            : ""
        }

        <!-- Total Amount Row -->
        <div class="summary-total-banner" style="background-color: #2A2AA0; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 62px; border-top: 1px solid #3E3EE8;">
          <span class="summary-total-label" style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 12px; letter-spacing: 0.06em; color: #FFFFFF; text-transform: uppercase; white-space: nowrap;">TOTAL AMOUNT</span>
          <span class="summary-total-value" style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 21px; color: #FFFFFF; white-space: nowrap; margin-left: 16px;">${fmtCurrency(d.totalAmount, d.currency)}${d.isMarketing ? " /month" : ""}</span>
        </div>
      </div>
    </div>
  `;
}

function renderInvoiceFooterOnly(): string {
  return `
    <footer class="invoice-footer" style="width: 100%; margin-top: auto; padding-top: 18px; border-top: 1.5px solid #D9D9D9; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 3px;">
      <div class="invoice-footer-brand" style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.14em; color: #CBD5E1; text-transform: uppercase; margin-bottom: 6px;">SOCIETY WEB SOLUTIONS</div>
      <div class="invoice-footer-address" style="font-family: 'Inter', sans-serif; font-weight: 400; font-size: 10px; line-height: 1.4; color: #879095;">1645 Palm Beach Lakes Blvd, West Palm Beach, FL, USA</div>
      <div class="invoice-footer-contact" style="font-family: 'Inter', sans-serif; font-weight: 400; font-size: 10px; line-height: 1.4; color: #879095;">
        For inquiries, please reach out to <a href="mailto:contact@societywebsolutions.com" style="color: #879095; text-decoration: none; font-weight: 600;">contact@societywebsolutions.com</a>
      </div>
    </footer>
  `;
}

// ─── HTML Template matching invoice.html with Calculator PDF Typography & Palette ─

export function getCalculatorInvoiceHTML(d: CalcInvoiceData): string {
  // Contact address lines
  const addrParts = [
    d.clientAddress,
    [d.clientCity, d.clientState].filter(Boolean).join(", "),
    d.clientZip,
  ].filter(Boolean);
  const contactLine1 = addrParts.join(", ");
  const contactCountry = d.clientCountry || "United States";

  const pages = paginateCalculatorInvoice(d.lineItems || [], d);
  const totalPages = pages.length;

  return pages
    .map((pageData, index) => {
      const pageNum = index + 1;
      const isFirstPage = pageNum === 1;
      const isLastPage = pageNum === totalPages;
      const pageItems = pageData.pageItems;
      const hasSummary = pageData.hasSummaryCard;

      const tableRows = pageItems
        .map(
          (item) => `
          <tr>
            <td class="col-desc">
              <div class="item-title">${item.description}</div>
              ${item.details ? `<div class="item-details">${item.details}</div>` : ""}
            </td>
            <td class="col-qty">${item.qty || 1}</td>
            <td class="col-unit-price">${fmtCurrency(item.unitPrice, d.currency)}</td>
            <td class="col-amount">${fmtCurrency(item.amount, d.currency)}</td>
          </tr>
        `
        )
        .join("");

      return `
    <div class="pdf-page invoice-page" style="
      width: 794px;
      height: 1123px;
      min-height: 1123px;
      max-height: 1123px;
      box-sizing: border-box;
      background-color: #FFFFFF;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #202124;
      padding: 56px 64px 44px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      page-break-after: ${isLastPage ? "auto" : "always"};
      break-after: ${isLastPage ? "auto" : "page"};
    ">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .proposal-header.invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 20px;
          border-bottom: 1.5px solid #D9D9D9;
        }

        .header-logo {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding-top: 10px;
        }

        .invoice-header-details {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          text-align: right;
          white-space: nowrap;
        }

        .proposal-title.invoice-title {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 22px;
          line-height: 1;
          letter-spacing: -0.01em;
          color: #2A2AA0;
          margin: 0 0 10px 0;
          text-transform: uppercase;
        }

        .company-name {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 13.5px;
          line-height: 1.3;
          color: #1E293B;
          margin-bottom: 3px;
        }

        .company-address {
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 12px;
          line-height: 1.45;
          color: #64748B;
          margin-bottom: 2px;
        }

        .company-email {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 12px;
          line-height: 1.45;
          color: #2A2AA0;
        }

        .invoice-info-section {
          box-sizing: border-box;
          width: 100%;
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 16px 20px;
          margin: 20px 0 20px 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .invoice-bill-to {
          display: flex;
          flex-direction: column;
          width: calc(52% - 15px);
        }

        .info-group-contact {
          margin-top: 14px;
        }

        .invoice-section-heading {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 11px;
          line-height: 1.2;
          letter-spacing: 0.08em;
          color: #2A2AA0;
          text-transform: uppercase;
          margin: 0 0 8px 0;
        }

        .bill-to-name {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 14.5px;
          line-height: 1.3;
          color: #0F172A;
          margin-bottom: 3px;
        }

        .bill-to-company {
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 12px;
          line-height: 1.35;
          color: #475569;
          margin-bottom: 3px;
        }

        .contact-address-line-wrap {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .contact-address-line {
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 12px;
          line-height: 1.4;
          color: #64748B;
        }

        .invoice-meta-details {
          display: flex;
          flex-direction: column;
          width: calc(44% - 15px);
        }

        .invoice-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 6px;
          font-size: 12px;
        }

        .invoice-meta-row:last-child {
          margin-bottom: 0;
        }

        .invoice-meta-label {
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 12px;
          line-height: 1.35;
          color: #64748B;
        }

        .invoice-meta-value {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 12px;
          line-height: 1.35;
          color: #0F172A;
          text-align: right;
        }

        .status-paid {
          font-weight: 700;
          color: #15803D;
        }

        .status-partial {
          font-weight: 700;
          color: #B45309;
        }

        .status-pending {
          font-weight: 700;
          color: #DC2626;
        }

        .deliverables-table-wrapper.invoice-table-wrapper {
          width: 100%;
          border: none;
          border-radius: 0px;
          overflow: hidden;
          background-color: #FFFFFF;
        }

        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0;
          text-align: left;
        }

        .invoice-table-wrapper thead th:first-child {
          border-top-left-radius: 6px;
          border-bottom-left-radius: 6px;
          padding-left: 18px;
        }

        .invoice-table-wrapper thead th:last-child {
          border-top-right-radius: 6px;
          border-bottom-right-radius: 6px;
          padding-right: 18px;
        }

        .invoice-table thead tr {
          background-color: #2A2AA0;
        }

        .invoice-table th {
          background-color: #2A2AA0 !important;
          color: #FFFFFF !important;
          padding: 14px 14px;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 11px;
          line-height: 1.2;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .invoice-table th.col-desc,
        .invoice-table th.col-qty,
        .invoice-table th.col-unit-price,
        .invoice-table th.col-amount {
          color: #FFFFFF !important;
          background-color: #2A2AA0 !important;
        }

        .invoice-table td {
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 12px;
          line-height: 1.4;
          color: #202124;
          padding: 12px 14px;
          border-bottom: 1px solid #E2E8F0;
        }

        .invoice-table th:first-child,
        .invoice-table td:first-child {
          padding-left: 18px;
        }

        .invoice-table th:last-child,
        .invoice-table td:last-child {
          padding-right: 18px;
        }

        .invoice-table .col-desc {
          text-align: left;
          width: 48%;
        }

        .item-title {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          color: #0F172A;
          font-size: 12.5px;
        }

        .item-details {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          color: #64748B;
          font-weight: 400;
          line-height: 1.4;
          margin-top: 2px;
        }

        .invoice-table .col-qty {
          text-align: center;
          width: 14%;
        }

        .invoice-table td.col-qty {
          color: #475569;
        }

        .invoice-table .col-unit-price {
          text-align: right;
          width: 19%;
        }

        .invoice-table td.col-unit-price {
          font-weight: 600;
          color: #0F172A;
        }

        .invoice-table .col-amount {
          text-align: right;
          width: 19%;
        }

        .invoice-table td.col-amount {
          font-weight: 700;
          color: #0F172A;
        }
      </style>

      <div style="width: 100%; display: flex; flex-direction: column; flex: 1;">
        ${
          isFirstPage
            ? `
        <header class="proposal-header invoice-header">
          <div class="header-logo">
            ${LOGO_SVG}
          </div>

          <div class="header-details invoice-header-details">
            <div class="proposal-title invoice-title">INVOICE</div>
            <div class="company-name">Society Web Solutions</div>
            <div class="company-address">1645 Palm Beach Lakes Blvd</div>
            <div class="company-address">West Palm Beach, FL, US</div>
            <div class="company-email">contact@societywebsolutions.com</div>
          </div>
        </header>

        <section class="invoice-info-section">
          <div class="invoice-bill-to">
            <div class="info-group">
              <h2 class="invoice-section-heading">BILL TO</h2>
              <div class="bill-to-name">${d.clientName}</div>
              ${d.companyName ? `<div class="bill-to-company">${d.companyName}</div>` : ""}
            </div>

            <div class="info-group info-group-contact">
              <h2 class="invoice-section-heading">CONTACT INFO</h2>
              <div class="contact-address-line-wrap">
                ${contactLine1 ? `<div class="contact-address-line">${contactLine1}</div>` : ""}
                ${contactCountry ? `<div class="contact-address-line address-line-country">${contactCountry}</div>` : ""}
                ${d.clientEmail ? `<div class="contact-address-line">${d.clientEmail}</div>` : ""}
              </div>
            </div>
          </div>

          <div class="invoice-meta-details">
            <h2 class="invoice-section-heading">INVOICE DETAILS</h2>
            <div class="invoice-meta-row">
              <span class="invoice-meta-label">Invoice No:</span>
              <span class="invoice-meta-value">${d.invoiceNumber}</span>
            </div>
            <div class="invoice-meta-row">
              <span class="invoice-meta-label">Date:</span>
              <span class="invoice-meta-value">${d.date}</span>
            </div>
            <div class="invoice-meta-row">
              <span class="invoice-meta-label">Status:</span>
              <span class="invoice-meta-value ${
                d.status === "PAID"
                  ? "status-paid"
                  : d.status === "PARTIALLY PAID"
                  ? "status-partial"
                  : "status-pending"
              }">${d.status}</span>
            </div>
          </div>
        </section>
        `
            : `
        <!-- Subsequent page header -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; margin-bottom: 16px; border-bottom: 1.5px solid #E2E8F0;">
          <div style="font-size: 11px; font-weight: 700; color: #2A2AA0; letter-spacing: 0.08em; text-transform: uppercase;">
            INVOICE ${d.invoiceNumber} (Page ${pageNum} of ${totalPages})
          </div>
          <div style="font-size: 11px; font-weight: 600; color: #64748B;">
            ${d.clientName}
          </div>
        </div>
        `
        }

        ${
          pageItems.length > 0
            ? `
        <section class="invoice-table-section">
          <div class="deliverables-table-wrapper invoice-table-wrapper">
            <table class="deliverables-table invoice-table">
              <thead>
                <tr style="background-color: #2A2AA0;">
                  <th class="col-desc" style="background-color: #2A2AA0; color: #FFFFFF !important; padding: 14px 14px 14px 18px;">DELIVERABLES &amp; WORK SCOPE</th>
                  <th class="col-qty" style="background-color: #2A2AA0; color: #FFFFFF !important; padding: 14px 14px; text-align: center;">QTY</th>
                  <th class="col-unit-price" style="background-color: #2A2AA0; color: #FFFFFF !important; padding: 14px 14px; text-align: right;">UNIT PRICE</th>
                  <th class="col-amount" style="background-color: #2A2AA0; color: #FFFFFF !important; padding: 14px 18px 14px 14px; text-align: right;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </section>
        `
            : ""
        }

        ${hasSummary ? renderInvoiceSummaryCard(d) : ""}
      </div>

      ${isLastPage ? renderInvoiceFooterOnly() : ""}
    </div>
    `;
    })
    .join("\n");
}

// ─── Download PDF ─────────────────────────────────────────────────────────────

export async function downloadCalculatorInvoicePDF(data: any): Promise<void> {
  if (typeof window === "undefined") return;

  const d = extractCalcInvoiceData(data);
  const { html2canvasLib, jsPdfLib } = await ensurePdfLibraries();

  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-9999px;top:0;width:794px;background:#ffffff;z-index:-99999;opacity:1;pointer-events:none;";
  container.innerHTML = getCalculatorInvoiceHTML(d);
  document.body.appendChild(container);

  try {
    await new Promise((r) => setTimeout(r, 150));

    const pageElements = container.querySelectorAll(".pdf-page");
    const pdf = new jsPdfLib("p", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i] as HTMLElement;
      const captureHeight = pageEl.scrollHeight || 1123;
      const canvas = await html2canvasLib(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794,
        windowWidth: 794,
        height: captureHeight,
        windowHeight: captureHeight,
        scrollY: 0,
        scrollX: 0,
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) continue;

      if (i > 0) {
        pdf.addPage();
      }

      const imgData = canvas.toDataURL("image/jpeg", 0.94);
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
    }

    const ref = d.rawInvoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "") || "invoice";
    pdf.save(`Invoice_${ref}.pdf`);
  } finally {
    if (document.body.contains(container)) document.body.removeChild(container);
  }
}

// ─── Print (fallback) ─────────────────────────────────────────────────────────

export function printCalculatorInvoicePDF(data: any): void {
  if (typeof window === "undefined") return;

  const d = extractCalcInvoiceData(data);
  const doc = `<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>Invoice - ${d.invoiceNumber}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
    <style>
      @page {
        size: A4 portrait;
        margin: 0;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }
    </style>
  </head><body>${getCalculatorInvoiceHTML(d)}</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  if (!win) return;
  win.document.open();
  win.document.write(doc);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 2000);
  }, 500);
}
