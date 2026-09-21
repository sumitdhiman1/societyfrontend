import { authService } from "./authService";
import { getVatRateForCountry } from "./vatHelper";
import {
  convertCurrencyAmount,
  formatPriceWithCurrency,
  formatActiveCurrency,
} from "./currencyUtils";

function formatSubmittedDate(dateInput: any): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function formatDurationLabel(raw: any): string {
  if (!raw) return "-";
  const str = String(raw).trim();
  if (str === "" || str === "-") return "-";
  return str
    .replace(/\bWeeks\b/g, "weeks")
    .replace(/\bWeek\b/g, "week")
    .replace(/\bDays\b/g, "days")
    .replace(/\bDay\b/g, "day")
    .replace(/\bMonths\b/g, "months")
    .replace(/\bMonth\b/g, "month");
}

export interface BundlePDFData {
  title: string;
  projectNumber: string;
  referenceNumber: string;
  rawProjectNumber: string;
  clientEmail: string;
  clientName: string;
  clientCompany?: string;
  clientCountry?: string;
  status: string;
  submittedDate: string;
  deadlineDate: string;
  validUntilDate: string;
  duration: string;
  totalPrice: number;
  currency: string;
  formattedPrice: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  formattedSubtotal: string;
  formattedVatAmount: string;
  amountPaid: number;
  pendingBalance: number;
  formattedAmountPaid: string;
  formattedPendingBalance: string;
  description: string;
  deliverables: Array<{ name: string; details?: string; duration: string; amount: number; formattedAmount: string }>;
  recurringDeliverables?: Array<{ name: string; details?: string; duration: string; amount: number; formattedAmount: string }>;
  recurringAmount?: number;
  formattedRecurringAmount?: string;
  isProject?: boolean;
}

