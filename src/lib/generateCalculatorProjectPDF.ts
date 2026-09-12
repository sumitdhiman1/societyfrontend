import { authService } from "./authService";
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
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
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
  [key: string]: any;
}

export function extractCalculatorPDFData(data: any): CalculatorPDFData {
  const currentUser = authService.getUser();
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

  let rawProjectNumber =
    data.refNumber ||
    data.quoteNumber ||
    data.projectNumber ||
    (data._id ? `1` : "1");
  rawProjectNumber = String(rawProjectNumber).replace(/^INV-/i, "");
  const projectNumber = rawProjectNumber.startsWith("#") ? rawProjectNumber : `#${rawProjectNumber}`;

  let categoryName =
    data.categoryName ||
    data.calculatorSpecs?.categoryName ||
    data.serviceType ||
    "Website Development";

  const title =
    data.title ||
    `Project Proposal - ${categoryName}`;

  const status = (data.status || "Active").charAt(0).toUpperCase() + (data.status || "Active").slice(1).toLowerCase();

  const issuedDateObj = data.startDate || data.createdAt || new Date();
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

  const categoryKey = data.categoryKey || calculatorSpecs.categoryKey || "";

  // Baseline from item selections when API timeline not yet stored
  let graphicsRawTimelineDays = 0;
  let seoRawTimelineDays = 0;
  if (categoryKey === "graphics" && Array.isArray(rawSelections)) {
    const itemsSel = rawSelections.find(
      (s: any) =>
        s.questionKey === "GD_ITEMS" ||
        s.questionKey === "GFX_ITEMS" ||
        /include in this project/i.test(s.questionText || "")
    );
    const tierSel = rawSelections.find(
      (s: any) => s.questionKey === "GD_TIER" || s.questionKey === "GFX_TIER"
    );
    const tierKey = tierSel?.answerKeys?.[0] || "starter";
    const tier =
      /premium/i.test(tierKey) ? "premium" : /standard/i.test(tierKey) ? "standard" : "starter";
    if (itemsSel?.answerKeys?.length) {
      const pseudoQuestion = {
        key: itemsSel.questionKey,
        answers: itemsSel.answerKeys.map((k: string) => {
          const meta = itemsSel.answerMetadata?.[k];
          return { key: k, metadata: meta };
        }),
      };
      graphicsRawTimelineDays = calculateGraphicsRawTimelineDays(
        pseudoQuestion,
        { [itemsSel.questionKey]: { questionKey: itemsSel.questionKey, answerKeys: itemsSel.answerKeys } },
        tier
      );
    }
  }
  if (categoryKey === "seo" && Array.isArray(rawSelections)) {
    const itemsSel = rawSelections.find(
      (s: any) => s.questionKey === "SEO_ITEMS" || s.questionKey === "2"
    );
    const tierSel = rawSelections.find(
      (s: any) => s.questionKey === "SEO_TIER" || s.questionKey === "1"
    );
    const tierKey = tierSel?.answerKeys?.[0] || "starter";
    const tier =
      /premium/i.test(tierKey) ? "premium" : /standard/i.test(tierKey) ? "standard" : "starter";
    if (itemsSel?.answerKeys?.length) {
      const pseudoQuestion = {
        key: itemsSel.questionKey,
        answers: itemsSel.answerKeys.map((k: string) => {
          const meta = itemsSel.answerMetadata?.[k];
          return { key: k, metadata: meta };
        }),
      };
      seoRawTimelineDays = calculateSeoRawTimelineDays(
        pseudoQuestion,
        { [itemsSel.questionKey]: { questionKey: itemsSel.questionKey, answerKeys: itemsSel.answerKeys } },
        tier
      );
    }
  }

  let seoServiceMode: string | undefined =
    categoryKey === "seo" && Array.isArray(rawSelections)
      ? getSeoServiceMode(
          Object.fromEntries(
            rawSelections
              .filter((s: any) => /SEO_TYPE|SEO_SERVICE_TYPE|^0$/.test(s.questionKey || ""))
              .map((s: any) => [s.questionKey, { questionKey: s.questionKey, answerKeys: s.answerKeys || [] }])
          )
        )
      : data.seoServiceMode;

  if (categoryKey === "seo" && data.billingType === "monthly") {
    seoServiceMode = "monthly";
  } else if (categoryKey === "seo" && data.billingType === "onetime") {
    seoServiceMode = "onetime";
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
    (directTimeline && (categoryKey === "graphics" || categoryKey === "seo")
      ? directTimeline
      : formatRawAnswer(directTimeline)) ||
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
    } else if (categoryKey === "marketing") duration = "Ongoing";
    else duration = "2 weeks";
  }

  // Calculate delivery deadline / valid until date using identical project calculation
  const estimatedDeadlineObj =
    getProjectEstimatedDeadline(data) ||
    (data.deadline ? new Date(data.deadline) : null) ||
    (data.validUntil ? new Date(data.validUntil) : null);

  let validUntilDate = "";
  if (estimatedDeadlineObj && !isNaN(estimatedDeadlineObj.getTime())) {
    validUntilDate = formatPdfDate(estimatedDeadlineObj);
  } else {
    const days =
      parseDurationToDays(duration) ||
      parseDurationToDays(finalTimelineAnswer) ||
      parseDurationToDays(directTimeline) ||
      14;
    const validUntilObj = new Date(issuedDateObj);
    validUntilObj.setDate(validUntilObj.getDate() + days);
    validUntilDate = formatPdfDate(validUntilObj);
  }

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
      if (/timeline/i.test(qText)) return;
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
        if (/timeline/i.test(sel.questionKey || "") || /timeline/i.test(qText)) {
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
        const ans = item.details || (item.duration ? `${item.duration} ${item.unit || "Days"}`.trim() : "Included");
        selectedOptions.push({
          question: qTitle,
          answers: [ans],
        });
      });
    }
  }

  const calculatorBreakdownIncludesTimeline =
    isCalculatorEstimatePdf &&
    data.breakdownItems.some((b: any) => /timeline/i.test(b.question || ""));

  const isMonthlySeoCalculatorPdf =
    isCalculatorEstimatePdf &&
    categoryKey === "seo" &&
    (data.billingType === "monthly" || seoServiceMode === "monthly");

  if (isMonthlySeoCalculatorPdf) {
    const withoutTimeline = selectedOptions.filter((opt) => !/timeline/i.test(opt.question));
    selectedOptions.length = 0;
    selectedOptions.push(...withoutTimeline);
  }

  // Ensure timeline question is consistently displayed at the end of Selected Options
  if (
    !isMonthlySeoCalculatorPdf &&
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
      answerText = `${answerText} (Normal): No extra fee`;
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

  const isMonthlyPricing =
    data.billingType === "monthly" ||
    isMonthlyBillingCategory(categoryKey, seoServiceMode || data.seoServiceMode);

  if (isMonthlyPricing) {
    formattedPrice = `${formattedPrice} /month`;
  }

  const scopeOverviewLead = isCalculatorEstimatePdf
    ? stripCalculatorHtml(getMainCalculatorCategory(categoryKey, categoryName))
    : "";

  let resolvedClientName = clientName;
  let resolvedClientEmail = clientEmail;
  let hideClientEmail = false;
  if (isCalculatorEstimatePdf) {
    resolvedClientName = "Guest User";
    resolvedClientEmail = "";
    hideClientEmail = true;
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

  const cleanSubtitle = isRawDump(data.subtitle) ? "" : (data.subtitle || "");
  const cleanDescription = isRawDump(data.description) ? "" : (data.description || "");

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
  };
}

