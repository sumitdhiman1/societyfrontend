import { authService } from "./authService";
import { countryService } from "./countryService";
import { getVatRateForCountry } from "./vatHelper";
import type { CalculatorSelection } from "./priceCalculatorService";
import {
  calculateGraphicsRawTimelineDays,
  calculateSeoRawTimelineDays,
  formatGraphicsTimelineLabel,
  getMainCalculatorCategory,
  getProjectEstimatedDeadline,
  getSeoServiceMode,
  isMonthlyBillingCategory,
  parseDurationToDays,
  resolveGraphicsTimelineAnswer,
  snapGraphicsBaselineDays,
} from "./calculatorUtils";

function stripCalculatorHtml(text: string): string {
  return text.replace(/<br\s*\/?>/gi, " ").replace(/\s+/g, " ").trim();
}

function formatPdfDate(dateInput: any): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = months[d.getMonth()];
  const dd = d.getDate();
  const yyyy = d.getFullYear();
  return `${m} ${dd}, ${yyyy}`;
}

export interface CalculatorPDFData {
  title: string;
  projectNumber: string;
  rawProjectNumber: string;
  clientEmail: string;
  clientName: string;
  status: string;
  issuedDate: string;
  validUntilDate: string;
  categoryName: string;
  subtitle?: string;
  scopeOverviewLead?: string;
  hideClientEmail?: boolean;
  description?: string;
  selectedOptions: Array<{ question: string; answers: string[] }>;
  duration: string;
  totalPrice: number;
  currency: string;
  formattedPrice: string;
  subtotal?: number;
  vatRate?: number;
  vatAmount?: number;
  formattedSubtotal?: string;
  formattedVatAmount?: string;
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
  amountPaid?: number;
  pendingBalance?: number;
  formattedAmountPaid?: string;
  formattedPendingBalance?: string;
  [key: string]: any;
}

