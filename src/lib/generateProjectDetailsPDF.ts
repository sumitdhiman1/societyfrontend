import { authService } from "./authService";
import { getVatRateForCountry } from "./vatHelper";
import {
  calculateSeoRawTimelineDays,
  formatGraphicsTimelineLabel,
  getSeoServiceMode,
  resolveGraphicsTimelineAnswer,
  snapGraphicsBaselineDays,
  getProjectEstimatedDeadline,
  getMainCalculatorCategory,
} from "./calculatorUtils";

function resolveCalculatorEstimatedTimeline(data: any): string {
  const specs = data.calculatorSpecs || data.requirements || {};
  const categoryKey = data.categoryKey || specs.categoryKey || "";
  const direct =
    specs.estimatedTimeline ||
    data.estimatedTimeline ||
    data.timeline ||
    data.totalDuration ||
    specs.timeline ||
    data.duration ||
    "";

  if (categoryKey !== "seo") return String(direct || "");

  const rawSelections = specs.selections || data.selections || [];
  if (!Array.isArray(rawSelections)) return String(direct || "");

  const seoMode = getSeoServiceMode(
    Object.fromEntries(
      rawSelections
        .filter((s: any) => /SEO_TYPE|SEO_SERVICE_TYPE|^0$/.test(s.questionKey || ""))
        .map((s: any) => [s.questionKey, { questionKey: s.questionKey, answerKeys: s.answerKeys || [] }])
    )
  );
  if (seoMode === "monthly") return "Monthly Service";

  const itemsSel = rawSelections.find(
    (s: any) => s.questionKey === "SEO_ITEMS" || s.questionKey === "2"
  );
  const tierSel = rawSelections.find(
    (s: any) => s.questionKey === "SEO_TIER" || s.questionKey === "1"
  );
  const tierKey = tierSel?.answerKeys?.[0] || "starter";
  const tier =
    /premium/i.test(tierKey) ? "premium" : /standard/i.test(tierKey) ? "standard" : "starter";

  let seoRawTimelineDays = 0;
  if (itemsSel?.answerKeys?.length) {
    const pseudoQuestion = {
      key: itemsSel.questionKey,
      answers: itemsSel.answerKeys.map((k: string) => ({
        key: k,
        metadata: itemsSel.answerMetadata?.[k],
      })),
    };
    seoRawTimelineDays = calculateSeoRawTimelineDays(
      pseudoQuestion,
      { [itemsSel.questionKey]: { questionKey: itemsSel.questionKey, answerKeys: itemsSel.answerKeys } },
      tier
    );
  }

  const timelineSel = rawSelections.find(
    (s: any) => /timeline/i.test(s.questionKey || "") || /timeline/i.test(s.questionText || "")
  );
  const tlKey = timelineSel?.answerKeys?.[0];
  const tlMeta = tlKey ? timelineSel?.answerMetadata?.[tlKey] : undefined;
  const tlRaw =
    timelineSel?.answerTexts?.[0] ||
    timelineSel?.answerKeys?.[0] ||
    "";

  if (tlRaw) {
    const resolved = resolveGraphicsTimelineAnswer(String(tlRaw), {
      directTimeline: direct,
      baselineDays: seoRawTimelineDays,
      metadata: tlMeta,
    });
    if (resolved) {
      return resolved
        .replace(/\s*\(.*?\)/g, "")
        .replace(/:\s*\+\d+%.*$/i, "")
        .replace(/:\s*No extra fee.*$/i, "")
        .replace(/:\s*.*$/, "")
        .trim();
    }
  }

  if (direct) return String(direct);
  if (seoRawTimelineDays > 0) {
    return formatGraphicsTimelineLabel(snapGraphicsBaselineDays(seoRawTimelineDays));
  }
  return "";
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

function formatQuoteNumber(raw: any): string {
  if (!raw) return "";
  const str = String(raw).replace(/^INV-/i, "").replace(/^PROJECT-/i, "").trim();
  if (!str) return "";
  if (str.startsWith("#")) {
    return str;
  }
  return `#${str}`;
}

function formatSubmittedDate(dateInput: any): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function formatPdfDateMMDDYYYY(dateInput: any): string {
  return formatSubmittedDate(dateInput);
}

function formatPdfDateSingle(dateInput: any): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const yyyy = d.getFullYear();
  return `${m}/${day}/${yyyy}`;
}

function parseDurationDays(durationInput: any): number {
  if (!durationInput) return 0;
  if (typeof durationInput === "number") return durationInput;
  const str = String(durationInput).trim().toLowerCase();

  if (/^\d+(\.\d+)?$/.test(str)) {
    return parseFloat(str);
  }
  const dayMatch = str.match(/(\d+(\.\d+)?)\s*(?:business\s*)?day/i);
  if (dayMatch) return parseFloat(dayMatch[1]);

  const weekMatch = str.match(/(\d+(\.\d+)?)\s*week/i);
  if (weekMatch) return parseFloat(weekMatch[1]) * 7;

  const monthMatch = str.match(/(\d+(\.\d+)?)\s*month/i);
  if (monthMatch) return parseFloat(monthMatch[1]) * 30;

  const hourMatch = str.match(/(\d+(\.\d+)?)\s*hour/i);
  if (hourMatch) return Math.ceil(parseFloat(hourMatch[1]) / 24);

  const rangeMatch = str.match(/(\d+)\s*-\s*(\d+)\s*(?:business\s*)?day/i);
  if (rangeMatch) return parseInt(rangeMatch[2], 10);

  const anyNum = str.match(/(\d+)/);
  if (anyNum) return parseInt(anyNum[1], 10);

  return 0;
}