const LOGO_SVG = `
  <svg width="158" height="50" viewBox="0 0 328 104" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M302.37 36.0782V59.0177H289.949V35.8689L289.904 35.6389L269.662 0.11843H284.08L296.321 21.6477L308.589 0.19537H323L302.37 36.0782ZM254.089 13.1244V59.0177H241.667V13.1363H223.953V0.11843H262.993L270.396 13.0903L254.089 13.1244ZM190.505 23.0913L213.078 23.0439V36.0684L190.505 36.088V45.8855L218.806 45.8438V58.8688H178.082V0.11843H218.862L218.912 13.0867H190.505V23.0919V23.0913ZM160.115 0.172894H172.398V58.7203H160.115V0.172894ZM130.702 45.8139C133.477 45.8145 136.201 45.0374 138.592 43.5634C140.983 42.0895 142.954 39.9722 144.3 37.4313L155.368 43.8642C152.953 48.393 149.438 52.1724 145.179 54.8195C140.92 57.4665 136.069 58.8872 131.117 58.9373C126.165 58.9875 121.289 57.6655 116.982 55.1052C112.675 52.5449 109.091 48.8374 106.592 44.3584C110.319 34.8523 110.319 24.1904 106.592 14.6843C109.087 10.2125 112.664 6.50959 116.962 3.94966C121.26 1.38973 126.127 0.0634676 131.071 0.104885C136.015 0.146302 140.861 1.55393 145.119 4.18555C149.378 6.81716 152.898 10.5795 155.323 15.0925L144.274 21.5644C142.937 19.0605 140.992 16.9711 138.636 15.5074C136.28 14.0438 133.597 13.2578 130.858 13.229C128.119 13.2002 125.421 13.9296 123.037 15.3434C120.654 16.7573 118.669 18.8054 117.284 21.2807C115.898 23.7559 115.162 26.5705 115.148 29.4397C115.134 32.309 115.844 35.1311 117.206 37.6208C118.568 40.1104 120.533 42.1791 122.903 43.6178C125.273 45.0565 127.963 45.8141 130.702 45.8139ZM98.2957 61.9676C98.5473 62.4245 98.6155 62.9672 98.4854 63.4768C98.3552 63.9863 98.0373 64.4209 97.6015 64.685L95.8762 65.729C95.6603 65.8596 95.422 65.9443 95.1749 65.9783C94.9277 66.0124 94.6766 65.9951 94.4359 65.9274C94.1951 65.8597 93.9695 65.743 93.7718 65.584C93.5742 65.4249 93.4083 65.2266 93.2839 65.0003L86.8545 53.3268L80.0359 64.6402L74.1562 24.074L104.653 49.7417L91.838 50.242L98.2957 61.9676ZM97.2588 41.5461C97.9812 39.993 98.5622 38.3721 98.9941 36.7047C98.1704 35.418 98.4238 33.1922 98.5794 31.7263C98.4958 30.9489 98.4128 30.1715 98.3302 29.394L98.9265 24.9317C99.0186 23.9483 98.8559 22.7906 98.7968 21.6732C98.7018 21.3391 98.6005 21.0068 98.493 20.6764C97.1694 19.9173 97.2976 18.7276 97.3192 17.6607C95.0443 12.674 91.3784 8.52782 86.806 5.7701C86.7935 5.76256 86.7808 5.75502 86.7681 5.74793C87.1568 6.1215 87.4891 6.55467 87.7538 7.03265C87.3899 8.16214 87.1172 9.54945 86.612 9.90126C84.4904 8.72304 84.0507 6.88405 82.7956 5.29505L80.9188 3.92961C80.9705 3.76939 81.0222 3.60929 81.0737 3.44927L81.4257 3.30505C81.0867 3.19523 80.7464 3.09385 80.4052 2.99941L80.5808 3.15027L79.4586 4.19346C79.5133 4.22665 79.5681 4.25979 79.6229 4.29288C80.4886 5.34317 82.1924 5.80677 82.2704 7.04352C82.183 7.33518 82.0955 7.62684 82.0078 7.9185C81.6266 8.04704 81.2934 8.11567 80.9584 8.43142L81.2617 9.07424C81.7477 9.21334 82.2519 8.9878 82.7658 9.52531L84.9077 12.1995C84.8981 12.6146 84.8885 13.0298 84.8789 13.4451C85.167 14.1214 85.7299 14.0443 85.7792 14.7938C85.5238 14.9329 85.5631 14.9412 85.2607 14.9394C84.7055 14.9585 84.4424 14.634 84.2401 14.2068C84.3235 13.9894 84.4068 13.7719 84.4899 13.5543C83.8473 13.2736 82.795 13.2546 82.2433 13.4575C82.1935 14.2466 82.2163 14.785 82.8116 15.409L82.6219 15.7534C82.1445 15.7706 81.3989 15.4479 80.8937 15.511C80.5429 15.5547 77.6111 17.4853 77.3186 17.8255L76.6291 19.4751C75.9544 20.1255 74.6284 19.9442 73.9992 20.8689C73.3298 21.8528 74.4216 23.0299 73.5274 23.9133C72.4791 24.3018 72.608 22.068 72.479 21.4414C68.5152 18.8358 63.3155 20.1632 65.1077 25.4774C67.3226 26.7034 68.2261 23.8888 69.4375 25.5717C69.0699 26.5711 68.2813 27.2515 68.2261 28.1684C72.2263 30.3718 68.6521 30.1025 69.843 32.5918C70.1473 33.228 70.7493 33.209 71.2269 33.659C71.211 33.6877 71.1952 33.7164 71.1795 33.7451L70.8127 34.2128L70.3891 34.1861L68.3851 32.0555C68.1598 31.3578 68.3022 30.8613 67.7695 30.1901L65.6932 28.5887L65.1216 27.4389L63.9118 27.0509C62.7233 26.5717 61.5079 24.9333 61.0652 24.0651C60.3356 22.6343 61.5719 19.9844 60.3242 18.4496C60.162 18.8107 59.9996 19.1717 59.8372 19.5328L59.6381 19.2974C59.9067 16.8301 59.2941 13.9704 60.3074 11.3202C61.0139 9.47267 66.4903 5.78368 65.8419 3.36419C59.5903 5.42041 54.3061 9.86557 51.0399 15.816C43.8103 28.9431 48.1005 45.7287 60.6234 53.3076C62.9096 54.6943 65.3831 55.7103 67.9599 56.3209C68.3919 55.3675 69.5926 54.3872 70.0694 53.8574C71.1215 52.6885 72.1013 50.4618 72.514 49.0214C72.0983 48.1223 71.1693 47.7033 70.4761 46.7547C69.8648 44.8156 69.2534 42.8763 68.6418 40.9368C68.7579 40.4124 69.5736 38.5079 69.9479 38.1676C70.461 37.7008 71.4927 37.5308 71.8603 36.684C72.2936 35.686 71.8863 34.7363 71.896 33.8351L72.9894 34.0375C73.3581 33.9377 73.7019 33.7558 73.9975 33.5042C75.0616 40.7623 76.1258 48.0208 77.1903 55.2798C76.0025 55.5948 74.7875 55.8095 73.6845 56.0451C73.0879 56.1726 72.3721 56.55 71.6179 56.9016C73.5459 57.0618 75.485 56.9978 77.3996 56.7106C77.4994 57.3994 77.5993 58.0883 77.6991 58.7773C71.4536 59.722 65.0864 58.432 59.6275 55.1161C46.1514 46.9605 41.5344 28.8977 49.3145 14.7719C57.0945 0.646137 74.326 -4.1939 87.8016 3.96174C100.829 11.8461 105.577 28.9894 98.8487 42.8848L97.2588 41.5461ZM71.7494 2.17013C72.2128 2.55066 72.707 2.88825 73.2263 3.17908C73.552 2.90497 73.8447 2.57248 74.2409 2.53039C75.4552 2.44922 75.4571 3.72218 75.6214 4.39924C76.2307 4.44736 76.3929 4.19829 76.9175 4.03521C77.1713 4.30374 77.4251 4.57217 77.679 4.8405C78.2373 3.83759 78.6662 3.63739 79.3229 2.85005L79.6893 2.8128C77.0897 2.17359 74.4118 1.95684 71.7494 2.17013ZM44.2363 50.0789C40.6709 55.4427 33.816 58.8656 23.864 58.8656C11.3435 58.8656 0.655273 52.7197 0.655273 38.2709L13.0407 39.327C12.9487 45.977 21.4974 45.7883 23.2659 45.8139C25.3632 45.8441 33.7791 45.9819 33.7791 40.9864C33.7791 28.5079 2.02199 39.7251 2.02199 17.8314C2.02199 5.77765 12.8304 0.119488 22.9332 0.119488C31.6812 0.119488 39.9008 3.11467 43.4685 10.3137C43.4514 10.3454 43.4347 10.3775 43.4176 10.4094C42.0186 12.8563 40.8939 15.4641 40.0659 18.1812L33.4283 17.1754C31.2179 13.8793 26.6716 13.0773 22.8338 13.0773C18.9177 13.0773 13.9545 13.9437 13.9048 17.1505C13.8204 22.5893 16.8059 21.2029 30.8988 24.3918C33.6522 25.0292 35.9393 25.865 38.4442 27.4194C38.4074 28.1152 38.3885 28.8157 38.3876 29.5211C38.3777 36.2544 40.118 42.8635 43.4219 48.6393C43.6842 49.1255 43.9557 49.6054 44.2363 50.0789Z" fill="#2A2AA0"/>
    <path d="M8.04228 102.555L0.778285 75.9892H4.04708L9.59885 97.6255H9.85828L15.5138 75.9892H19.1458L24.8014 97.6255H25.0608L30.6126 75.9892H33.8814L26.6174 102.555H23.2967L17.4336 81.3853H17.2261L11.363 102.555H8.04228ZM40.0812 102.555V75.9892H56.1139V78.8429H43.2981V87.8192H55.2837V90.6729H43.2981V99.701H56.3214V102.555H40.0812ZM64.1037 102.555V75.9892H73.3913C75.2419 75.9892 76.7682 76.3092 77.9702 76.9491C79.1722 77.5804 80.0672 78.4322 80.6553 79.5045C81.2433 80.5681 81.5373 81.7485 81.5373 83.0457C81.5373 84.1872 81.3341 85.1297 80.9277 85.8734C80.5299 86.6171 80.0024 87.2052 79.3452 87.6376C78.6966 88.0699 77.9918 88.3899 77.2308 88.5974V88.8569C78.0437 88.9088 78.8609 89.1941 79.6824 89.713C80.5039 90.2318 81.1914 90.9755 81.7449 91.9441C82.2983 92.9126 82.575 94.0973 82.575 95.4982C82.575 96.83 82.2724 98.0277 81.667 99.0913C81.0617 100.155 80.1061 100.998 78.8004 101.621C77.4946 102.243 75.7953 102.555 73.7026 102.555H64.1037ZM67.3206 99.701H73.7026C75.804 99.701 77.2957 99.2945 78.1777 98.4817C79.0684 97.6601 79.5138 96.6657 79.5138 95.4982C79.5138 94.5989 79.2846 93.7687 78.8263 93.0077C78.368 92.2381 77.7151 91.6241 76.8676 91.1658C76.0201 90.6988 75.017 90.4653 73.8582 90.4653H67.3206V99.701ZM67.3206 87.6635H73.2875C74.256 87.6635 75.1294 87.4732 75.9077 87.0928C76.6947 86.7123 77.3173 86.1761 77.7756 85.4843C78.2426 84.7925 78.4761 83.9796 78.4761 83.0457C78.4761 81.8782 78.0696 80.8881 77.2568 80.0752C76.4439 79.2537 75.1554 78.8429 73.3913 78.8429H67.3206V87.6635ZM117.046 82.6306C116.89 81.3161 116.259 80.2957 115.152 79.5693C114.045 78.8429 112.687 78.4797 111.079 78.4797C109.903 78.4797 108.874 78.67 107.992 79.0505C107.118 79.431 106.435 79.9541 105.942 80.62C105.458 81.2859 105.216 82.0425 105.216 82.89C105.216 83.5991 105.384 84.2088 105.722 84.719C106.067 85.2205 106.508 85.64 107.045 85.9772C107.581 86.3058 108.143 86.5782 108.731 86.7944C109.319 87.002 109.859 87.1706 110.352 87.3003L113.05 88.0267C113.742 88.2083 114.512 88.4591 115.359 88.779C116.215 89.099 117.033 89.5357 117.811 90.0891C118.598 90.6339 119.246 91.3344 119.757 92.1905C120.267 93.0466 120.522 94.0973 120.522 95.3426C120.522 96.7781 120.146 98.0752 119.393 99.234C118.65 100.393 117.56 101.314 116.125 101.997C114.698 102.68 112.964 103.022 110.923 103.022C109.021 103.022 107.373 102.715 105.981 102.101C104.597 101.487 103.508 100.631 102.712 99.5323C101.925 98.4341 101.48 97.1586 101.376 95.7058H104.697C104.783 96.7089 105.12 97.5391 105.709 98.1963C106.305 98.8449 107.058 99.3291 107.966 99.6491C108.882 99.9604 109.868 100.116 110.923 100.116C112.151 100.116 113.254 99.9172 114.231 99.5194C115.208 99.1129 115.982 98.5508 116.553 97.8331C117.123 97.1067 117.409 96.2592 117.409 95.2907C117.409 94.4086 117.162 93.6909 116.669 93.1374C116.176 92.584 115.528 92.1343 114.724 91.7884C113.919 91.4425 113.05 91.1398 112.116 90.8804L108.848 89.9465C106.772 89.3498 105.129 88.498 103.918 87.3911C102.708 86.2842 102.102 84.8357 102.102 83.0457C102.102 81.5583 102.505 80.2611 103.309 79.1542C104.122 78.0387 105.211 77.1739 106.578 76.56C107.953 75.9373 109.488 75.626 111.182 75.626C112.895 75.626 114.417 75.933 115.748 76.547C117.08 77.1523 118.135 77.9825 118.913 79.0375C119.7 80.0925 120.115 81.2902 120.159 82.6306H117.046ZM150.417 89.272C150.417 92.0738 149.911 94.4951 148.9 96.5359C147.888 98.5768 146.5 100.151 144.736 101.258C142.972 102.364 140.957 102.918 138.691 102.918C136.425 102.918 134.411 102.364 132.646 101.258C130.882 100.151 129.494 98.5768 128.483 96.5359C127.471 94.4951 126.965 92.0738 126.965 89.272C126.965 86.4701 127.471 84.0488 128.483 82.008C129.494 79.9671 130.882 78.3933 132.646 77.2864C134.411 76.1795 136.425 75.626 138.691 75.626C140.957 75.626 142.972 76.1795 144.736 77.2864C146.5 78.3933 147.888 79.9671 148.9 82.008C149.911 84.0488 150.417 86.4701 150.417 89.272ZM147.304 89.272C147.304 86.9717 146.919 85.0303 146.15 83.4478C145.389 81.8653 144.355 80.6676 143.049 79.8547C141.752 79.0418 140.3 78.6354 138.691 78.6354C137.083 78.6354 135.626 79.0418 134.32 79.8547C133.023 80.6676 131.989 81.8653 131.22 83.4478C130.459 85.0303 130.078 86.9717 130.078 89.272C130.078 91.5722 130.459 93.5136 131.22 95.0961C131.989 96.6786 133.023 97.8763 134.32 98.6892C135.626 99.5021 137.083 99.9085 138.691 99.9085C140.3 99.9085 141.752 99.5021 143.049 98.6892C144.355 97.8763 145.389 96.6786 146.15 95.0961C146.919 93.5136 147.304 91.5722 147.304 89.272ZM158.018 102.555V75.9892H161.235V99.701H173.584V102.555H158.018ZM198.19 75.9892H201.407V93.5785C201.407 95.3945 200.979 97.0159 200.123 98.4427C199.275 99.861 198.078 100.981 196.53 101.802C194.982 102.615 193.166 103.022 191.082 103.022C188.998 103.022 187.182 102.615 185.634 101.802C184.086 100.981 182.884 99.861 182.028 98.4427C181.18 97.0159 180.756 95.3945 180.756 93.5785V75.9892H183.973V93.319C183.973 94.6162 184.259 95.7706 184.829 96.7824C185.4 97.7855 186.213 98.5768 187.268 99.1562C188.332 99.7269 189.603 100.012 191.082 100.012C192.56 100.012 193.832 99.7269 194.895 99.1562C195.959 98.5768 196.772 97.7855 197.334 96.7824C197.905 95.7706 198.19 94.6162 198.19 93.319V75.9892ZM208.57 78.8429V75.9892H228.494V78.8429H220.14V102.555H216.923V78.8429H208.57ZM238.867 75.9892V102.555H235.65V75.9892H238.867ZM269.924 89.272C269.924 92.0738 269.418 94.4951 268.406 96.5359C267.394 98.5768 266.006 100.151 264.242 101.258C262.478 102.364 260.463 102.918 258.197 102.918C255.932 102.918 253.917 102.364 252.153 101.258C250.389 100.151 249.001 98.5768 247.989 96.5359C246.977 94.4951 246.471 92.0738 246.471 89.272C246.471 86.4701 246.977 84.0488 247.989 82.008C249.001 79.9671 250.389 78.3933 252.153 77.2864C253.917 76.1795 255.932 75.626 258.197 75.626C260.463 75.626 262.478 76.1795 264.242 77.2864C266.006 78.3933 267.394 79.9671 268.406 82.008C269.418 84.0488 269.924 86.4701 269.924 89.272ZM266.81 89.272C266.81 86.9717 266.426 85.0303 265.656 83.4478C264.895 81.8653 263.862 80.6676 262.556 79.8547C261.259 79.0418 259.806 78.6354 258.197 78.6354C256.589 78.6354 255.132 79.0418 253.826 79.8547C252.529 80.6676 251.496 81.8653 250.726 83.4478C249.965 85.0303 249.584 86.9717 249.584 89.272C249.584 91.5722 249.965 93.5136 250.726 95.0961C251.496 96.6786 252.529 97.8763 253.826 98.6892C255.132 99.5021 256.589 99.9085 258.197 99.9085C259.806 99.9085 261.259 99.5021 262.556 98.6892C263.862 97.8763 264.895 96.6786 265.656 95.0961C266.426 93.5136 266.81 91.5722 266.81 89.272ZM298.59 75.9892V102.555H295.477L281.001 81.6966H280.741V102.555H277.524V75.9892H280.638L295.166 96.8991H295.425V75.9892H298.59ZM321.747 82.6306C321.591 81.3161 320.96 80.2957 319.853 79.5693C318.746 78.8429 317.388 78.4797 315.78 78.4797C314.604 78.4797 313.575 78.67 312.693 79.0505C311.819 79.431 311.136 79.9541 310.643 80.62C310.159 81.2859 309.917 82.0425 309.917 82.89C309.917 83.5991 310.085 84.2088 310.423 84.719C310.769 85.2205 311.21 85.64 311.746 85.9772C312.282 86.3058 312.844 86.5782 313.432 86.7944C314.02 87.002 314.561 87.1706 315.053 87.3003L317.751 88.0267C318.443 88.2083 319.213 88.4591 320.06 88.779C320.917 89.099 321.734 89.5357 322.512 90.0891C323.299 90.6339 323.947 91.3344 324.458 92.1905C324.968 93.0466 325.223 94.0973 325.223 95.3426C325.223 96.7781 324.847 98.0752 324.095 99.234C323.351 100.393 322.261 101.314 320.826 101.997C319.399 102.68 317.665 103.022 315.624 103.022C313.722 103.022 312.074 102.715 310.682 102.101C309.298 101.487 308.209 100.631 307.413 99.5323C306.626 98.4341 306.181 97.1586 306.077 95.7058H309.398C309.484 96.7089 309.822 97.5391 310.41 98.1963C311.006 98.8449 311.759 99.3291 312.667 99.6491C313.583 99.9604 314.569 100.116 315.624 100.116C316.852 100.116 317.955 99.9172 318.932 99.5194C319.909 99.1129 320.683 98.5508 321.254 97.8331C321.825 97.1067 322.11 96.2592 322.11 95.2907C322.11 94.4086 321.863 93.6909 321.371 93.1374C320.878 92.584 320.229 92.1343 319.425 91.7884C318.621 91.4425 317.751 91.1398 316.818 90.8804L313.549 89.9465C311.473 89.3498 309.83 88.498 308.62 87.3911C307.409 86.2842 306.804 84.8357 306.804 83.0457C306.804 81.5583 307.206 80.2611 308.01 79.1542C308.823 78.0387 309.912 77.1739 311.279 76.56C312.654 75.9373 314.189 75.626 315.884 75.626C317.596 75.626 319.118 75.933 320.45 76.547C321.781 77.1523 322.836 77.9825 323.615 79.0375C324.401 80.0925 324.817 81.2902 324.86 82.6306H321.747Z" fill="#2A2AA0"/>
  </svg>
`;