export function generateUniqueRefNumber(prefix: string = "SOC", dateInput?: any): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${year}-${randomPart}`;
}

function isPlaceholderRefNumber(val: any): boolean {
  if (!val) return true;
  const str = String(val).trim();
  return (
    str === "" ||
    str === "1" ||
    str === "#1" ||
    str === "0" ||
    str === "#0" ||
    str.toLowerCase() === "preview" ||
    str.toLowerCase() === "quote"
  );
}

export function extractCalculatorPDFData(data: any): CalculatorPDFData {
  const currentUser = data.user || authService.getUser();
  const clientEmail =
    data.client?.email ||
    data.clientEmail ||
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
    data.calculatorSpecs?.businessInfo?.name ||
    data.requirements?.businessInfo?.name ||
    (data.title && data.title.includes(" - ") ? data.title.split(" - ").pop()?.trim() : "") ||
    "Client";

  const companyName =
    data.companyName ||
    data.client?.companyName ||
    currentUser?.companyName ||
    data.calculatorSpecs?.businessInfo?.companyName ||
    "";

  const registrationNumber =
    data.registrationNumber ||
    data.companyRegistrationNumber ||
    data.client?.registrationNumber ||
    data.client?.companyRegistrationNumber ||
    currentUser?.companyRegistrationNumber ||
    currentUser?.registrationNumber ||
    "";

  const vatNumber =
    data.vatNumber ||
    data.taxId ||
    data.vatId ||
    data.client?.vatNumber ||
    data.client?.taxId ||
    currentUser?.vatNumber ||
    currentUser?.taxId ||
    "";

  const phoneNumber =
    data.phoneNumber ||
    data.businessPhoneNumber ||
    data.phone ||
    data.client?.phone ||
    data.client?.phoneNumber ||
    data.client?.businessPhoneNumber ||
    currentUser?.businessPhoneNumber ||
    currentUser?.phoneNumber ||
    currentUser?.phone ||
    "";

  const streetAddress =
    data.streetAddress ||
    data.address ||
    data.client?.streetAddress ||
    data.client?.address ||
    currentUser?.streetAddress ||
    currentUser?.address ||
    "";

  const city =
    data.city ||
    data.client?.city ||
    currentUser?.city ||
    "";

  const state =
    data.state ||
    data.client?.state ||
    currentUser?.state ||
    "";

  const zipCode =
    data.zipCode ||
    data.postalCode ||
    data.client?.zipCode ||
    currentUser?.zipCode ||
    "";

  const country =
    data.clientCountry ||
    data.country ||
    data.client?.country ||
    currentUser?.country ||
    "";

  const isInvoice =
    data.isInvoice === true ||
    Boolean(data.invoiceId) ||
    Boolean(data.invoiceNumber) ||
    String(data.type || "").toUpperCase() === "INVOICE";

  const isProject = data.isProject !== false && Boolean(data.projectNumber || data._id || data.id);

  const year = new Date(data.startDate || data.createdAt || Date.now()).getFullYear();

  let rawProjectNumber =
    data.refNumber ||
    data.quoteNumber ||
    data.projectNumber ||
    data.proposalNumber ||
    data.referenceNumber;

  if (isPlaceholderRefNumber(rawProjectNumber)) {
    if (data._id && typeof data._id === "string" && data._id.length >= 4) {
      rawProjectNumber = `SOC-${year}-${data._id.slice(-5).toUpperCase()}`;
    } else {
      rawProjectNumber = generateUniqueRefNumber("SOC", data.startDate || data.createdAt);
    }
  }

  rawProjectNumber = String(rawProjectNumber)
    .replace(/^INV-/i, "")
    .trim();

  // If already prefixed with letters (e.g. SOC-2026-12345) or starts with #, keep as is. Otherwise prefix #.
  const projectNumber =
    rawProjectNumber.startsWith("#") || /^[A-Za-z]/.test(rawProjectNumber)
      ? rawProjectNumber
      : `#${rawProjectNumber}`;

  if (!data.refNumber) {
    data.refNumber = rawProjectNumber;
  }

  const invoiceNumber =
    data.invoiceNumber ||
    data.invoiceId ||
    (isInvoice ? (rawProjectNumber ? `INV-${rawProjectNumber}` : "INV-001") : "");

  const invoiceId = data.invoiceId || invoiceNumber;

  let categoryName =
    data.categoryName ||
    data.calculatorSpecs?.categoryName ||
    data.serviceType ||
    "Website Development";

  const title =
    data.projectTitle ||
    data.title ||
    data.requirements?.projectTitle ||
    data.calculatorSpecs?.projectTitle ||
    `Project Proposal - ${categoryName}`;

  const status = (data.status || "Active").charAt(0).toUpperCase() + (data.status || "Active").slice(1).toLowerCase();

  const rawIssuedDate = data.startDate || data.createdAt || new Date();
  const issuedDateObj =
    rawIssuedDate instanceof Date ? rawIssuedDate : new Date(rawIssuedDate);
  const issuedDate = formatPdfDate(issuedDateObj);

  // Comprehensive timeline resolution
  let foundTimelineQuestion = "";
  let foundTimelineAnswer = "";

  // 1. Check breakdownItems (if passed from calculator page preview)
  if (Array.isArray(data.breakdownItems)) {
    const item = data.breakdownItems.find((b: any) => /timeline/i.test(b.question || ""));
    if (item && item.answers && item.answers.length > 0) {
      foundTimelineQuestion = item.question;
      foundTimelineAnswer = String(item.answers[0] || "");
    }
  }

  // 2. Check selections in calculatorSpecs or requirements
  const calculatorSpecs = data.calculatorSpecs || data.requirements || {};
  const rawSelections = calculatorSpecs.selections || data.selections || [];

  let timelineSelectionMetadata: { fee?: number; reduction?: number } | undefined;
  if (!foundTimelineAnswer && Array.isArray(rawSelections)) {
    const sel = rawSelections.find(
      (s: any) => /timeline/i.test(s.questionKey || "") || /timeline/i.test(s.questionText || "")
    );
    if (sel) {
      foundTimelineQuestion = sel.questionText || "What is your desired project timeline?";
      if (Array.isArray(sel.answerTexts) && sel.answerTexts.length > 0 && sel.answerTexts[0]) {
        foundTimelineAnswer = sel.answerTexts[0];
      } else if (Array.isArray(sel.answerKeys) && sel.answerKeys.length > 0 && sel.answerKeys[0]) {
        foundTimelineAnswer = sel.answerKeys[0];
        const tlKey = sel.answerKeys[0];
        if (sel.answerMetadata?.[tlKey]) {
          timelineSelectionMetadata = sel.answerMetadata[tlKey];
        }
      } else if (sel.textValue) {
        foundTimelineAnswer = String(sel.textValue);
      }
    }
  }

  // 3. Direct timeline properties
  const directTimeline =
    calculatorSpecs.estimatedTimeline ||
    data.estimatedTimeline ||
    data.timeline ||
    data.totalDuration ||
    calculatorSpecs.timeline ||
    data.duration ||
    (data.timelineInDays ? `${data.timelineInDays} Days` : "") ||
    "";

  let categoryKey = (data.categoryKey || calculatorSpecs.categoryKey || "").toLowerCase();
  const cLower = `${categoryName || ""} ${data.title || ""} ${calculatorSpecs.categoryName || ""} ${data.serviceType || ""}`.toLowerCase();
  if (!categoryKey && cLower) {
    if (cLower.includes("web") || cLower.includes("site") || cLower.includes("store") || cLower.includes("shop")) {
      categoryKey = "web";
    } else if (cLower.includes("graphic") || cLower.includes("design") || cLower.includes("logo") || cLower.includes("brand")) {
      categoryKey = "graphics";
    } else if (cLower.includes("seo") || cLower.includes("search engine")) {
      categoryKey = "seo";
    } else if (cLower.includes("market") || cLower.includes("social") || cLower.includes("campaign")) {
      categoryKey = "marketing";
    }
  }

  const isMarketing =
    categoryKey === "marketing" ||
    /market|campaign/i.test(categoryName || "") ||
    /market|campaign/i.test(title || "") ||
    /market|campaign/i.test(calculatorSpecs.categoryName || "");

  if (isMarketing) {
    categoryKey = "marketing";
  }

  // Baseline from item selections when API timeline not yet stored
  let graphicsRawTimelineDays = 0;
  let seoRawTimelineDays = 0;
  const selectionsMap: Record<string, CalculatorSelection> = Array.isArray(rawSelections)
    ? Object.fromEntries(
        rawSelections
          .filter((s: any) => s && s.questionKey)
          .map((s: any) => [
            s.questionKey,
            {
              questionKey: s.questionKey,
              answerKeys: Array.isArray(s.answerKeys) ? s.answerKeys : [],
              textValue: s.textValue,
              numericValue: s.numericValue,
            },
          ])
      )
    : {};

  if (categoryKey === "graphics" && Array.isArray(rawSelections)) {
    const itemsSel = rawSelections.find(
      (s: any) =>
        s.questionKey === "GD_ITEMS" ||
        s.questionKey === "GFX_ITEMS" ||
        /include in this project/i.test(s.questionText || "")
    );
    const tierSel = rawSelections.find(
      (s: any) => s.questionKey === "GD_TIER" || s.questionKey === "1"
    );
    const tier = tierSel?.answerKeys?.[0] || "standard";
    const pseudoQuestion = itemsSel
      ? {
          key: itemsSel.questionKey,
          answers: Array.isArray(itemsSel.answers)
            ? itemsSel.answers
            : (itemsSel.answerKeys || []).map((k: string) => ({
                key: k,
                metadata: itemsSel.answerMetadata?.[k],
              })),
        }
      : undefined;
    graphicsRawTimelineDays = calculateGraphicsRawTimelineDays(pseudoQuestion, selectionsMap, tier);
  } else if (categoryKey === "seo" && Array.isArray(rawSelections)) {
    const itemsSel = rawSelections.find(
      (s: any) => s.questionKey === "SEO_ITEMS" || s.questionKey === "2"
    );
    const tierSel = rawSelections.find(
      (s: any) => s.questionKey === "SEO_TIER" || s.questionKey === "1"
    );
    const tier = tierSel?.answerKeys?.[0] || "starter";
    const pseudoQuestion = itemsSel
      ? {
          key: itemsSel.questionKey,
          answers: Array.isArray(itemsSel.answers)
            ? itemsSel.answers
            : (itemsSel.answerKeys || []).map((k: string) => ({
                key: k,
                metadata: itemsSel.answerMetadata?.[k],
              })),
        }
      : undefined;
    seoRawTimelineDays = calculateSeoRawTimelineDays(pseudoQuestion, selectionsMap, tier);
  }

  let seoServiceMode: string | undefined =
    categoryKey === "seo" && Array.isArray(rawSelections)
      ? getSeoServiceMode(selectionsMap)
      : data.seoServiceMode;

  // Override seoServiceMode from billingType when:
  // - selections are absent/empty (e.g. PDF downloaded from calculator page, no stored selections)
  // - OR getSeoServiceMode returned the default "onetime" but billingType explicitly says "monthly"
  // This covers the SEO monthly calculator page download case.
  if (categoryKey === "seo") {
    const effectiveBillingType =
      data.billingType ||
      data.calculatorSpecs?.billingType ||
      data.requirements?.billingType;

    // Only override if selections didn't conclusively determine the mode
    // (i.e. empty selectionsMap or no SEO_TYPE selection found)
    const hasSeoTypeInSelections = selectionsMap["SEO_TYPE"] || selectionsMap["SEO_SERVICE_TYPE"];
    if (!hasSeoTypeInSelections) {
      if (effectiveBillingType === "monthly") {
        seoServiceMode = "monthly";
      } else if (effectiveBillingType === "onetime" || effectiveBillingType === "fixed") {
        seoServiceMode = seoServiceMode || "onetime";
      }
    }

    // Legacy fallback for stored docs that use calculatorSpecs.billingType
    if (!seoServiceMode) {
      if (data.calculatorSpecs?.billingType === "monthly") {
        seoServiceMode = "monthly";
      } else if (data.calculatorSpecs?.billingType === "onetime") {
        seoServiceMode = "onetime";
      }
    }
  }

  // Map known key codes to human readable labels
  const formatRawAnswer = (raw: string, metadata?: { fee?: number; reduction?: number }): string => {
    if (!raw) return "";
    const lower = raw.toLowerCase().trim();
    if (lower.startsWith("web_timeline_1") || lower === "timeline_14" || lower === "timeline_standard") {
      return "2 weeks (Normal): No extra fee";
    }
    if (lower.startsWith("web_timeline_2") || lower === "timeline_7" || lower === "timeline_rush") {
      return "1 week (Rushed): +25% rush fee";
    }
    if (lower.startsWith("web_timeline_3") || lower === "timeline_3" || lower === "timeline_super_rush") {
      return "3 - 4 days (Super Rushed): +50% rush fee";
    }
    if (
      lower.startsWith("gfx_time") ||
      lower.startsWith("gd_time") ||
      lower.startsWith("gfx_timeline") ||
      lower.startsWith("seo_time")
    ) {
      const baselineDays =
        lower.startsWith("seo_time") ? seoRawTimelineDays : graphicsRawTimelineDays;
      return resolveGraphicsTimelineAnswer(raw, {
        directTimeline: directTimeline,
        baselineDays,
        metadata,
      });
    }
    if (categoryKey === "graphics" && /timeline|rushed|normal/i.test(raw)) {
      return resolveGraphicsTimelineAnswer(raw, {
        directTimeline: directTimeline,
        baselineDays: graphicsRawTimelineDays,
        metadata,
      });
    }
    if (categoryKey === "seo" && /timeline|rushed|normal/i.test(raw)) {
      return resolveGraphicsTimelineAnswer(raw, {
        directTimeline: directTimeline,
        baselineDays: seoRawTimelineDays,
        metadata,
      });
    }
    return raw;
  };

  let finalTimelineAnswer =
    formatRawAnswer(foundTimelineAnswer, timelineSelectionMetadata) ||
    formatRawAnswer(directTimeline, timelineSelectionMetadata) ||
    directTimeline;

  // Clean duration for the summary box
  let duration = "";
  if (finalTimelineAnswer) {
    duration = finalTimelineAnswer
      .replace(/\s*\(.*?\)/g, "")
      .replace(/:\s*\+\d+%.*$/i, "")
      .replace(/:\s*No extra fee.*$/i, "")
      .replace(/:\s*.*$/, "")
      .trim();
  } else if (directTimeline) {
    duration = directTimeline
      .replace(/\s*\(.*?\)/g, "")
      .replace(/:\s*.*$/, "")
      .trim();
  }

  if (!duration) {
    if (categoryKey === "seo") {
      duration =
        seoServiceMode === "monthly"
          ? "Monthly Service"
          : directTimeline ||
            (seoRawTimelineDays > 0
              ? formatGraphicsTimelineLabel(snapGraphicsBaselineDays(seoRawTimelineDays))
              : "Monthly Service");
    } else if (categoryKey === "graphics") {
      duration =
        directTimeline ||
        (graphicsRawTimelineDays > 0
          ? formatGraphicsTimelineLabel(snapGraphicsBaselineDays(graphicsRawTimelineDays))
          : formatGraphicsTimelineLabel(14));
    } else if (categoryKey === "marketing" || isMarketing) duration = directTimeline || "Monthly";
    else duration = "2 weeks";
  }

  const baseIssuedDate =
    issuedDateObj instanceof Date && !isNaN(issuedDateObj.getTime())
      ? new Date(issuedDateObj.getTime())
      : new Date();

  // For proposals, there is no difference for monthly or one-time with "Valid Until" — proposals are valid for 3 months
  const defaultValidUntil = new Date(baseIssuedDate);
  defaultValidUntil.setMonth(defaultValidUntil.getMonth() + 3);

  const rawValidUntil =
    data.validUntil ||
    data.calculatorSpecs?.validUntil ||
    data.expirationDate ||
    data.calculatorSpecs?.expirationDate ||
    data.expires ||
    data.calculatorSpecs?.expires;

  let validUntilObj: Date;
  if (rawValidUntil) {
    const parsed = rawValidUntil instanceof Date ? rawValidUntil : new Date(rawValidUntil);
    validUntilObj = !isNaN(parsed.getTime()) ? parsed : defaultValidUntil;
  } else if (data.validUntilDays || data.calculatorSpecs?.validUntilDays) {
    const days = Number(data.validUntilDays || data.calculatorSpecs?.validUntilDays);
    validUntilObj = new Date(baseIssuedDate.getTime() + days * 24 * 60 * 60 * 1000);
  } else {
    validUntilObj = defaultValidUntil;
  }
  let validUntilDate = formatPdfDate(validUntilObj);
  

  const currency = (data.currency || "USD").toUpperCase();

  const rawTotalPrice = Number(
    data.totalPrice ??
    data.totalCost ??
    data.price ??
    data.amount ??
    data.total ??
    data.amountPaid ??
    0
  );

  const selectedOptions: Array<{ question: string; answers: string[] }> = [];
  const isCalculatorEstimatePdf =
    Array.isArray(data.breakdownItems) && data.breakdownItems.length > 0;

  // Case 1: If invoked directly with calculator page breakdownItems
  if (isCalculatorEstimatePdf) {
    data.breakdownItems.forEach((item: any) => {
      const qText = item.question || "";
      if (/timeline/i.test(qText) || /^category:?$/i.test(qText.trim())) return;
      selectedOptions.push({
        question: qText,
        answers: Array.isArray(item.answers) ? item.answers : [String(item.answers || "")],
      });
    });
  } else {
    // Case 2: From project / quote specs selections
    if (Array.isArray(rawSelections) && rawSelections.length > 0) {
      rawSelections.forEach((sel: any) => {
        const qText = sel.questionText || sel.questionKey || "";
        if (
          /timeline/i.test(sel.questionKey || "") ||
          /timeline/i.test(qText) ||
          /^category:?$/i.test(qText.trim()) ||
          sel.questionKey === "CATEGORY"
        ) {
          return;
        }
        let ansList: string[] = [];
        if (Array.isArray(sel.answerTexts) && sel.answerTexts.length > 0) {
          ansList = sel.answerTexts;
        } else if (Array.isArray(sel.answerKeys) && sel.answerKeys.length > 0) {
          ansList = sel.answerKeys;
        } else if (sel.textValue !== undefined && sel.textValue !== "") {
          ansList = [String(sel.textValue)];
        } else if (sel.numericValue !== undefined) {
          ansList = [String(sel.numericValue)];
        }
        if (ansList.length > 0) {
          selectedOptions.push({
            question: qText,
            answers: ansList,
          });
        }
      });
    }
  }

  // Helper to parse raw description strings if structured selections are missing
  const parseRawDescription = (rawDesc: string) => {
    if (!rawDesc || typeof rawDesc !== "string") return null;
    const lines = rawDesc.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed: Array<{ question: string; answers: string[] }> = [];
    let detectedCat: string | undefined = undefined;
    let detectedTimeline: string | undefined = undefined;

    for (const line of lines) {
      const projMatch = line.match(/^Project Type:\s*(.+)$/i);
      if (projMatch) {
        detectedCat = projMatch[1].trim();
        continue;
      }
      if (/^Selected Options:/i.test(line)) continue;

      if (line.startsWith("-") || line.startsWith("•") || line.startsWith("*")) {
        const cleanLine = line.replace(/^[\-\•\*]\s*/, "").trim();

        if (/rush fee/i.test(cleanLine) || /timeline/i.test(cleanLine)) {
          const durMatch = cleanLine.match(/\(([^)]+)\)/);
          if (durMatch) {
            detectedTimeline = durMatch[1].trim();
          }
          continue;
        }

        // Strip trailing price like ": $9600" or " - $9600" or ": $800.00"
        const withoutPrice = cleanLine
          .replace(/:\s*\$[\d,]+(\.\d+)?$/i, "")
          .replace(/\s*-\s*\$[\d,]+(\.\d+)?$/i, "")
          .trim();

        if (withoutPrice.includes("?")) {
          const qParts = withoutPrice.split("?");
          const question = (qParts[0] + "?").trim();
          let answer = qParts.slice(1).join("?").trim();
          answer = answer.replace(/^\((.+)\)$/, "$1").trim() || "Yes";
          parsed.push({ question, answers: [answer] });
        } else if (withoutPrice.includes(" (") && withoutPrice.endsWith(")")) {
          const lastParenIdx = withoutPrice.lastIndexOf(" (");
          const question = withoutPrice.substring(0, lastParenIdx).trim();
          const answer = withoutPrice.substring(lastParenIdx + 2, withoutPrice.length - 1).trim();
          const capAnswer = answer.charAt(0).toUpperCase() + answer.slice(1);
          parsed.push({ question, answers: [capAnswer] });
        } else {
          parsed.push({ question: withoutPrice, answers: ["Included"] });
        }
      }
    }
    return { parsed, detectedCat, detectedTimeline };
  };

  // Case 3: If selectedOptions is still empty, parse raw description or deliverableItems
  if (selectedOptions.length === 0) {
    const rawDesc = data.description || data.details || data.requirements?.description || "";
    const parsedResult = parseRawDescription(rawDesc);
    if (parsedResult && parsedResult.parsed.length > 0) {
      selectedOptions.push(...parsedResult.parsed);
      if (!categoryName && parsedResult.detectedCat) {
        categoryName = parsedResult.detectedCat;
      }
      if (parsedResult.detectedTimeline) {
        finalTimelineAnswer = formatRawAnswer(parsedResult.detectedTimeline);
        duration = parsedResult.detectedTimeline.replace(/\s*\(.*?\)/g, "").trim();
      }
    } else if (Array.isArray(data.deliverableItems) && data.deliverableItems.length > 0) {
      data.deliverableItems.forEach((item: any) => {
        const qTitle = item.description || item.title || item.name || "Deliverable";
        const ans = item.details || (item.duration ? (/\b(days?|weeks?|months?|years?)\b/i.test(String(item.duration)) ? String(item.duration).trim() : `${item.duration} ${item.unit || "Days"}`.trim()) : "Included");
        selectedOptions.push({
          question: qTitle,
          answers: [ans],
        });
      });
    }
  }

  const calculatorBreakdownIncludesTimeline =
    isCalculatorEstimatePdf &&
    Array.isArray(data.breakdownItems) &&
    data.breakdownItems.some((b: any) => /timeline/i.test(b.question || ""));

  const isMonthlyCategory =
    categoryKey === "marketing" ||
    isMarketing ||
    (categoryKey === "seo" &&
      (seoServiceMode === "monthly" ||
        data.billingType === "monthly" ||
        data.calculatorSpecs?.billingType === "monthly" ||
        data.requirements?.billingType === "monthly" ||
        /monthly/i.test(String(data.duration || "")) ||
        /monthly/i.test(String(duration || "")) ||
        (Array.isArray(rawSelections) &&
          rawSelections.some(
            (s: any) =>
              /monthly/i.test(String(s.questionKey || "")) ||
              s?.answerKeys?.some((k: string) => /monthly/i.test(k)) ||
              s?.answerTexts?.some((t: string) => /monthly/i.test(t))
          )) ||
        (Array.isArray(data.breakdownItems) &&
          data.breakdownItems.some(
            (b: any) =>
              /monthly/i.test(b.question || "") ||
              (Array.isArray(b.answers) && b.answers.some((a: string) => /monthly/i.test(a)))
          ))
      )) ||
    data.billingType === "monthly";

  if (isMonthlyCategory) {
    const withoutTimeline = selectedOptions.filter(
      (opt) => !/timeline|deadline|turnaround|desired.*timeline|how fast/i.test(opt.question)
    );
    selectedOptions.length = 0;
    selectedOptions.push(...withoutTimeline);
    if (!duration || duration === "2 weeks") {
      duration = "Monthly Service";
    }
  }

  // Ensure timeline question is displayed at the end of Selected Options ONLY for one-time/timeline-based categories
  if (
    !isMonthlyCategory &&
    (finalTimelineAnswer || duration) &&
    (!isCalculatorEstimatePdf || calculatorBreakdownIncludesTimeline)
  ) {
    const qLabel = foundTimelineQuestion ? foundTimelineQuestion.replace(/:$/, "").trim() : "What is your desired project timeline?";
    let answerText = finalTimelineAnswer || duration;
    if (
      !answerText.includes(":") &&
      !answerText.includes("Normal") &&
      !answerText.includes("Rushed") &&
      !answerText.toLowerCase().includes("month") &&
      !answerText.toLowerCase().includes("business")
    ) {
      const isSuper =
        /super/i.test(foundTimelineAnswer) ||
        /super/i.test(String(data.timeline || "")) ||
        (Array.isArray(rawSelections) &&
          rawSelections.some((s: any) =>
            s?.answerKeys?.some((k: string) => /super/i.test(k)) ||
            s?.answerTexts?.some((t: string) => /super/i.test(t))
          ));
      const isRush =
        !isSuper &&
        (/rush/i.test(foundTimelineAnswer) ||
          /rush/i.test(String(data.timeline || "")) ||
          (Array.isArray(rawSelections) &&
            rawSelections.some((s: any) =>
              s?.answerKeys?.some((k: string) => /rush/i.test(k)) ||
              s?.answerTexts?.some((t: string) => /rush/i.test(t))
            )));

      if (isSuper) {
        answerText = `${answerText} (Super Rushed): +50% rush fee`;
      } else if (isRush) {
        answerText = `${answerText} (Rushed): +25% rush fee`;
      } else {
        answerText = `${answerText} (Normal): No extra fee`;
      }
    }

    // Avoid duplicate timeline question
    const alreadyHasTimeline = selectedOptions.some(opt => /timeline/i.test(opt.question));
    if (!alreadyHasTimeline) {
      selectedOptions.push({
        question: qLabel,
        answers: [answerText],
      });
    }
  }

  const totalPrice = rawTotalPrice > 0 ? rawTotalPrice : Number(data.amountPaid || 0);

  let formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalPrice);

  const isOneTimeCategory =
    categoryKey === "web" ||
    categoryKey === "website" ||
    categoryKey === "ecommerce" ||
    categoryKey === "graphics" ||
    categoryKey === "mobile" ||
    categoryKey === "app" ||
    categoryKey === "custom" ||
    (categoryKey === "seo" && seoServiceMode === "onetime");

  const isMonthlyPricing =
    isMarketing ||
    (!isOneTimeCategory &&
      (isMonthlyBillingCategory(categoryKey, seoServiceMode || data.seoServiceMode) ||
        (data.billingType === "monthly" && (categoryKey === "marketing" || (categoryKey === "seo" && seoServiceMode === "monthly")))));

  if (isMonthlyPricing && !formattedPrice.endsWith("/month")) {
    formattedPrice = `${formattedPrice} /month`;
  }

  const scopeOverviewLead = isCalculatorEstimatePdf
    ? stripCalculatorHtml(getMainCalculatorCategory(categoryKey, categoryName))
    : "";

  let resolvedClientName = clientName;
  let resolvedClientEmail = clientEmail;
  let hideClientEmail = false;

  if (!resolvedClientName || resolvedClientName === "Client") {
    if (currentUser?.fullName) {
      resolvedClientName = currentUser.fullName;
    } else if (currentUser?.firstName) {
      resolvedClientName = `${currentUser.firstName} ${currentUser.lastName || ""}`.trim();
    } else {
      resolvedClientName = isCalculatorEstimatePdf ? "Sonu Dhiman" : "Guest User";
    }
  }

  if (!resolvedClientEmail && currentUser?.email) {
    resolvedClientEmail = currentUser.email;
  }
  if (!resolvedClientEmail || resolvedClientEmail === "contact@societywebsolutions.com") {
    if (isCalculatorEstimatePdf && !resolvedClientEmail) {
      resolvedClientEmail = "dhimans273@gmail.com";
      hideClientEmail = false;
    } else {
      hideClientEmail = true;
    }
  }

  // Sanitize description and subtitle to prevent dumping raw serialized choices
  const isRawDump = (str?: string): boolean => {
    if (!str) return false;
    return (
      /Selected Options:/i.test(str) ||
      /Project Type:/i.test(str) ||
      /Rush Fee/i.test(str) ||
      (/\- [A-Za-z0-9]/i.test(str) && /\$[\d,]+/i.test(str))
    );
  };

  const rawDesc =
    data.projectDescription ||
    data.description ||
    data.requirements?.projectDescription ||
    data.requirements?.description ||
    data.calculatorSpecs?.projectDescription ||
    "";
  const cleanSubtitle = isRawDump(data.subtitle) ? "" : (data.subtitle || "");
  const cleanDescription = isRawDump(rawDesc) ? "" : rawDesc;

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
  const rawSubtotal = data.subtotal !== undefined && Number(data.subtotal) > 0
    ? Number(data.subtotal)
    : (vatRate > 0 && totalPrice > 0 ? Math.round((totalPrice / (1 + vatRate / 100)) * 100) / 100 : totalPrice);
  const vatAmount = data.vatAmount !== undefined && Number(data.vatAmount) > 0
    ? Number(data.vatAmount)
    : (vatRate > 0 && rawSubtotal > 0 ? Math.round((rawSubtotal * (vatRate / 100)) * 100) / 100 : 0);

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

  const rawAmountPaid = Number(data.amountPaid || 0);
  const amountPaid = rawAmountPaid > 0 ? rawAmountPaid : 0;
  const pendingBalance = Math.max(0, Math.round((totalPrice - amountPaid) * 100) / 100);

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

  return {
    rawProjectNumber,
    projectNumber,
    title,
    clientEmail: resolvedClientEmail,
    clientName: resolvedClientName,
    hideClientEmail,
    status,
    issuedDate,
    validUntilDate,
    categoryName,
    subtitle: cleanSubtitle,
    scopeOverviewLead,
    description: cleanDescription,
    selectedOptions,
    duration,
    totalPrice,
    currency,
    formattedPrice,
    subtotal: rawSubtotal,
    vatRate,
    vatAmount,
    formattedSubtotal,
    formattedVatAmount,
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
    amountPaid,
    pendingBalance,
    formattedAmountPaid,
    formattedPendingBalance,
  };
}