export interface ProjectPDFData {
  title: string;
  projectNumber: string;
  referenceNumber: string;
  rawProjectNumber: string;
  isProject?: boolean;
  isInvoice?: boolean;
  invoiceNumber?: string;
  invoiceId?: string;
  companyName?: string;
  registrationNumber?: string;
  vatNumber?: string;
  phoneNumber?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  clientEmail: string;
  clientName: string;
  status: string;
  submittedDate: string;
  deadlineDate: string;
  validUntilDate: string;
  description: string;
  deliverables: Array<{
    name: string;
    details?: string;
    duration: string;
    amount: number;
    formattedAmount?: string;
  }>;
  addons: Array<{
    name: string;
    details?: string;
    duration: string;
    amount: number;
  }>;
  recurringDeliverables?: Array<{
    name: string;
    details?: string;
    duration: string;
    amount: number;
    formattedAmount?: string;
  }>;
  recurringAmount?: number;
  formattedRecurringAmount?: string;
  duration: string;
  totalPrice: number;
  currency: string;
  formattedPrice: string;
  subtotal?: number;
  vatRate?: number;
  vatAmount?: number;
  formattedSubtotal?: string;
  formattedVatAmount?: string;
  amountPaid?: number;
  pendingBalance?: number;
  formattedAmountPaid?: string;
  formattedPendingBalance?: string;
  [key: string]: any;
}