function renderSelectedOptionsList(options: Array<{ question: string; answers: string[] }>): string {
  return `
    <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
      ${options
      .map((opt) => {
        const cleanQuestion = opt.question.trim().replace(/:$/, "");
        const hasMultiple = opt.answers.length > 1;
        return `
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: #0F172A; margin-bottom: 5px;">${cleanQuestion}</div>
              ${hasMultiple
            ? `<div style="display: flex; flex-direction: column; gap: 4px; padding-left: 2px;">
                      ${opt.answers
              .map((ans) => `<div style="font-size: 12px; color: #475569; line-height: 1.5;">• ${ans.replace(/^[•\-\*]\s*/, "")}</div>`)
              .join("")}
                    </div>`
            : `<div style="font-size: 12px; color: #475569; line-height: 1.5; padding-left: 2px;">${opt.answers[0] || "-"}</div>`
          }
            </div>
          `;
      })
      .join("")}
    </div>
  `;
}

function renderSummaryBoxAndFooter(d: CalculatorPDFData, currentPage: number, totalPages: number): string {
  return `
    <div style="margin-top: auto; padding-top: 10px;">
      <!-- Estimated Timeline & Investment Total Box -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 22px;">
        <div style="width: 310px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
          <!-- Top Row (Estimated Timeline) -->
          <table style="width: 100%; border-collapse: collapse; background-color: #0D1939; margin: 0; padding: 0;">
            <tbody>
              <tr>
                <td style="padding: 12px 18px; vertical-align: middle; text-align: left;">
                  <span style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94A3B8; display: inline-block; vertical-align: middle; line-height: 1;">ESTIMATED TIMELINE</span>
                </td>
                <td style="padding: 12px 18px; vertical-align: middle; text-align: right;">
                  <span style="font-size: 13.5px; font-weight: 800; color: #FFFFFF; display: inline-block; vertical-align: middle; line-height: 1;">${d.duration}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <!-- Bottom Row (Investment Total) -->
          <table style="width: 100%; border-collapse: collapse; background-color: #282BB3; margin: 0; padding: 0;">
            <tbody>
              <tr>
                <td style="padding: 16px 18px; vertical-align: middle; text-align: left;">
                  <span style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #FFFFFF; display: inline-block; vertical-align: middle; line-height: 1;">INVESTMENT TOTAL</span>
                </td>
                <td style="padding: 10px 18px 15px 0px; vertical-align: middle; text-align: right;">
                  <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF; display: inline-block; vertical-align: middle; line-height: 1;">${d.formattedPrice}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #E2E8F0; padding-top: 14px; text-align: center;">
        <div style="font-size: 9.5px; color: #64748B; margin-bottom: 3px;">Acceptance of this quote binds the client to the agreed delivery timeline and total investment.</div>
        <div style="font-size: 9.5px; color: #64748B; margin-bottom: 3px;"><span style="font-weight: 700; color: #475569;">Note:</span> Time spent waiting for client replies does not count towards project deadlines.</div>
        <div style="font-size: 9.5px; color: #64748B; margin-bottom: 10px;">For inquiries, please reach out to <span style="font-weight: 600; color: #2563EB;">contact@societywebsolutions.com</span></div>
        <div style="display: flex; justify-content: ${totalPages > 1 ? "space-between" : "center"}; align-items: center; font-size: 8.5px; color: #94A3B8; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">
          <span>S O C I E T Y &nbsp; W E B &nbsp; S O L U T I O N S</span>
          ${totalPages > 1 ? `<span style="letter-spacing: 0.5px; color: #64748B; font-weight: 600;">Page ${currentPage} of ${totalPages}</span>` : ""}
        </div>
      </div>
    </div>
  `;
}