const LOGO_SVG = `<img width="158" height="50" src="/images/logo.svg" style="display: block;" alt="Society Logo" />`;

function renderSelectedOptionsList(options: Array<{ question: string; answers: string[] }>, isFirstPage: boolean = true): string {
  if (!options.length) return "";
  const marginTop = isFirstPage ? "20px" : "0px";
  return `
    <div style="display: flex; flex-direction: column; gap: 15px; margin-top: ${marginTop}; margin-bottom: 20px;">
      ${options
        .map((opt) => {
          let cleanQuestion = opt.question.trim();
          // Remove any colon after question mark (e.g. "?:" -> "?")
          cleanQuestion = cleanQuestion.replace(/\?\s*:\s*$/, "?").trim();

          // Do NOT add ":" after questions ending in "?"
          // Only ensure ":" for statements like "Describe your..." if missing
          if (/^(Describe your|Tell us|Share with us|Please provide)/i.test(cleanQuestion)) {
            if (/\(Optional\)$/i.test(cleanQuestion) && !/:\s*\(Optional\)$/i.test(cleanQuestion)) {
              cleanQuestion = cleanQuestion.replace(/\s*\(Optional\)$/i, ": (Optional)");
            } else if (!cleanQuestion.endsWith(":") && !/\(Optional\)$/i.test(cleanQuestion)) {
              cleanQuestion = cleanQuestion + ":";
            }
          }
          const hasMultiple = opt.answers.length > 1;
          return `
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
              <div style="font-family: Inter, sans-serif; font-weight: 700; font-size: 13px; line-height: 1.4; color: #0F172A; margin: 0 0 4px 0;">${cleanQuestion}</div>
              ${hasMultiple
                ? `<ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 3px;">
                    ${opt.answers
                      .map((ans) => `<li style="font-family: Inter, sans-serif; font-weight: 400; font-size: 12.5px; line-height: 1.5; color: #475569; position: relative; padding-left: 14px;"><span style="position: absolute; left: 0; color: #64748B;">•</span>${ans.replace(/^[•\-\*]\s*/, "")}</li>`)
                      .join("")}
                  </ul>`
                : `<div style="font-family: Inter, sans-serif; font-weight: 400; font-size: 12.5px; line-height: 1.5; color: #475569; margin: 0;">${opt.answers[0] || "Included"}</div>`
              }
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderSummaryCard(d: CalculatorPDFData): string {
  const hasVat =
    typeof d.vatRate === "number" &&
    d.vatRate > 0 &&
    typeof d.vatAmount === "number" &&
    d.vatAmount > 0;
  return `
    <div style="margin-top: 18px; width: 100%; display: flex; justify-content: flex-end;">
      <div style="width: 380px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #1E293B;">
        <!-- Timeline Row -->
        <div style="background-color: #0B1220; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 42px;">
          <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">ESTIMATED TIMELINE</span>
          <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 14px; color: #FFFFFF; white-space: nowrap; position: relative; top: -1.5px; line-height: 1;">${d.duration}</span>
        </div>
        ${
          hasVat
            ? `
        <!-- Subtotal Row -->
        <div style="background-color: #0B1220; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 42px; border-top: 1px solid #1E293B;">
          <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">SUBTOTAL</span>
          <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 14px; color: #FFFFFF; white-space: nowrap; position: relative; top: -1.5px; line-height: 1;">${d.formattedSubtotal}</span>
        </div>
        <!-- VAT Row -->
        <div style="background-color: #0B1220; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 42px; border-top: 1px solid #1E293B;">
          <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">VAT (${d.vatRate}%)</span>
          <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 14px; color: #FFFFFF; white-space: nowrap; position: relative; top: -1.5px; line-height: 1;">${d.formattedVatAmount}</span>
        </div>
        `
            : ""
        }
        <!-- Investment / Invoice Total Row -->
        <div style="background-color: #2A2AA0; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 58px; ${hasVat ? "border-top: 1px solid #3E3EE8;" : ""}">
          <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 11.5px; letter-spacing: 0.06em; color: #FFFFFF; text-transform: uppercase; white-space: nowrap;">${d.isInvoice ? "INVOICE TOTAL" : d.isProject ? "INVESTMENT TOTAL" : "TOTAL COST"}</span>
          <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 20px; color: #FFFFFF; white-space: nowrap; margin-left: 16px; position: relative; top: -2px; line-height: 1;">${d.formattedPrice}</span>
        </div>
      </div>
    </div>
  `;
}

function renderFooterOnly(): string {
  return `
    <footer style="width: 100%; margin-top: auto; padding-top: 14px;">
      <!-- Divider Line -->
      <div style="border-top: 1px solid #E5E7EB; margin-bottom: 10px; width: 100%;"></div>

      <!-- Footer (Centered) -->
      <div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 3px; padding-bottom: 2px;">
        <p style="font-family: Inter, sans-serif; font-weight: 400; font-size: 9.5px; line-height: 1.4; color: #94A3B8; margin: 0;">Acceptance of this quote binds the client to the agreed delivery timeline and total investment.</p>
        <p style="font-family: Inter, sans-serif; font-weight: 400; font-size: 9.5px; line-height: 1.4; color: #94A3B8; margin: 0;">Note: Time spent waiting for client replies does not count towards project deadlines.</p>
        <p style="font-family: Inter, sans-serif; font-weight: 400; font-size: 9.5px; line-height: 1.4; color: #94A3B8; margin: 0;">For inquiries, please reach out to <span style="font-weight: 600; color: #64748B;">contact@societywebsolutions.com</span></p>
        <div style="margin-top: 8px; text-align: center;">
          <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 10.5px; letter-spacing: 0.14em; color: #CBD5E1; text-transform: uppercase;">SOCIETY WEB SOLUTIONS</span>
        </div>
      </div>
    </footer>
  `;
}

function renderPreparedForClientBlock(d: CalculatorPDFData): string {
  const addressParts = [d.streetAddress, d.city, d.state, d.zipCode, d.country].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : "";

  const emailLine =
    d.clientEmail && !d.hideClientEmail
      ? `<div style="font-family: Inter, sans-serif; font-weight: 400; font-size: 12px; line-height: 1.4; color: #64748B;">${d.clientEmail}</div>`
      : "";

  return `
    <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
      <div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 10.5px; letter-spacing: 0.08em; color: #94A3B8; text-transform: uppercase; margin: 0 0 8px 0;">${d.isInvoice ? "BILLED TO" : d.isProject ? "CLIENT" : "PREPARED FOR"}</div>
      <div style="font-family: Inter, sans-serif; font-weight: 700; font-size: 15px; line-height: 1.35; color: #0F172A; margin: 0 0 4px 0;">${d.clientName}</div>
      ${d.companyName ? `<div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 12.5px; line-height: 1.4; color: #1E293B; margin-bottom: 3px;">${d.companyName}</div>` : ""}
      ${d.registrationNumber ? `<div style="font-family: Inter, sans-serif; font-size: 11.5px; line-height: 1.4; color: #64748B; margin-bottom: 3px;">Reg: ${d.registrationNumber}</div>` : ""}
      ${d.vatNumber ? `<div style="font-family: Inter, sans-serif; font-size: 11.5px; line-height: 1.4; color: #64748B; margin-bottom: 3px;">VAT / Tax ID: ${d.vatNumber}</div>` : ""}
      ${fullAddress ? `<div style="font-family: Inter, sans-serif; font-weight: 400; font-size: 12px; line-height: 1.4; color: #64748B; margin-bottom: 3px;">${fullAddress}</div>` : ""}
      ${emailLine}
      ${d.phoneNumber ? `<div style="font-family: Inter, sans-serif; font-weight: 400; font-size: 12px; line-height: 1.4; color: #64748B;">${d.phoneNumber}</div>` : ""}
    </div>
  `;
}

function estimateOptionHeight(opt: { question: string; answers: string[] }): number {
  const cleanQ = (opt.question || "").trim();
  const qLines = Math.max(1, Math.ceil(cleanQ.length / 55));
  const qHeight = qLines * 18 + 4;

  const answers = opt.answers || [];
  let aHeight = 0;
  if (answers.length <= 1) {
    const text = answers[0] || "Included";
    const aLines = Math.max(1, Math.ceil(text.length / 65));
    aHeight = aLines * 18;
  } else {
    aHeight = answers.reduce((sum: number, a: string) => {
      const lines = Math.max(1, Math.ceil(a.length / 60));
      return sum + lines * 18 + 3;
    }, 0);
  }

  return qHeight + aHeight + 15;
}

interface PDFPageItem {
  pageOptions: Array<{ question: string; answers: string[] }>;
  hasSummaryCard: boolean;
}

function paginateCalculatorPDF(
  options: Array<{ question: string; answers: string[] }>,
  hasVat: boolean
): PDFPageItem[] {
  if (!options || options.length === 0) {
    return [{ pageOptions: [], hasSummaryCard: true }];
  }

  const heights = options.map(estimateOptionHeight);
  const totalOptionsHeight = heights.reduce((sum: number, h: number) => sum + h, 0);

  // Exact component heights
  const summaryCardHeight = hasVat ? 215 : 135;
  const footerHeight = 95;
  const bottomBlockHeight = summaryCardHeight + footerHeight; // ~310px with VAT, ~230px no VAT

  // Maximum content heights for options:
  // Printable area: 1123px - 64px(top) - 48px(bottom) = 1011px.
  // Page 1 header overhead is ~230px.
  const page1MaxOptionsSinglePage = 1011 - 230 - bottomBlockHeight - 20; // ~451px with VAT, ~531px no VAT
  const page1MaxOptionsOnly = 1011 - 230 - 30; // ~751px

  // Subsequent pages have 0px header overhead.
  const subsequentMaxOptionsWithSummaryAndFooter = 1011 - bottomBlockHeight - 30; // ~671px with VAT, ~751px no VAT
  const subsequentMaxOptionsOnly = 1011 - 40; // ~971px

  // Case 1: Everything fits comfortably on Page 1 (1-page PDF)
  if (totalOptionsHeight <= page1MaxOptionsSinglePage) {
    return [{ pageOptions: options, hasSummaryCard: true }];
  }

  // Case 2: Multi-page document needed. Fill each page to maximum capacity.
  const pages: PDFPageItem[] = [];
  let currentOptions: Array<{ question: string; answers: string[] }> = [];
  let currentHeight = 0;
  let isPage1 = true;

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const h = heights[i];
    const capacity = isPage1 ? page1MaxOptionsOnly : subsequentMaxOptionsOnly;

    if (currentOptions.length > 0 && currentHeight + h > capacity) {
      pages.push({ pageOptions: currentOptions, hasSummaryCard: false });
      currentOptions = [opt];
      currentHeight = h;
      isPage1 = false;
    } else {
      currentOptions.push(opt);
      currentHeight += h;
    }
  }

  // Determine summary card placement for the final page:
  const isSinglePageOfOptions = pages.length === 0;

  if (isSinglePageOfOptions) {
    // All options fit on Page 1, but adding Summary Card + Footer overflows Page 1.
    // Page 1 keeps ALL options, and Page 2 gets the Summary Card + Footer.
    pages.push({ pageOptions: currentOptions, hasSummaryCard: false });
    pages.push({ pageOptions: [], hasSummaryCard: true });
  } else {
    // Multiple pages of options: check if the remaining options on the last page fit with the summary card
    if (currentHeight <= subsequentMaxOptionsWithSummaryAndFooter) {
      pages.push({ pageOptions: currentOptions, hasSummaryCard: true });
    } else {
      pages.push({ pageOptions: currentOptions, hasSummaryCard: false });
      pages.push({ pageOptions: [], hasSummaryCard: true });
    }
  }

  return pages;
}

export function getCalculatorProjectHTML(d: CalculatorPDFData): string {
  const options = d.selectedOptions || [];
  const hasVat =
    typeof d.vatRate === "number" &&
    d.vatRate > 0 &&
    typeof d.vatAmount === "number" &&
    d.vatAmount > 0;
  const pages = paginateCalculatorPDF(options, hasVat);
  const totalPages = pages.length;

  return pages
    .map((pageData, index) => {
      const pageNum = index + 1;
      const isFirstPage = pageNum === 1;
      const isLastPage = pageNum === totalPages;
      const pageOptions = pageData.pageOptions;
      const hasSummary = pageData.hasSummaryCard;

      return `
    <div class="pdf-page" style="
      width: 794px;
      height: 1123px;
      min-height: 1123px;
      max-height: 1123px;
      box-sizing: border-box;
      background-color: #FFFFFF;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #202124;
      padding: 64px 78px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      page-break-after: ${isLastPage ? "auto" : "always"};
      break-after: ${isLastPage ? "auto" : "page"};
    ">
      <div style="width: 100%; display: flex; flex-direction: column; flex: 1;">
        ${
          isFirstPage
            ? `
        <!-- ── Main Header ── -->
        <header style="width: 100%; display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; margin: 0; padding: 0; box-sizing: border-box;">
          <div class="header-logo" style="display: flex; flex-direction: column; align-items: flex-start; margin: 0; padding-top: 10px;">
            ${LOGO_SVG}
          </div>
          <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; margin: 0; padding: 0; white-space: nowrap;">
            <div style="font-family: Inter, sans-serif; font-weight: 700; font-size: 22px; letter-spacing: -0.01em; color: #2A2AA0; margin: 0 0 10px 0; line-height: 1; padding: 0;">${d.isInvoice ? "INVOICE" : d.isProject ? "PROJECT DETAILS" : "PROJECT QUOTE"}</div>
            <div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 13.5px; line-height: 1.3; color: #1E293B; margin-bottom: 3px;">Society Web Solutions</div>
            <div style="font-family: Inter, sans-serif; font-weight: 400; font-size: 12px; line-height: 1.45; color: #64748B;">1645 Palm Beach Lakes Blvd</div>
            <div style="font-family: Inter, sans-serif; font-weight: 400; font-size: 12px; line-height: 1.45; color: #64748B; margin-bottom: 2px;">West Palm Beach, FL, US</div>
            <div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 12px; line-height: 1.45; color: #2A2AA0;">
              contact@societywebsolutions.com
            </div>
          </div>
        </header>

        <!-- ── Quote / Invoice Details Card ── -->
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
          gap: 20px;
        ">
          <!-- Prepared For / Client / Billed To -->
          ${renderPreparedForClientBlock(d)}

          <!-- Quote Details / Project Details / Invoice Details -->
          <div style="width: 250px; flex-shrink: 0; display: flex; flex-direction: column;">
            <div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 10.5px; letter-spacing: 0.08em; color: #94A3B8; text-transform: uppercase; margin: 0 0 8px 0;">${d.isInvoice ? "INVOICE DETAILS" : d.isProject ? "PROJECT SUMMARY" : "QUOTE DETAILS"}</div>
            ${
              d.isInvoice
                ? `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; line-height: 1.4;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Invoice ID:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 12px; color: #0F172A;">${d.invoiceNumber || d.invoiceId || d.projectNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; line-height: 1.4;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Issued Date:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 600; font-size: 12px; color: #0F172A;">${d.issuedDate}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; line-height: 1.4;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Due Date:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 600; font-size: 12px; color: #0F172A;">${d.validUntilDate || "Upon Receipt"}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; line-height: 1.4;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Status:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 12px; color: #0F172A;">${d.amountPaid && d.amountPaid >= d.totalPrice && d.totalPrice > 0 ? "PAID" : d.amountPaid && d.amountPaid > 0 ? "PARTIALLY PAID" : "DUE"}</span>
            </div>
            `
                : d.isProject
                ? `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; line-height: 1.4;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Project ID:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 12px; color: #0F172A;">${d.projectNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; line-height: 1.4;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Submitted:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 600; font-size: 12px; color: #0F172A;">${d.issuedDate}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; line-height: 1.4;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Est. Deadline:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 12px; color: #13663A;">${d.duration}</span>
            </div>
            `
                : `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; line-height: 1.4;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Ref Number:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 700; font-size: 12px; color: #0F172A;">${d.projectNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; line-height: 1.4;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Issued On:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 600; font-size: 12px; color: #0F172A;">${d.issuedDate}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; line-height: 1.4;">
              <span style="font-family: Inter, sans-serif; font-weight: 500; font-size: 12px; color: #64748B;">Valid Until:</span>
              <span style="font-family: Inter, sans-serif; font-weight: 600; font-size: 12px; color: #0F172A;">${d.validUntilDate}</span>
            </div>
            `
            }
          </div>
        </section>

        ${
          d.scopeOverviewLead || d.subtitle
            ? `
        <!-- ── Subtitle / Scope Overview ── -->
        <div style="margin-top: 18px; margin-bottom: 12px;">
          <div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 13px; color: #2A2AA0;">${d.scopeOverviewLead || d.subtitle}</div>
        </div>`
            : `<div style="margin-top: 18px;"></div>`
        }
        `
            : ""
        }

        <!-- ── Scope Questions for this page ── -->
        ${renderSelectedOptionsList(pageOptions, isFirstPage)}

        <!-- ── Summary Box (Payment Total) ── -->
        ${hasSummary ? renderSummaryCard(d) : ""}
      </div>

      <!-- ── Footer (Always bottom of the last page) ── -->
      ${isLastPage ? renderFooterOnly() : ""}
    </div>
    `;
    })
    .join("\n");
}

function appendCanvasToPdf(
  pdf: any,
  canvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number
): void {
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  // Single page element (standard case for all paginated pages)
  // Allow up to 35pt margin of error (subpixel rendering) without adding an empty second page
  if (imgHeight <= pageHeight + 35) {
    pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
    return;
  }

  // Multi-page fallback if an element is unexpectedly taller than 1 page
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight, undefined, "FAST");
  heightLeft -= pageHeight;

  while (heightLeft > 50) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;
  }
}

function loadScript(src: string): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") return Promise.resolve();

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

async function ensurePdfLibraries(): Promise<{ html2canvasLib: any; jsPdfLib: any }> {
  if (typeof window === "undefined") {
    throw new Error("Window is not available");
  }

  if (!(window as any).html2canvas) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
  }

  if (!(window as any).jspdf) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  }

  let tries = 0;
  while ((!(window as any).html2canvas || !(window as any).jspdf) && tries < 25) {
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

/**
 * Saves the final HTML that will be rendered by html2canvas as a downloadable
 * .html file. Only active in development mode — gives you a browser-openable
 * snapshot to debug fonts, spacing, and layout without going through html2canvas.
 */
function saveHtmlSnapshot(html: string, projectNumber: string): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "development") return;

  const cleanNum = (projectNumber || "preview").replace(/[^a-zA-Z0-9-_#]/g, "") || "preview";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `pdf_snapshot_${cleanNum}_${timestamp}.html`;

  const fullDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=794px, initial-scale=1" />
  <title>PDF Snapshot ${cleanNum}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 0; background: #e5e7eb; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased; }
    .pdf-page { margin: 24px auto; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
    .header-logo {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <!-- PDF Snapshot: ${new Date().toLocaleString()} | Project ${cleanNum} -->
  <!-- Open in browser to inspect layout at 794px width (A4 pdf render width) -->
  <div style="width:794px;background:#fff;">
    ${html}
  </div>
</body>
</html>`;

  const blob = new Blob([fullDoc], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    if (document.body.contains(a)) document.body.removeChild(a);
  }, 1000);

  console.info(`[PDF Debug] HTML snapshot saved: ${filename}`);
}