export function extractBundlePDFData(data: any): BundlePDFData {
  const currentUser = authService.getUser();
  const clientEmail =
    data.clientEmail ||
    data.client?.email ||
    data.email ||
    data.user?.email ||
    currentUser?.email ||
    "contact@societywebsolutions.com";

  const clientName =
    data.clientName ||
    data.client?.fullName ||
    (data.client?.firstName
      ? `${data.client.firstName} ${data.client.lastName || ""}`.trim()
      : "") ||
    currentUser?.fullName ||
    (currentUser?.firstName
      ? `${currentUser.firstName} ${currentUser.lastName || ""}`.trim()
      : "") ||
    "Client";

  const clientCompany =
    data.clientCompany ||
    data.client?.companyName ||
    data.companyName ||
    currentUser?.companyName ||
    "";

  const clientCountry =
    data.clientCountry ||
    data.country ||
    data.client?.country ||
    currentUser?.country ||
    "";

  const title = String(
    data.projectTitle ||
    data.title ||
    data.name ||
    data.bundleName ||
    data.packageName ||
    "Local Business Growth Bundle"
  ).trim();

  const isProject = data.isProject !== false && Boolean(data.projectNumber || data._id || data.id);

  const rawProjectNumber = String(
    data.projectNumber ||
    data.referenceNumber ||
    data.refNumber ||
    data.refNo ||
    data.entityNumber ||
    data.orderNumber ||
    (data._id ? String(data._id).slice(-8).toUpperCase() : "SOC-BUNDLE")
  ).replace(/^#/, "").replace(/^INV-/i, "").replace(/^PROJECT-/i, "").trim();

  const projectNumber = rawProjectNumber.startsWith("#") ? rawProjectNumber : `#${rawProjectNumber}`;
  const referenceNumber = projectNumber;

  const submittedDate = formatSubmittedDate(data.createdAt || data.startDate || data.submittedDate || new Date());
  const validUntilDate = formatSubmittedDate(
    data.validUntil ||
    data.deadline ||
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );
  const deadlineDate = data.deadline ? formatSubmittedDate(data.deadline) : (data.duration || "Ongoing");

  const status = String(data.status || "active").replace(/_/g, " ").toUpperCase();

  // Currency & Conversion
  let activeContextCurrency = "";
  let activeContextRate: number | null = null;
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("app-currency");
      if (stored && stored.trim()) {
        activeContextCurrency = stored.trim().toUpperCase();
      }
      const savedRate = localStorage.getItem("app-conversion-rate");
      if (savedRate && !isNaN(Number(savedRate)) && Number(savedRate) > 0) {
        activeContextRate = Number(savedRate);
      }
    }
  } catch {}

  const sourceCurrency = (
    data.sourceCurrency ||
    data.currency ||
    data.quote?.currency ||
    (data.currencySymbol === "€" ? "EUR" : data.currencySymbol === "$" ? "USD" : "") ||
    "USD"
  ).toUpperCase();

  const targetCurrency = (
    data.targetCurrency ||
    activeContextCurrency ||
    data.activeCurrency ||
    data.selectedCurrency ||
    currentUser?.currency ||
    currentUser?.preferredCurrency ||
    sourceCurrency ||
    "USD"
  ).toUpperCase();

  const conversionRate = Number(
    data.conversionRate ||
    activeContextRate ||
    data.exchangeRate ||
    1.08
  );

  const convert = (amt: number): number => {
    if (!amt || !Number.isFinite(amt) || amt === 0) return 0;
    return convertCurrencyAmount(amt, targetCurrency, sourceCurrency, conversionRate);
  };

  const currency = targetCurrency;

  // Extract deliverables
  let rawItems: any[] = [];
  if (Array.isArray(data.deliverableItems) && data.deliverableItems.length > 0) {
    rawItems = data.deliverableItems;
  } else if (Array.isArray(data.deliverables) && data.deliverables.length > 0) {
    rawItems = data.deliverables;
  } else if (Array.isArray(data.lineItems) && data.lineItems.length > 0) {
    rawItems = data.lineItems;
  }

  const rawSubtotalInput = Number(
    data.subtotal ??
    data.baseAmount ??
    data.price ??
    data.totalCost ??
    0
  );

  const convertedBasePrice = convert(rawSubtotalInput);

  let deliverables: Array<{ name: string; details?: string; duration: string; amount: number; formattedAmount: string }> = [];

  if (rawItems.length > 0) {
    deliverables = rawItems.map((item: any) => {
      const itemAmt = Number(item.amount ?? item.cost ?? (rawItems.length === 1 ? rawSubtotalInput : 0));
      const convertedItemAmt = convert(itemAmt);
      return {
        name: item.description || item.title || item.name || "Initial Project Setup & Implementation",
        details: item.details || item.subtitle || "",
        duration: formatDurationLabel(item.duration || data.duration || data.totalDuration || "2 weeks"),
        amount: convertedItemAmt,
        formattedAmount: formatActiveCurrency(convertedItemAmt, currency),
      };
    });
  } else {
    deliverables = [
      {
        name: "Initial Project Setup & Implementation",
        details: data.description || "Bundle Setup Phase",
        duration: formatDurationLabel(data.duration || data.totalDuration || "2 weeks"),
        amount: convertedBasePrice,
        formattedAmount: formatActiveCurrency(convertedBasePrice, currency),
      },
    ];
  }

  // Duration
  let duration = formatDurationLabel(data.totalDuration || data.duration || deliverables[0]?.duration || "2 weeks");

  // VAT calculations
  const isEstonia = ["ee", "est", "estonia"].includes(String(clientCountry).toLowerCase().trim());
  const vatRate = Number(data.vatRate !== undefined ? data.vatRate : (isEstonia ? 24 : 0));

  const itemsSum = deliverables.reduce((s, it) => s + (it.amount || 0), 0);
  const subtotal = itemsSum > 0 ? itemsSum : convertedBasePrice;

  const vatAmount = vatRate > 0
    ? Number(data.vatAmount !== undefined && !isNaN(Number(data.vatAmount)) ? convert(Number(data.vatAmount)) : Math.round(subtotal * (vatRate / 100) * 100) / 100)
    : 0;

  const totalPrice = Math.round((subtotal + vatAmount) * 100) / 100;
  const amountPaid = convert(Number(data.amountPaid || 0));
  const pendingBalance = Math.max(0, Math.round((totalPrice - amountPaid) * 100) / 100);

  const formattedPrice = formatActiveCurrency(totalPrice, currency);
  const formattedSubtotal = formatActiveCurrency(subtotal, currency);
  const formattedVatAmount = formatActiveCurrency(vatAmount, currency);
  const formattedAmountPaid = formatActiveCurrency(amountPaid, currency);
  const formattedPendingBalance = formatActiveCurrency(pendingBalance, currency);

  const description = String(data.description || data.projectDescription || "").trim();

  // Recurring Phase (if monthly maintenance component exists)
  let recurringDeliverables: Array<{ name: string; details?: string; duration: string; amount: number; formattedAmount: string }> | undefined = undefined;
  let recurringAmount: number | undefined = undefined;
  let formattedRecurringAmount: string | undefined = undefined;

  const rawRec = Number(data.recurringAmount || data.recurringPrice || 0);
  if (rawRec > 0) {
    recurringAmount = convert(rawRec);
    formattedRecurringAmount = `${formatActiveCurrency(recurringAmount, currency)} / month`;
    recurringDeliverables = [
      {
        name: "Monthly Maintenance & Optimization",
        details: data.recurringLineItems || "Ongoing hosting, security updates, and dedicated support",
        duration: "Monthly",
        amount: recurringAmount,
        formattedAmount: formatActiveCurrency(recurringAmount, currency),
      },
    ];
  }

  return {
    title,
    projectNumber,
    referenceNumber,
    rawProjectNumber,
    clientEmail,
    clientName,
    clientCompany,
    clientCountry,
    status,
    submittedDate,
    deadlineDate,
    validUntilDate,
    duration,
    totalPrice,
    currency,
    formattedPrice,
    subtotal,
    vatRate,
    vatAmount,
    formattedSubtotal,
    formattedVatAmount,
    amountPaid,
    pendingBalance,
    formattedAmountPaid,
    formattedPendingBalance,
    description,
    deliverables,
    recurringDeliverables,
    recurringAmount,
    formattedRecurringAmount,
    isProject,
  };
}