function renderScopeOverviewIntro(d: CalculatorPDFData): string {
  if (d.scopeOverviewLead) {
    return `<div style="font-size: 13.5px; font-weight: 700; color: #0F172A; line-height: 1.5; margin-bottom: 18px;">${d.scopeOverviewLead}</div>`;
  }
  if (d.subtitle) {
    return `<div style="font-size: 12.5px; color: #475569; line-height: 1.6; margin-bottom: 18px;">${d.subtitle}</div>`;
  }
  if (d.description) {
    return `<div style="font-size: 12.5px; color: #475569; line-height: 1.6; margin-bottom: 18px;">${d.description}</div>`;
  }
  return "";
}

function renderPreparedForClientBlock(d: CalculatorPDFData): string {
  const emailLine =
    d.clientEmail && !d.hideClientEmail
      ? `<div style="font-size: 12px; color: #64748B;">${d.clientEmail}</div>`
      : "";
  return `
    <div style="flex: 1;">
      <div style="font-size: 9.5px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">PREPARED FOR</div>
      <div style="font-size: 17px; font-weight: 800; color: #0F172A; margin-bottom: 4px;">${d.clientName}</div>
      ${emailLine}
    </div>
  `;
}

function appendCanvasToPdf(
  pdf: any,
  canvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number
): void {
  const imgData = canvas.toDataURL("image/png");
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * pageWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
}