export function extractProjectDetails(data: any): ProjectPDFData {
  const currentUser = authService.getUser();
  const clientObj = data.client || data.user || {};
  const metadataObj = data.metadata || {};

  const isInvoice =
    data.isInvoice === true ||
    data.type === "INVOICE" ||
    data.isInvoiceMode === true ||
    Boolean(data.invoiceId) ||
    Boolean(data.invoiceNumber);

  // Always extract primary business details (for invoices and project summaries)
  const companyName =
    data.companyName ||
    metadataObj.companyName ||
    clientObj.companyName ||
    clientObj.company ||
    currentUser?.companyName ||
    data.businessCompanyName ||
    data.calculatorSpecs?.businessInfo?.companyName ||
    data.requirements?.businessInfo?.companyName ||
    "";

  const registrationNumber =
    data.registrationNumber ||
    data.companyRegistrationNumber ||
    metadataObj.registrationNumber ||
    metadataObj.companyRegistrationNumber ||
    clientObj.registrationNumber ||
    clientObj.companyRegistrationNumber ||
    currentUser?.companyRegistrationNumber ||
    currentUser?.registrationNumber ||
    "";

  const vatNumber =
    data.vatNumber ||
    data.taxId ||
    metadataObj.vatNumber ||
    metadataObj.taxId ||
    clientObj.vatNumber ||
    clientObj.taxId ||
    currentUser?.vatNumber ||
    currentUser?.taxId ||
    "";

  const phoneNumber =
    data.phoneNumber ||
    data.businessPhoneNumber ||
    data.phone ||
    metadataObj.phoneNumber ||
    metadataObj.businessPhoneNumber ||
    clientObj.phoneNumber ||
    clientObj.businessPhoneNumber ||
    clientObj.phone ||
    currentUser?.businessPhoneNumber ||
    currentUser?.phoneNumber ||
    currentUser?.phone ||
    "";

  const streetAddress =
    data.streetAddress ||
    data.address ||
    metadataObj.streetAddress ||
    metadataObj.address ||
    clientObj.streetAddress ||
    clientObj.address ||
    clientObj.billingStreetAddress ||
    currentUser?.streetAddress ||
    currentUser?.address ||
    currentUser?.billingStreetAddress ||
    "";

  const city =
    data.city ||
    metadataObj.city ||
    clientObj.city ||
    clientObj.billingCity ||
    currentUser?.city ||
    currentUser?.billingCity ||
    "";

  const state =
    data.state ||
    metadataObj.state ||
    clientObj.state ||
    clientObj.billingState ||
    currentUser?.state ||
    currentUser?.billingState ||
    "";

  const zipCode =
    data.zipCode ||
    data.postalCode ||
    metadataObj.zipCode ||
    metadataObj.postalCode ||
    clientObj.zipCode ||
    clientObj.postalCode ||
    clientObj.billingZipCode ||
    currentUser?.zipCode ||
    currentUser?.postalCode ||
    currentUser?.billingZipCode ||
    "";

  const country =
    data.country ||
    data.clientCountry ||
    metadataObj.country ||
    metadataObj.clientCountry ||
    clientObj.country ||
    clientObj.clientCountry ||
    clientObj.billingCountry ||
    currentUser?.country ||
    currentUser?.clientCountry ||
    currentUser?.billingCountry ||
    "";

  const clientEmail =
    data.clientEmail ||
    data.email ||
    metadataObj.clientEmail ||
    data.client?.email ||
    data.user?.email ||
    currentUser?.email ||
    "contact@societywebsolutions.com";

  const clientName =
    data.clientName ||
    metadataObj.clientName ||
    data.client?.fullName ||
    (data.client?.firstName
      ? `${data.client.firstName} ${data.client.lastName || ""}`.trim()
      : "") ||
    data.user?.fullName ||
    (data.user?.firstName
      ? `${data.user.firstName} ${data.user.lastName || ""}`.trim()
      : "") ||
    (currentUser?.fullName ||
      (currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ""}`.trim() : "")) ||
    data.calculatorSpecs?.businessInfo?.name ||
    data.requirements?.businessInfo?.name ||
    "Client";

  const title =
    data.projectTitle ||
    data.title ||
    data.name ||
    data.packageName ||
    metadataObj.title ||
    metadataObj.packageName ||
    data.requirements?.projectTitle ||
    data.requirements?.customQuoteProjectTitle ||
    data.calculatorSpecs?.projectTitle ||
    data.calculatorSpecs?.categoryName ||
    data.serviceType ||
    data.projectType ||
    data.type ||
    "Custom Web Project";

  const rawRef =
    data.referenceNumber ||
    data.refNumber ||
    data.refNo ||
    data.ref_no ||
    data.reference ||
    data.quoteNumber ||
    data.quoteNo ||
    data.quote_no ||
    data.proposalNumber ||
    data.proposalNo ||
    data.quoteId?.quoteNumber ||
    data.quoteId?.referenceNumber ||
    data.quote?.quoteNumber ||
    data.quote?.referenceNumber ||
    (typeof data.quoteId === "string" && !data.quoteId.match(/^[0-9a-fA-F]{24}$/) ? data.quoteId : "") ||
    data.analysisNumber ||
    data.orderNumber ||
    data.orderId ||
    data.customId ||
    data.number ||
    "";

  const explicitProjectNumber =
    data.projectNumber && String(data.projectNumber).trim() !== ""
      ? String(data.projectNumber).trim()
      : "";

  const isExplicitQuote = data.isQuote === true;
  const isExplicitProject = data.isProject === true;

  let isProject = false;
  if (isExplicitProject) {
    isProject = true;
  } else if (isExplicitQuote) {
    isProject = false;
  } else if (
    explicitProjectNumber ||
    data.projectId ||
    data.invoices ||
    data.milestones ||
    data.tasks ||
    data.progress !== undefined ||
    data.team !== undefined ||
    (data._id && !data.quoteNumber && !data.proposalNumber)
  ) {
    isProject = true;
  } else if (data.quoteNumber || data.proposalNumber) {
    isProject = false;
  } else {
    isProject = true;
  }

  let rawReferenceNumber = rawRef;
  if (!rawReferenceNumber) {
    if (explicitProjectNumber) {
      rawReferenceNumber = explicitProjectNumber;
    } else if (data._id && typeof data._id === "string" && data._id.length >= 4) {
      const year = new Date().getFullYear();
      rawReferenceNumber = `SOC-${year}-${data._id.slice(-5).toUpperCase()}`;
    } else if (data.id && typeof data.id === "string") {
      rawReferenceNumber = String(data.id);
    } else {
      rawReferenceNumber = `SOC-${new Date().getFullYear()}-0001`;
    }
  }

  const referenceNumber = formatQuoteNumber(rawReferenceNumber);
  const projectNumber = explicitProjectNumber
    ? formatQuoteNumber(explicitProjectNumber)
    : formatQuoteNumber(rawReferenceNumber);
  const rawProjectNumber = isProject ? projectNumber : referenceNumber;

  const rawCreatedAt =
    data.createdAt ||
    data.created_at ||
    data.createdDate ||
    data.orderDate ||
    data.date ||
    data.startDate ||
    data.timestamp ||
    new Date().toISOString();

  const submittedDate = formatSubmittedDate(rawCreatedAt);

  const rawDeadline =
    getProjectEstimatedDeadline(data) ||
    data.estimatedDeadline ||
    data.deadline ||
    data.deliveryDate ||
    data.dueDate ||
    data.expectedCompletionDate;
  const deadlineDate = rawDeadline
    ? formatSubmittedDate(rawDeadline)
    : "Ongoing";

  const baseCreatedDate = new Date(rawCreatedAt);
  const validCreated = !isNaN(baseCreatedDate.getTime()) ? baseCreatedDate : new Date();
  const defaultValidUntil = new Date(validCreated);
  defaultValidUntil.setMonth(defaultValidUntil.getMonth() + 3);

  const rawValidUntil =
    data.validUntil ||
    data.calculatorSpecs?.validUntil ||
    data.requirements?.validUntil ||
    data.quoteId?.validUntil;

  let validUntilObj: Date = defaultValidUntil;
  if (rawValidUntil) {
    const parsed = rawValidUntil instanceof Date ? rawValidUntil : new Date(rawValidUntil);
    if (!isNaN(parsed.getTime())) {
      validUntilObj = parsed;
    }
  } else if (data.validUntilDays || data.calculatorSpecs?.validUntilDays) {
    const days = Number(data.validUntilDays || data.calculatorSpecs?.validUntilDays);
    validUntilObj = new Date(validCreated.getTime() + days * 24 * 60 * 60 * 1000);
  }

  const validUntilDate = formatSubmittedDate(validUntilObj);

  const status = String(data.status || "In Progress")
    .replace(/_/g, " ")
    .toUpperCase();

  const currency = (data.currency || "USD").toUpperCase();

  const rawTotalPrice = Number(
    data.totalCost ||
      data.price ||
      data.amount ||
      data.totalPrice ||
      data.total ||
      data.package?.price ||
      data.bundle?.price ||
      data.amountPaid ||
      0
  );

  // Deliverables extraction
  let deliverables: Array<{ name: string; details?: string; duration: string; amount: number }> = [];
  const rawDeliverableItems: any[] = [];
  if (Array.isArray(data.deliverableItems) && data.deliverableItems.length > 0) {
    rawDeliverableItems.push(...data.deliverableItems);
  } else if (Array.isArray(data.lineItems) && data.lineItems.length > 0) {
    rawDeliverableItems.push(...data.lineItems);
  }

  if (rawDeliverableItems.length > 0) {
    deliverables = rawDeliverableItems.map((d: any) => ({
      name: d.description || d.item || d.name || d.title || title,
      details: d.details || "",
      duration:
        d.duration !== undefined && d.duration !== null && String(d.duration).trim() !== ""
          ? String(d.duration).trim().toLowerCase().includes("day") || String(d.duration).trim().toLowerCase().includes("week") || String(d.duration).trim().toLowerCase().includes("month")
            ? String(d.duration).trim()
            : `${String(d.duration).trim()} ${d.unit || "Days"}`
          : "-",
      amount: Number(d.amount ?? d.cost ?? (d.price ?? 0)),
    }));
  } else if (data.calculatorSpecs) {
    const categoryName =
      getMainCalculatorCategory(
        data.calculatorSpecs.categoryKey,
        data.calculatorSpecs.categoryName
      ) ||
      data.calculatorSpecs.categoryName ||
      data.serviceType ||
      "Website Development";
    const resolvedTimeline = resolveCalculatorEstimatedTimeline(data);
    deliverables = [
      {
        name: categoryName,
        details: "Based on calculator selections",
        duration: resolvedTimeline || data.calculatorSpecs.estimatedTimeline || data.timeline || "14 Days",
        amount: rawTotalPrice > 0 ? rawTotalPrice : Number(data.amountPaid || 0),
      },
    ];
  } else {
    deliverables = [
      {
        name: title.toLowerCase().startsWith("free website analysis") ? "Free Website Analysis" : title,
        details: "",
        duration: data.duration || (data.timelineInDays ? `${data.timelineInDays} Days` : "-"),
        amount: rawTotalPrice,
      },
    ];
  }

  // Addons extraction with deduplication
  const rawAddonsList: Array<{ name: string; details?: string; duration: string; amount: number }> = [];
  const seenAddonKeys = new Set<string>();
  if (Array.isArray(data.addons)) {
    data.addons.forEach((addon: any) => {
      const addonKey = String(addon.proposalMessageId || addon._id || '').trim();
      if (addonKey && seenAddonKeys.has(addonKey)) return;
      if (addonKey) seenAddonKeys.add(addonKey);

      if (Array.isArray(addon.deliverableItems)) {
        addon.deliverableItems.forEach((item: any) => {
          rawAddonsList.push({
            name: item.description || item.name || item.title || "Add-on Task",
            details: item.details || "",
            duration: item.duration
              ? String(item.duration).toLowerCase().includes("day") || String(item.duration).toLowerCase().includes("week") || String(item.duration).toLowerCase().includes("month")
                ? String(item.duration)
                : `${item.duration} ${item.unit || "Days"}`
              : "-",
            amount: Number(item.amount ?? item.cost ?? 0),
          });
        });
      }
    });
  }

  // Also check messages for accepted quote proposals only if addons is empty
  if (rawAddonsList.length === 0 && Array.isArray(data.messages)) {
    const seenMsgIds = new Set<string>();
    data.messages
      .filter((m: any) => {
        const isQuote = m.type === "quote_proposal" || m.content?.type === "quote_proposal";
        const isAccepted =
          m.content?.proposalStatus === "accepted" ||
          m.proposalStatus === "accepted" ||
          m.content?.status === "accepted" ||
          m.status === "accepted";
        if (!isQuote || !isAccepted) return false;
        const mId = String(m.id || m._id || m.content?.id || '').trim();
        if (mId && seenMsgIds.has(mId)) return false;
        if (mId) seenMsgIds.add(mId);
        return true;
      })
      .forEach((m: any) => {
        const items = m.deliverableItems || m.content?.deliverableItems || [];
        items.forEach((item: any) => {
          rawAddonsList.push({
            name: item.description || item.name || item.title || "Add-on Task",
            details: item.details || "",
            duration: item.duration
              ? String(item.duration).toLowerCase().includes("day") || String(item.duration).toLowerCase().includes("week") || String(item.duration).toLowerCase().includes("month")
                ? String(item.duration)
                : `${item.duration} ${item.unit || "Days"}`
              : "-",
            amount: Number(item.amount ?? item.cost ?? 0),
          });
        });
      });
  }

  const seenAddonItemKeys = new Set<string>();
  const addons: Array<{ name: string; details?: string; duration: string; amount: number }> = rawAddonsList.filter((item) => {
    const key = `${String(item.name || '').trim().toLowerCase()}-${Number(item.amount || 0)}-${String(item.duration || '').trim().toLowerCase()}`;
    if (seenAddonItemKeys.has(key)) return false;
    seenAddonItemKeys.add(key);
    return true;
  });

  if (addons.length > 0) {
    deliverables = deliverables.filter((d) => {
      const key = `${String(d.name || '').trim().toLowerCase()}-${Number(d.amount || 0)}-${String(d.duration || '').trim().toLowerCase()}`;
      return !seenAddonItemKeys.has(key);
    });
  }

  // Calculate total duration in days across all deliverables and addons
  let totalDays = 0;
  for (const d of deliverables) {
    totalDays += parseDurationDays(d.duration);
  }
  for (const a of addons) {
    totalDays += parseDurationDays(a.duration);
  }

  let duration = "";
  if (totalDays > 0) {
    duration = `${totalDays} days`;
  } else if (data.timelineInDays) {
    duration = `${data.timelineInDays} days`;
  } else if (data.totalDuration || data.timeline || data.estimatedTimeline || data.duration) {
    duration = String(data.totalDuration || data.timeline || data.estimatedTimeline || data.duration)
      .replace(/\bWeeks\b/g, "weeks")
      .replace(/\bWeek\b/g, "week")
      .replace(/\bDays\b/g, "days")
      .replace(/\bDay\b/g, "day")
      .replace(/\bMonths\b/g, "months")
      .replace(/\bMonth\b/g, "month");
  } else if (data.calculatorSpecs?.estimatedTimeline) {
    duration = String(data.calculatorSpecs.estimatedTimeline);
  } else {
    duration = "14 days";
  }

  const rawTotalCost = Number(
    data.totalCost ??
      data.totalAmount ??
      data.totalPrice ??
      (data.price != null ? data.price : (data.amount != null ? data.amount : (data.total != null ? data.total : (data.package?.price || data.bundle?.price || 0))))
  );

  const isEstoniaClient = (c?: string) => {
    if (!c) return false;
    const upper = c.trim().toUpperCase();
    return upper === "EE" || upper === "EST" || upper === "ESTONIA";
  };
  const explicitVatRate = Number(
    data.vatRate ??
      data.vatPercentage ??
      data.quoteId?.vatRate ??
      data.quoteId?.vatPercentage ??
      (data.taxPercentage != null ? data.taxPercentage : 0)
  ) || 0;

  let loggedUserCountry = "";
  try {
    const user = authService.getUser();
    loggedUserCountry = user?.country || user?.clientCountry || user?.billingCountry || "";
  } catch {}

  const countryStr = String(
    data.clientCountry ||
      data.country ||
      data.client?.country ||
      data.client?.clientCountry ||
      data.quoteId?.clientCountry ||
      data.quoteId?.country ||
      loggedUserCountry ||
      ""
  );

  // VAT applies for explicit vatRate or Estonian clients (24%)
  const vatRate = explicitVatRate > 0 ? explicitVatRate : getVatRateForCountry(countryStr);

  const rawVatAmount = Number(data.vatAmount ?? data.tax ?? 0);

  const rawBaseAmount = Number(
    data.baseAmount ??
      data.subtotal ??
      data.calculatorSpecs?.calculatedPrice ??
      data.calculatorSpecs?.subtotal ??
      data.quoteId?.requirements?.calculatedPrice ??
      data.quoteId?.requirements?.subtotal ??
      0
  );

  const deliverablesSum = deliverables.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const addonsSum = addons.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

  const initialSubtotal =
    deliverablesSum > 0
      ? deliverablesSum
      : rawBaseAmount > 0
      ? rawBaseAmount
      : vatRate > 0 && rawTotalCost > 0
      ? Math.round((rawTotalCost / (1 + vatRate / 100)) * 100) / 100
      : (rawTotalCost > 0 ? rawTotalCost : 0);

  const totalBaseSubtotal = initialSubtotal + addonsSum;
  const baseAmount = totalBaseSubtotal;

  const vatAmount =
    vatRate > 0
      ? Math.round((baseAmount * (vatRate / 100)) * 100) / 100
      : (rawVatAmount > 0 ? rawVatAmount : 0);

  const totalPrice = baseAmount + vatAmount;

  // If there's only 1 deliverable item and its amount is 0, set it to baseAmount or totalPrice
  if (deliverables.length === 1 && deliverables[0].amount === 0 && (baseAmount > 0 || totalPrice > 0)) {
    deliverables[0].amount = baseAmount > 0 ? baseAmount : totalPrice;
  }

  let formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalPrice);

  const categoryKey = (
    data.categoryKey ||
    data.calculatorSpecs?.categoryKey ||
    ""
  ).toLowerCase();

  const isMarketing =
    categoryKey === "marketing" ||
    /market|campaign/i.test(title || "") ||
    /market|campaign/i.test(data.categoryName || "") ||
    /market|campaign/i.test(data.calculatorSpecs?.categoryName || "");

  if (isMarketing && !formattedPrice.endsWith("/month")) {
    formattedPrice = `${formattedPrice} /month`;
  }

  let description =
    data.projectDescription ||
    data.description ||
    data.requirements?.projectDescription ||
    data.requirements?.description ||
    data.calculatorSpecs?.projectDescription ||
    data.calculatorSpecs?.description ||
    "";
  if (!description && data.calculatorSpecs) {
    description = isMarketing
      ? `Marketing campaign project for ${clientName}.`
      : `Website development project for ${clientName}.`;
  }

  const rawSubtotal = baseAmount > 0 ? baseAmount : (vatRate > 0 ? Math.round((totalPrice / (1 + vatRate / 100)) * 100) / 100 : totalPrice);

  const amountPaid = Number(data.amountPaid || 0);
  const pendingBalance = Math.max(0, totalPrice - amountPaid);

  const formattedSubtotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rawSubtotal);

  const formattedVatAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(vatAmount);

  const formattedAmountPaid = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountPaid);

  const formattedPendingBalance = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pendingBalance);

  const rawRecurringAmount = Number(
    data.recurringAmount ??
      metadataObj.recurringAmount ??
      data.recurringPrice ??
      metadataObj.recurringPrice ??
      data.monthlyPrice ??
      metadataObj.monthlyPrice ??
      data.package?.recurringAmount ??
      data.bundle?.recurringAmount ??
      0
  );
  const recurringAmount = rawRecurringAmount > 0 ? rawRecurringAmount : 0;

  const formattedRecurringAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(recurringAmount);

  let recurringDeliverables: Array<{
    name: string;
    details?: string;
    duration: string;
    amount: number;
    formattedAmount?: string;
  }> = [];

  if (Array.isArray(data.recurringDeliverables) && data.recurringDeliverables.length > 0) {
    recurringDeliverables = data.recurringDeliverables.map((item: any) => ({
      name: item.name || item.description || item.title || "Recurring Service",
      details: item.details || "",
      duration: item.duration || "Monthly",
      amount: Number(item.amount ?? item.cost ?? recurringAmount),
      formattedAmount: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
      }).format(Number(item.amount ?? item.cost ?? recurringAmount)),
    }));
  } else if (recurringAmount > 0) {
    recurringDeliverables = [
      {
        name: "Monthly Maintenance & Support",
        details:
          data.recurringLineItems ||
          metadataObj.recurringLineItems ||
          data.recurringFeatures ||
          "Ongoing hosting, security updates, and dedicated support",
        duration: "Monthly",
        amount: recurringAmount,
        formattedAmount: formattedRecurringAmount,
      },
    ];
  }

  let rawInvoiceNum =
    data.invoiceNumber ||
    data.invoiceId ||
    (Array.isArray(data.invoices) && data.invoices[0]?.invoiceNumber ? data.invoices[0].invoiceNumber : "") ||
    (Array.isArray(data.invoices) && data.invoices[0]?.invoiceId ? data.invoices[0].invoiceId : "") ||
    (Array.isArray(data.payments) && data.payments[0]?.invoiceNumber ? data.payments[0].invoiceNumber : "") ||
    (Array.isArray(data.paymentLedger) && data.paymentLedger[0]?.invoiceNumber ? data.paymentLedger[0].invoiceNumber : "") ||
    data.transaction?.metadata?.invoiceNumber ||
    data.metadata?.invoiceNumber;

  if (!rawInvoiceNum && isInvoice) {
    if (data._id) {
      rawInvoiceNum = `INV-2026-${String(data._id).slice(-4).toUpperCase()}`;
    } else {
      rawInvoiceNum = "INV-2026-001";
    }
  }

  const cleanInvoiceNum = String(rawInvoiceNum || "")
    .replace(/^Project\s*#?/i, "")
    .replace(/^#/, "");

  const invoiceNumber = cleanInvoiceNum
    ? cleanInvoiceNum.toUpperCase().startsWith("INV-")
      ? cleanInvoiceNum.toUpperCase()
      : `INV-${cleanInvoiceNum.toUpperCase()}`
    : "";

  const invoiceId = invoiceNumber;

  return {
    rawProjectNumber,
    projectNumber,
    referenceNumber,
    isProject,
    isInvoice,
    invoiceNumber,
    invoiceId,
    companyName,
    registrationNumber,
    vatNumber,
    phoneNumber,
    streetAddress,
    city,
    state,
    zipCode,
    country,
    title,
    clientEmail,
    clientName,
    status,
    submittedDate,
    deadlineDate,
    validUntilDate,
    duration,
    totalPrice,
    currency,
    formattedPrice,
    subtotal: rawSubtotal,
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
    addons,
    recurringDeliverables,
    recurringAmount,
    formattedRecurringAmount,
  };
}

const LOGO_SVG = `<img width="158" height="50" src="/images/logo.svg" style="display: block;" alt="Society Logo" />`;

export function getProjectDetailsHTML(d: ProjectPDFData): string {
  const cleanTitle = d.title.replace(/^Project Title:\s*/i, "");

  const fullAddress = [d.streetAddress, d.city, d.state, d.zipCode, d.country]
    .filter((part) => part && String(part).trim() !== "" && String(part).trim() !== "—" && String(part).trim() !== "-")
    .join(", ");

  const hasRecurring = typeof d.recurringAmount === "number" && d.recurringAmount > 0;

  return `
    <div class="pdf-page" style="
      width: 794px;
      min-height: 1123px;
      box-sizing: border-box;
      background-color: #FFFFFF;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #202124;
      padding: 44px 54px 32px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      margin: 0 auto;
    ">
      
      <div style="width: 100%; display: flex; flex-direction: column; flex: 1;">
        <!-- ── Main Header ── -->
        <header style="width: 100%; display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; margin: 0; padding: 0; box-sizing: border-box;">
          <div class="header-logo" style="display: flex; flex-direction: column; align-items: flex-start; margin: 0; padding-top: 6px;">
            ${LOGO_SVG}
          </div>
          <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; margin: 0; padding: 0; white-space: nowrap;">
            <div style="font-family: Inter, sans-serif; font-weight: 700; font-size: 20px; letter-spacing: -0.01em; color: #2A2AA0; margin: 0 0 8px 0; line-height: 1; padding: 0;">${d.isInvoice ? "INVOICE" : d.isProject ? "PROJECT DETAILS" : "PROJECT QUOTE"}</div>
            <div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 13px; line-height: 1.3; color: #1E293B; margin-bottom: 2px;">Society Web Solutions</div>
            <div style="font-family: Inter, sans-serif; font-weight: 400; font-size: 11.5px; line-height: 1.4; color: #64748B;">1645 Palm Beach Lakes Blvd</div>
            <div style="font-family: Inter, sans-serif; font-weight: 400; font-size: 11.5px; line-height: 1.4; color: #64748B; margin-bottom: 2px;">West Palm Beach, FL, US</div>
            <div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 11.5px; line-height: 1.4; color: #2A2AA0;">
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
          padding: 14px 18px;
          margin: 16px 0 0 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        ">
          <!-- Prepared For / Client / Billed To -->
          <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
            <div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 10px; letter-spacing: 0.08em; color: #94A3B8; text-transform: uppercase; margin: 0 0 6px 0;">${d.isInvoice ? "BILLED TO" : d.isProject ? "CLIENT" : "PREPARED FOR"}</div>
            <div style="font-family: Inter, sans-serif; font-weight: 700; font-size: 14px; line-height: 1.3; color: #0F172A; margin: 0 0 3px 0;">${d.clientName}</div>
            ${d.companyName ? `<div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 12px; line-height: 1.35; color: #1E293B; margin-bottom: 2px;">${d.companyName}</div>` : ""}
            ${d.registrationNumber ? `<div style="font-family: Inter, sans-serif; font-size: 11px; line-height: 1.35; color: #64748B; margin-bottom: 2px;">Reg: ${d.registrationNumber}</div>` : ""}
            ${d.vatNumber ? `<div style="font-family: Inter, sans-serif; font-size: 11px; line-height: 1.35; color: #64748B; margin-bottom: 2px;">VAT / Tax ID: ${d.vatNumber}</div>` : ""}
            ${fullAddress ? `<div style="font-family: Inter, sans-serif; font-weight: 400; font-size: 11.5px; line-height: 1.35; color: #64748B; margin-bottom: 2px;">${fullAddress}</div>` : ""}
            ${d.clientEmail ? `<div style="font-family: Inter, sans-serif; font-weight: 400; font-size: 11.5px; line-height: 1.35; color: #64748B; margin-bottom: 2px;">${d.clientEmail}</div>` : ""}
            ${d.phoneNumber ? `<div style="font-family: Inter, sans-serif; font-weight: 400; font-size: 11.5px; line-height: 1.35; color: #64748B;">${d.phoneNumber}</div>` : ""}
          </div>

          <!-- Quote Details / Project Details / Invoice Summary -->
          <div style="width: 250px; flex-shrink: 0; display: flex; flex-direction: column;">
            <div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 10px; letter-spacing: 0.08em; color: #94A3B8; text-transform: uppercase; margin: 0 0 6px 0;">${d.isInvoice ? "INVOICE DETAILS" : d.isProject ? "PROJECT SUMMARY" : "QUOTE DETAILS"}</div>
            ${
              d.isInvoice
                ? `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; line-height: 1.35;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 11.5px; color: #64748B;">Invoice ID:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 11.5px; color: #0F172A;">${d.invoiceNumber || d.invoiceId || d.projectNumber || d.referenceNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; line-height: 1.35;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 11.5px; color: #64748B;">Issued Date:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 600; font-size: 11.5px; color: #0F172A;">${d.submittedDate}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; line-height: 1.35;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 11.5px; color: #64748B;">Due Date:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 600; font-size: 11.5px; color: #0F172A;">${d.deadlineDate || d.validUntilDate || "Upon Receipt"}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; line-height: 1.35;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 11.5px; color: #64748B;">Status:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 11.5px; color: #0F172A;">${Number(d.amountPaid || 0) >= Number(d.totalPrice || 0) && Number(d.totalPrice || 0) > 0 ? "PAID" : Number(d.amountPaid || 0) > 0 ? "PARTIALLY PAID" : "DUE"}</span>
            </div>
            `
                : d.isProject
                ? `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; line-height: 1.35;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 11.5px; color: #64748B;">Project ID:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 11.5px; color: #0F172A;">${d.projectNumber || d.referenceNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; line-height: 1.35;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 11.5px; color: #64748B;">Submitted:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 600; font-size: 11.5px; color: #0F172A;">${d.submittedDate}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; line-height: 1.35;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 11.5px; color: #64748B;">Est. Deadline:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 11.5px; color: #13663A;">${d.deadlineDate}</span>
            </div>
            `
                : `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; line-height: 1.35;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 11.5px; color: #64748B;">Ref Number:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 11.5px; color: #0F172A;">${d.referenceNumber || d.projectNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; line-height: 1.35;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 11.5px; color: #64748B;">Issued On:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 600; font-size: 11.5px; color: #0F172A;">${d.submittedDate}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; line-height: 1.35;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 11.5px; color: #64748B;">Valid Until:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 600; font-size: 11.5px; color: #0F172A;">${d.validUntilDate || d.deadlineDate}</span>
            </div>
            `
            }
          </div>
        </section>

        <!-- ── Project Overview & Scope ── -->
        <div style="margin-top: 14px; margin-bottom: 12px;">
          <div style="font-family: Inter, sans-serif; font-weight: 700; font-size: 14px; color: #2A2AA0; margin-bottom: 4px;">${cleanTitle}</div>
          ${d.description ? `<p style="font-family: Inter, sans-serif; font-size: 11.5px; color: #475569; line-height: 1.45; margin: 0; white-space: pre-line;">${d.description}</p>` : ""}
        </div>

        <!-- ── Deliverables Table ── -->
        <div style="border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 16px; background: #FFFFFF;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: #2A2AA0; border-bottom: 1px solid #2A2AA0;">
                <th style="padding: 10px 16px; font-family: Inter, sans-serif; font-size: 10px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.08em; text-align: left; width: 55%;">DELIVERABLES &amp; WORK SCOPE</th>
                <th style="padding: 10px 16px; font-family: Inter, sans-serif; font-size: 10px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.08em; text-align: center; width: 22%;">Duration</th>
                <th style="padding: 10px 16px; font-family: Inter, sans-serif; font-size: 10px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.08em; text-align: right; width: 23%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(d.deliverables || [])
                .map(
                  (item: { name: string; details?: string; duration: string; amount: number; formattedAmount?: string }, idx: number) => `
                <tr style="background-color: #FFFFFF; border-top: ${idx > 0 ? "1px solid #F1F5F9" : "none"};">
                  <td style="padding: 11px 16px; vertical-align: top; text-align: left;">
                    <div style="font-family: Inter, sans-serif; font-size: 12.5px; font-weight: 600; color: #0F172A; line-height: 1.35;">${item.name}</div>
                    ${item.details ? `<div style="font-family: Inter, sans-serif; font-size: 10.5px; color: #64748B; line-height: 1.35; margin-top: 2px;">${item.details}</div>` : ""}
                  </td>
                  <td style="padding: 11px 16px; vertical-align: top; font-family: Inter, sans-serif; font-size: 12px; font-weight: 500; color: #475569; text-align: center; white-space: nowrap;">
                    ${item.duration}
                  </td>
                  <td style="padding: 11px 16px; vertical-align: top; font-family: Inter, sans-serif; font-size: 12.5px; font-weight: 700; color: #0F172A; text-align: right; white-space: nowrap;">
                    ${item.formattedAmount || new Intl.NumberFormat("en-US", { style: "currency", currency: (d.currency || "USD").toUpperCase(), minimumFractionDigits: 2 }).format(item.amount)}
                  </td>
                </tr>
              `
                )
                .join("")}
              ${
                d.addons && d.addons.length > 0
                  ? `
                <tr class="table-subheading" style="background-color: #E2E8F0; border-top: 1px solid #CBD5E1; border-bottom: 1px solid #CBD5E1;">
                  <td colspan="3" style="padding: 8px 16px; font-family: Inter, sans-serif; font-size: 10px; font-weight: 700; color: #202124; text-transform: uppercase; letter-spacing: 0.08em; text-align: left;">
                    ADD-ON TASKS
                  </td>
                </tr>
                ${d.addons
                  .map(
                    (addon: { name: string; details?: string; duration: string; amount: number }, aIdx: number) => `
                  <tr style="background-color: #FFFFFF; border-top: ${aIdx > 0 ? "1px solid #F1F5F9" : "none"}; border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 11px 16px; vertical-align: top; text-align: left;">
                      <div style="font-family: Inter, sans-serif; font-size: 12.5px; font-weight: 600; color: #0F172A; line-height: 1.35;">${addon.name}</div>
                      ${addon.details ? `<div style="font-family: Inter, sans-serif; font-size: 10.5px; color: #64748B; line-height: 1.35; margin-top: 2px;">${addon.details}</div>` : ""}
                    </td>
                    <td style="padding: 11px 16px; vertical-align: top; font-family: Inter, sans-serif; font-size: 12px; font-weight: 500; color: #475569; text-align: center; white-space: nowrap;">
                      ${addon.duration}
                    </td>
                    <td style="padding: 11px 16px; vertical-align: top; font-family: Inter, sans-serif; font-size: 12.5px; font-weight: 700; color: #0F172A; text-align: right; white-space: nowrap;">
                      ${new Intl.NumberFormat("en-US", { style: "currency", currency: (d.currency || "USD").toUpperCase(), minimumFractionDigits: 2 }).format(addon.amount)}
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              `
                  : ""
              }
              ${
                d.recurringDeliverables && d.recurringDeliverables.length > 0
                  ? `
                <tr class="table-subheading" style="background-color: #E2E8F0; border-top: 1px solid #CBD5E1; border-bottom: 1px solid #CBD5E1;">
                  <td colspan="3" style="padding: 8px 16px; font-family: Inter, sans-serif; font-size: 10px; font-weight: 700; color: #202124; text-transform: uppercase; letter-spacing: 0.08em; text-align: left;">
                    MONTHLY MAINTENANCE &amp; RECURRING SERVICES
                  </td>
                </tr>
                ${d.recurringDeliverables
                  .map(
                    (item: { name: string; details?: string; duration: string; amount: number; formattedAmount?: string }, aIdx: number) => `
                  <tr style="background-color: #FFFFFF; border-top: ${aIdx > 0 ? "1px solid #F1F5F9" : "none"}; border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 11px 16px; vertical-align: top; text-align: left;">
                      <div style="font-family: Inter, sans-serif; font-size: 12.5px; font-weight: 600; color: #0F172A; line-height: 1.35;">${item.name}</div>
                      ${item.details ? `<div style="font-family: Inter, sans-serif; font-size: 10.5px; color: #64748B; line-height: 1.35; margin-top: 2px;">${item.details}</div>` : ""}
                    </td>
                    <td style="padding: 11px 16px; vertical-align: top; font-family: Inter, sans-serif; font-size: 12px; font-weight: 500; color: #475569; text-align: center; white-space: nowrap;">
                      ${item.duration}
                    </td>
                    <td style="padding: 11px 16px; vertical-align: top; font-family: Inter, sans-serif; font-size: 12.5px; font-weight: 700; color: #0F172A; text-align: right; white-space: nowrap;">
                      ${item.formattedAmount ? `${item.formattedAmount} / mo` : `${new Intl.NumberFormat("en-US", { style: "currency", currency: (d.currency || "USD").toUpperCase(), minimumFractionDigits: 2 }).format(item.amount)} / mo`}
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
        <div style="display: flex; justify-content: flex-end; margin-top: 14px; margin-bottom: 16px;">
          <div style="width: 360px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #1E293B;">
            <!-- Timeline Row -->
            <div style="background-color: #0B1220; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; height: 38px; box-sizing: border-box;">
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 10.5px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">ESTIMATED TIMELINE</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 13.5px; color: #FFFFFF; white-space: nowrap; position: relative; top: -1px; line-height: 1;">${d.duration}</span>
            </div>

            ${
              d.vatRate && d.vatRate > 0 && d.vatAmount && d.vatAmount > 0
                ? `
            <!-- Subtotal Row -->
            <div style="background-color: #0B1220; border-top: 1px solid #1E293B; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; height: 38px; box-sizing: border-box;">
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 10.5px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">SUBTOTAL</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 13.5px; color: #FFFFFF; white-space: nowrap; position: relative; top: -1px; line-height: 1;">${d.formattedSubtotal}</span>
            </div>

            <!-- VAT Row -->
            <div style="background-color: #0B1220; border-top: 1px solid #1E293B; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; height: 38px; box-sizing: border-box;">
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 10.5px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">VAT (${d.vatRate}%)</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 13.5px; color: #FFFFFF; white-space: nowrap; position: relative; top: -1px; line-height: 1;">${d.formattedVatAmount}</span>
            </div>
            `
                : ""
            }

            <!-- Total Cost Row -->
            <div style="background-color: #2A2AA0; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; height: 50px; box-sizing: border-box; ${d.vatRate && d.vatRate > 0 && d.vatAmount && d.vatAmount > 0 ? "border-top: 1px solid #3E3EE8;" : "border-top: 1px solid #1E293B;"}">
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 11.5px; letter-spacing: 0.06em; color: #FFFFFF; text-transform: uppercase; white-space: nowrap;">${d.isInvoice ? "INVOICE TOTAL" : d.isProject ? "INVESTMENT TOTAL" : "TOTAL COST"}</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 18px; color: #FFFFFF; white-space: nowrap; margin-left: 14px; position: relative; top: -1.5px; line-height: 1;">${d.formattedPrice}</span>
            </div>

            ${
              hasRecurring
                ? `
            <!-- Monthly Retainer Row -->
            <div style="background-color: #0B1220; border-top: 1px solid #1E293B; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; height: 38px; box-sizing: border-box;">
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 10.5px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">MONTHLY RETAINER</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 13.5px; color: #FFFFFF; white-space: nowrap; position: relative; top: -1px; line-height: 1;">${d.formattedRecurringAmount} / mo</span>
            </div>
            `
                : ""
            }
          </div>
        </div>
      </div>

      <!-- ── Footer ── -->
      <footer style="width: 100%; margin-top: auto; padding-top: 12px;">
        <!-- Divider Line -->
        <div style="border-top: 1px solid #E5E7EB; margin-bottom: 10px; width: 100%;"></div>

        <!-- Footer (Centered) -->
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 3px; padding-bottom: 2px;">
          <p style="font-family: Inter, sans-serif; font-weight: 400; font-size: 9px; line-height: 1.4; color: #94A3B8; margin: 0;">${d.isInvoice ? "This document serves as an official commercial invoice for agreed digital services." : d.isProject ? "This document serves as a record of project details and agreed deliverables." : "Acceptance of this quote binds the client to the agreed delivery timeline and total investment."}</p>
          <p style="font-family: Inter, sans-serif; font-weight: 400; font-size: 9px; line-height: 1.4; color: #94A3B8; margin: 0;">Note: Time spent waiting for client replies does not count towards project deadlines.</p>
          <p style="font-family: Inter, sans-serif; font-weight: 400; font-size: 9px; line-height: 1.4; color: #94A3B8; margin: 0;">For inquiries, please reach out to <span style="font-weight: 600; color: #64748B;">contact@societywebsolutions.com</span></p>
          <div style="margin-top: 8px; text-align: center;">
            <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 0.14em; color: #CBD5E1; text-transform: uppercase;">SOCIETY WEB SOLUTIONS</span>
          </div>
        </div>
      </footer>

    </div>
  `;
}

export async function downloadProjectDetailsPDF(data: any, customFilename?: string): Promise<void> {
  if (typeof window === "undefined") return;

  const d = extractProjectDetails(data);

  try {
    const { html2canvasLib, jsPdfLib } = await ensurePdfLibraries();

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "0px";
    container.style.top = "0px";
    container.style.zIndex = "-99999";
    container.style.width = "794px";
    container.style.backgroundColor = "#ffffff";
    container.style.opacity = "1";
    container.style.pointerEvents = "none";
    container.innerHTML = getProjectDetailsHTML(d);

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
        throw new Error("Failed to render canvas for project details PDF");
      }

      const pdf = new jsPdfLib("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pageImgData = canvas.toDataURL("image/png");

      if (imgHeight <= pageHeight + 25) {
        pdf.addImage(pageImgData, "PNG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
      } else {
        // Multi-page slicing if needed
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(pageImgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;

        while (heightLeft > 40) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(pageImgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
          heightLeft -= pageHeight;
        }
      }

      const cleanNum = (d.rawProjectNumber || d.referenceNumber || d.projectNumber || "1").replace(/[^a-zA-Z0-9-_]/g, "");
      const prefix = d.isInvoice ? "Invoice" : d.isProject ? "Project_Details" : "Project_Quote";
      const filename = customFilename || (cleanNum ? `${prefix}_${cleanNum}.pdf` : `${prefix}.pdf`);
      pdf.save(filename);
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  } catch (err) {
    console.warn("Project details direct PDF generation fallback to print:", err);
    printProjectDetails(data);
  }
}

export function printProjectDetails(data: any): void {
  if (typeof window === "undefined") return;

  const d = extractProjectDetails(data);
  const printTitle = d.rawProjectNumber || d.referenceNumber || d.projectNumber || (d.isProject ? "Project" : "Quote");
  const docTitle = d.isInvoice ? "Invoice" : d.isProject ? "Project Details" : "Project Quote";
  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${docTitle} - ${printTitle}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #0F172A;
            -webkit-font-smoothing: antialiased;
          }
          .header-logo {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        ${getProjectDetailsHTML(d)}
      </body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(printContent);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }, 400);
}