export async function downloadCalculatorProjectPDF(data: any): Promise<void> {
  if (typeof window === "undefined") return;

  const d = extractCalculatorPDFData(data);

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
    const pdfHtml = getCalculatorProjectHTML(d);
    saveHtmlSnapshot(pdfHtml, d.rawProjectNumber);
    container.innerHTML = pdfHtml;

    document.body.appendChild(container);

    // Wait for fonts and layout rendering
    if ((document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 200));

    try {
      const pageElements = container.querySelectorAll(".pdf-page");
      const pdf = new jsPdfLib("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i] as HTMLElement;
        const captureHeight = pageEl.scrollHeight;
        const canvas = await html2canvasLib(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 794,
          width: 794,
          height: captureHeight,
          windowHeight: captureHeight,
          scrollY: 0,
          scrollX: 0,
        });

        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          continue;
        }

        if (i > 0) {
          pdf.addPage();
        }

        appendCanvasToPdf(pdf, canvas, pageWidth, pageHeight);
      }

      const cleanNum = d.rawProjectNumber.replace(/[^a-zA-Z0-9-_]/g, "") || "1";
      const prefix = d.isInvoice ? "Invoice" : d.isProject ? "Project_Details" : "Project_Proposal";
      const filename = `${prefix}_${cleanNum}.pdf`;
      pdf.save(filename);
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  } catch (err) {
    console.warn("Calculator direct PDF generation fallback to print:", err);
    printCalculatorProjectPDF(data);
  }
}