export function getCalculatorProjectHTML(d: CalculatorPDFData): string {
  const options = d.selectedOptions || [];

  return `
    <div class="pdf-page" style="width: 794px; min-height: 1123px; height: auto; box-sizing: border-box; background-color: #ffffff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0F172A; padding: 40px 48px; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
          <div style="display: flex; align-items: center;">
            ${LOGO_SVG}
          </div>
          <div style="text-align: right;">
            <div style="font-size: 22px; font-weight: 900; color: #2B2D8C; letter-spacing: -0.5px; margin-bottom: 5px;">PROJECT PROPOSAL</div>
            <div style="font-size: 11px; font-weight: 700; color: #1E293B; margin-bottom: 2px;">Society Web Solutions</div>
            <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">1645 Palm Beach Lakes Blvd</div>
            <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">West Palm Beach, FL, US</div>
            <div style="font-size: 11px; font-weight: 600; color: #2563EB;">contact@societywebsolutions.com</div>
          </div>
        </div>

        <div style="border-bottom: 1px solid #E2E8F0; margin-bottom: 24px;"></div>

        <div style="background-color: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px 24px; display: flex; justify-content: space-between; margin-bottom: 28px;">
          ${renderPreparedForClientBlock(d)}
          <div style="width: 250px;">
            <div style="font-size: 9.5px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">QUOTE DETAILS</div>
            <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 5px;">
              <span style="color: #64748B;">Ref Number:</span>
              <span style="font-weight: 700; color: #0F172A;">${d.projectNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 5px;">
              <span style="color: #64748B;">Issued On:</span>
              <span style="font-weight: 700; color: #0F172A;">${d.issuedDate}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11.5px;">
              <span style="color: #64748B;">Valid Until:</span>
              <span style="font-weight: 700; color: #D32F2F;">${d.validUntilDate}</span>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <div style="font-size: 19px; font-weight: 800; color: #2B2D8C; margin-bottom: 10px;">Project Scope Overview</div>
          <div style="border-bottom: 1px solid #E2E8F0; margin-bottom: 18px;"></div>
        </div>

        ${renderScopeOverviewIntro(d)}

        ${renderSelectedOptionsList(options)}
      </div>

      ${renderSummaryBoxAndFooter(d, 1, 1)}
    </div>
  `;
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
    container.innerHTML = getCalculatorProjectHTML(d);

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

      const cleanNum = d.rawProjectNumber.replace(/[^a-zA-Z0-9-_]/g, "") || "1";
      const filename = `Project_Proposal_${cleanNum}.pdf`;
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
  container.innerHTML = getCalculatorProjectHTML(d);

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