const LOGO_SVG = `<img width="158" height="50" src="/images/logo.svg" style="display: block;" alt="Society Logo" />`;

export function getBundleHTML(d: BundlePDFData): string {
  const cleanTitle = d.title.replace(/^Bundle Title:\s*/i, "").replace(/^Project Title:\s*/i, "");

  return `
    <div class="pdf-page" style="
      width: 794px;
      min-height: 1123px;
      box-sizing: border-box;
      background-color: #FFFFFF;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #202124;
      padding: 64px 78px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      margin: 0 auto;
    ">
      
      <div style="width: 100%; display: flex; flex-direction: column; flex: 1;">
        <!-- ── Main Header ── -->
        <header style="width: 100%; display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; margin: 0; padding: 0; box-sizing: border-box;">
          <div class="header-logo" style="display: flex; flex-direction: column; align-items: flex-start; margin: 0; padding-top: 10px;">
            ${LOGO_SVG}
          </div>
          <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; margin: 0; padding: 0; white-space: nowrap;">
            <div style="font-family: Inter, sans-serif; font-weight: 700; font-size: 22px; letter-spacing: -0.01em; color: #2A2AA0; margin: 0 0 10px 0; line-height: 1; padding: 0;">${d.isProject ? "PROJECT DETAILS" : "PROJECT QUOTE"}</div>
            <div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 13.5px; line-height: 1.3; color: #1E293B; margin-bottom: 3px;">Society Web Solutions</div>
            <div style="font-family: Inter, sans-serif; font-weight: 400; font-size: 12px; line-height: 1.45; color: #64748B;">1645 Palm Beach Lakes Blvd</div>
            <div style="font-family: Inter, sans-serif; font-weight: 400; font-size: 12px; line-height: 1.45; color: #64748B; margin-bottom: 2px;">West Palm Beach, FL, US</div>
            <div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 12px; line-height: 1.45; color: #2A2AA0;">
              contact@societywebsolutions.com
            </div>
          </div>
        </header>

        <!-- ── Quote / Client Summary Card ── -->
        <section style="
          box-sizing: border-box;
          width: 100%;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 18px 22px;
          margin: 24px 0 0 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        ">
          <!-- Prepared For / Client -->
          <div style="display: flex; flex-direction: column;">
            <div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 10.5px; letter-spacing: 0.08em; color: #94A3B8; text-transform: uppercase; margin: 0 0 8px 0;">${d.isProject ? "CLIENT" : "PREPARED FOR"}</div>
            <div style="font-family: Inter, sans-serif; font-weight: 700; font-size: 15.5px; line-height: 1.3; color: #0F172A; margin: 0 0 3px 0;">${d.clientName}</div>
            ${d.clientCompany ? `<div style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; line-height: 1.4; color: #475569;">${d.clientCompany}</div>` : ""}
            ${d.clientEmail ? `<div style="font-family: Inter, sans-serif; font-weight: 400; font-size: 12px; line-height: 1.4; color: #64748B;">${d.clientEmail}</div>` : ""}
          </div>

          <!-- Quote Details / Project Details -->
          <div style="width: 240px; display: flex; flex-direction: column;">
            <div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 10.5px; letter-spacing: 0.08em; color: #94A3B8; text-transform: uppercase; margin: 0 0 8px 0;">${d.isProject ? "PROJECT SUMMARY" : "QUOTE DETAILS"}</div>
            ${
              d.isProject
                ? `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Project ID:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 12px; color: #0F172A;">${d.projectNumber || d.referenceNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Submitted:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 600; font-size: 12px; color: #0F172A;">${d.submittedDate}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Est. Deadline:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 12px; color: #13663A;">${d.deadlineDate}</span>
            </div>
            `
                : `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Ref Number:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 12px; color: #0F172A;">${d.referenceNumber || d.projectNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Issued On:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 600; font-size: 12px; color: #0F172A;">${d.submittedDate}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Valid Until:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 600; font-size: 12px; color: #0F172A;">${d.validUntilDate || d.deadlineDate}</span>
            </div>
            `
            }
          </div>
        </section>

        <!-- ── Project Overview & Scope ── -->
        <div style="margin-top: 18px; margin-bottom: 16px;">
          <div style="font-family: Inter, sans-serif; font-weight: 700; font-size: 15px; color: #2A2AA0; margin-bottom: 6px;">${cleanTitle}</div>
          ${d.description ? `<p style="font-family: Inter, sans-serif; font-size: 12px; color: #475569; line-height: 1.5; margin: 0; white-space: pre-line;">${d.description}</p>` : ""}
        </div>

        <!-- ── Deliverables Table ── -->
        <div style="border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 20px; background: #FFFFFF;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: #2A2AA0; border-bottom: 1px solid #2A2AA0;">
                <th style="padding: 12px 18px; font-family: Inter, sans-serif; font-size: 10.5px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.08em; text-align: left; width: 55%;">DELIVERABLES &amp; WORK SCOPE</th>
                <th style="padding: 12px 18px; font-family: Inter, sans-serif; font-size: 10.5px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.08em; text-align: center; width: 22%;">Duration</th>
                <th style="padding: 12px 18px; font-family: Inter, sans-serif; font-size: 10.5px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.08em; text-align: right; width: 23%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(d.deliverables || [])
                .map(
                  (item: { name: string; details?: string; duration: string; amount: number; formattedAmount: string }, idx: number) => `
                <tr style="background-color: #FFFFFF; border-top: ${idx > 0 ? "1px solid #F1F5F9" : "none"};">
                  <td style="padding: 14px 18px; vertical-align: top; text-align: left;">
                    <div style="font-family: Inter, sans-serif; font-size: 13px; font-weight: 600; color: #0F172A; line-height: 1.4;">${item.name}</div>
                    ${item.details ? `<div style="font-family: Inter, sans-serif; font-size: 11px; color: #64748B; line-height: 1.4; margin-top: 3px;">${item.details}</div>` : ""}
                  </td>
                  <td style="padding: 14px 18px; vertical-align: top; font-family: Inter, sans-serif; font-size: 12.5px; font-weight: 500; color: #475569; text-align: center; white-space: nowrap;">
                    ${item.duration}
                  </td>
                  <td style="padding: 14px 18px; vertical-align: top; font-family: Inter, sans-serif; font-size: 13px; font-weight: 700; color: #0F172A; text-align: right; white-space: nowrap;">
                    ${item.formattedAmount || formatActiveCurrency(item.amount, d.currency)}
                  </td>
                </tr>
              `
                )
                .join("")}
              ${
                d.recurringDeliverables && d.recurringDeliverables.length > 0
                  ? `
                <tr class="table-subheading" style="background-color: #E2E8F0; border-top: 1px solid #CBD5E1; border-bottom: 1px solid #CBD5E1;">
                  <td colspan="3" style="padding: 10px 18px; font-family: Inter, sans-serif; font-size: 10.5px; font-weight: 700; color: #202124; text-transform: uppercase; letter-spacing: 0.08em; text-align: left;">
                    MONTHLY MAINTENANCE &amp; RECURRING SERVICES
                  </td>
                </tr>
                ${d.recurringDeliverables
                  .map(
                    (item: { name: string; details?: string; duration: string; amount: number; formattedAmount: string }, aIdx: number) => `
                  <tr style="background-color: #FFFFFF; border-top: ${aIdx > 0 ? "1px solid #F1F5F9" : "none"}; border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 14px 18px; vertical-align: top; text-align: left;">
                      <div style="font-family: Inter, sans-serif; font-size: 13px; font-weight: 600; color: #0F172A; line-height: 1.4;">${item.name}</div>
                      ${item.details ? `<div style="font-family: Inter, sans-serif; font-size: 11px; color: #64748B; line-height: 1.4; margin-top: 3px;">${item.details}</div>` : ""}
                    </td>
                    <td style="padding: 14px 18px; vertical-align: top; font-family: Inter, sans-serif; font-size: 12.5px; font-weight: 500; color: #475569; text-align: center; white-space: nowrap;">
                      ${item.duration}
                    </td>
                    <td style="padding: 14px 18px; vertical-align: top; font-family: Inter, sans-serif; font-size: 13px; font-weight: 700; color: #0F172A; text-align: right; white-space: nowrap;">
                      ${item.formattedAmount ? `${item.formattedAmount} / mo` : `${formatActiveCurrency(item.amount, d.currency)} / mo`}
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              `
                  : ""
              }
            </tbody>
          </table>
        </div>

        <!-- ── Summary Box (Bottom-Right) ── -->
        <div style="display: flex; justify-content: flex-end; margin-top: 20px; margin-bottom: 24px;">
          <div style="width: 380px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #1E293B;">
            <!-- Timeline Row -->
            <div style="background-color: #0B1220; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 44px; box-sizing: border-box;">
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">ESTIMATED TIMELINE</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 14.5px; color: #FFFFFF; white-space: nowrap; position: relative; top: -1.5px; line-height: 1;">${d.duration}</span>
            </div>

            ${
              d.vatRate && d.vatRate > 0 && d.vatAmount && d.vatAmount > 0
                ? `
            <!-- Subtotal Row -->
            <div style="background-color: #0B1220; border-top: 1px solid #1E293B; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 44px; box-sizing: border-box;">
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">SUBTOTAL</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 14.5px; color: #FFFFFF; white-space: nowrap; position: relative; top: -1.5px; line-height: 1;">${d.formattedSubtotal}</span>
            </div>

            <!-- VAT Row -->
            <div style="background-color: #0B1220; border-top: 1px solid #1E293B; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 44px; box-sizing: border-box;">
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">VAT (${d.vatRate}%)</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 14.5px; color: #FFFFFF; white-space: nowrap; position: relative; top: -1.5px; line-height: 1;">${d.formattedVatAmount}</span>
            </div>
            `
                : ""
            }

            <!-- Total Cost Row -->
            <div style="background-color: #2A2AA0; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 58px; box-sizing: border-box; ${d.vatRate && d.vatRate > 0 && d.vatAmount && d.vatAmount > 0 ? "border-top: 1px solid #3E3EE8;" : "border-top: 1px solid #1E293B;"}">
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 12px; letter-spacing: 0.06em; color: #FFFFFF; text-transform: uppercase; white-space: nowrap;">${d.isProject ? "INVESTMENT TOTAL" : "TOTAL COST"}</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 20px; color: #FFFFFF; white-space: nowrap; margin-left: 16px; position: relative; top: -2px; line-height: 1;">${d.formattedPrice}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Footer ── -->
      <footer style="width: 100%; margin-top: auto; padding-top: 20px;">
        <!-- Divider Line -->
        <div style="border-top: 1px solid #E5E7EB; margin-bottom: 14px; width: 100%;"></div>

        <!-- Footer (Centered) -->
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; padding-bottom: 2px;">
          <p style="font-family: Inter, sans-serif; font-weight: 400; font-size: 9.5px; line-height: 1.5; color: #94A3B8; margin: 0;">${d.isProject ? "This document serves as a record of project details and agreed deliverables." : "Acceptance of this quote binds the client to the agreed delivery timeline and total investment."}</p>
          <p style="font-family: Inter, sans-serif; font-weight: 400; font-size: 9.5px; line-height: 1.5; color: #94A3B8; margin: 0;">Note: Time spent waiting for client replies does not count towards project deadlines.</p>
          <p style="font-family: Inter, sans-serif; font-weight: 400; font-size: 9.5px; line-height: 1.5; color: #94A3B8; margin: 0;">For inquiries, please reach out to <span style="font-weight: 600; color: #64748B;">contact@societywebsolutions.com</span></p>
          <div style="margin-top: 12px; text-align: center;">
            <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.14em; color: #CBD5E1; text-transform: uppercase;">SOCIETY WEB SOLUTIONS</span>
          </div>
        </div>
      </footer>

    </div>
  `;
}