export async function generateCalculatorProjectPDFBase64(data: any): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Window is not available");
  }

  const d = extractCalculatorPDFData(data);
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
  const pdfHtmlB64 = getCalculatorProjectHTML(d);
  saveHtmlSnapshot(pdfHtmlB64, d.rawProjectNumber);
  container.innerHTML = pdfHtmlB64;

  document.body.appendChild(container);

  // Wait 150ms for layout and font rendering
  await new Promise((r) => setTimeout(r, 150));

  try {
    const pageElements = container.querySelectorAll(".pdf-page");
    const pdf = new jsPdfLib("p", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i] as HTMLElement;
      const captureHeight = pageEl.scrollHeight;
      const canvas = await html2canvasLib(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        width: 794,
        height: captureHeight,
        windowHeight: captureHeight,
        scrollY: 0,
        scrollX: 0,
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        continue;
      }

      if (i > 0) {
        pdf.addPage();
      }

      appendCanvasToPdf(pdf, canvas, pageWidth, pageHeight);
    }

    return pdf.output("datauristring");
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export function printCalculatorProjectPDF(data: any): void {
  if (typeof window === "undefined") return;

  const d = extractCalculatorPDFData(data);
  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Project Proposal - ${d.projectNumber}</title>
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
        ${getCalculatorProjectHTML(d)}
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