function loadScript(src: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensurePdfLibraries(): Promise<{ html2canvasLib: any; jsPdfLib: any }> {
  if (typeof window === "undefined") {
    throw new Error("Cannot generate PDF on server side");
  }

  if (!(window as any).html2canvas) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
  }

  if (!(window as any).jspdf && !(window as any).jsPDF) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  }

  let tries = 0;
  while ((!(window as any).html2canvas || (!(window as any).jspdf && !(window as any).jsPDF)) && tries < 25) {
    await new Promise((r) => setTimeout(r, 100));
    tries++;
  }

  const html2canvasLib = (window as any).html2canvas;
  const jsPdfLib = (window as any).jspdf?.jsPDF || (window as any).jsPDF;

  if (!html2canvasLib || !jsPdfLib) {
    throw new Error("PDF generation libraries could not be loaded");
  }

  return { html2canvasLib, jsPdfLib };
}

export async function generateBundlePDF(data: any): Promise<Blob> {
  const { html2canvasLib, jsPdfLib } = await ensurePdfLibraries();
  const pdfData = extractBundlePDFData(data);
  const htmlContent = getBundleHTML(pdfData);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "0px";
  container.style.top = "0px";
  container.style.zIndex = "-99999";
  container.style.width = "794px";
  container.style.backgroundColor = "#ffffff";
  container.style.opacity = "1";
  container.style.pointerEvents = "none";
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  // Wait 150ms for layout and font rendering
  await new Promise((r) => setTimeout(r, 150));

  try {
    const canvas = await html2canvasLib(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794,
      scrollY: 0,
      scrollX: 0,
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error("Failed to render canvas for bundle PDF");
    }

    const pdf = new jsPdfLib("p", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pageImgData = canvas.toDataURL("image/png");

    if (imgHeight <= pageHeight + 40 || imgHeight <= pageHeight * 1.12) {
      const fitH = Math.min(imgHeight, pageHeight);
      pdf.addImage(pageImgData, "PNG", 0, 0, imgWidth, fitH, undefined, "FAST");
    } else {
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(pageImgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft > 50) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(pageImgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }
    }

    return pdf.output("blob");
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export async function downloadBundlePDF(data: any, customFilename?: string): Promise<void> {
  const blob = await generateBundlePDF(data);
  const pdfData = extractBundlePDFData(data);
  const cleanNum = (pdfData.rawProjectNumber || pdfData.referenceNumber || pdfData.projectNumber || "1").replace(/[^a-zA-Z0-9-_]/g, "");
  const prefix = pdfData.isProject ? "Project_Details" : "Project_Quote";
  const filename = customFilename || (cleanNum ? `${prefix}_${cleanNum}.pdf` : `${prefix}.pdf`);

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function printBundlePDF(data: any): Promise<void> {
  const blob = await generateBundlePDF(data);
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = url;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        URL.revokeObjectURL(url);
      }, 2000);
    }, 200);
  };
}

export const downloadBundleProjectPDF = downloadBundlePDF;
export const printBundleProjectPDF = printBundlePDF;

