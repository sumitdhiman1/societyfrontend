import { authService } from "./authService";
import { getProjectEstimatedDeadline } from "./calculatorUtils";
import { downloadCalculatorProjectPDF, printCalculatorProjectPDF } from "./generateCalculatorProjectPDF";

function formatPdfDate(dateInput: any): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export interface ProjectPDFData {
  title?: string;
  projectNumber?: string;
  clientEmail?: string;
  clientName?: string;
  status?: string;
  submittedDate?: string;
  deadlineDate?: string;
  description?: string;
  categoryName?: string;
  selectedOptions?: Array<{ question: string; answers: string[] }>;
  deliverables?: Array<{
    name: string;
    duration: string;
    amount: number;
  }>;
  addons?: Array<{
    name: string;
    duration: string;
    amount: number;
  }>;
  duration?: string;
  totalPrice?: number;
  currency?: string;
  formattedPrice?: string;
  [key: string]: any;
}

function extractProjectDetails(data: any): ProjectPDFData {
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
    data.user?.fullName ||
    data.calculatorSpecs?.businessInfo?.name ||
    data.requirements?.businessInfo?.name ||
    (data.title && data.title.includes(" - ") ? data.title.split(" - ").pop()?.trim() : "") ||
    "Client";

  let rawProjectNumber =
    data.projectNumber ||
    data.quoteNumber ||
    (data._id ? `2026-${data._id.slice(-3).toUpperCase()}` : "2026-201");
  rawProjectNumber = String(rawProjectNumber).replace(/^INV-/i, "");
  const projectNumber = rawProjectNumber.startsWith("#") ? rawProjectNumber : `#${rawProjectNumber}`;

  const title = data.title || "Project Details";
  const status = (data.status || "Active").charAt(0).toUpperCase() + (data.status || "Active").slice(1).toLowerCase();

  const submittedDateObj = data.startDate || data.createdAt;
  const submittedDate = submittedDateObj ? formatPdfDate(submittedDateObj) : "09/07/2026";

  const deadlineDateObj = getProjectEstimatedDeadline(data) || (data.deadline ? new Date(data.deadline) : null);
  const deadlineDate = deadlineDateObj ? formatPdfDate(deadlineDateObj) : "09/21/2026";

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

  // Comprehensive timeline resolution
  let foundTimelineQuestion = "";
  let foundTimelineAnswer = "";

  const calculatorSpecs = data.calculatorSpecs || data.requirements || {};
  const rawSelections = calculatorSpecs.selections || data.selections || [];

  if (Array.isArray(rawSelections)) {
    const sel = rawSelections.find(
      (s: any) => /timeline/i.test(s.questionKey || "") || /timeline/i.test(s.questionText || "")
    );
    if (sel) {
      foundTimelineQuestion = sel.questionText || "What is your desired project timeline?";
      if (Array.isArray(sel.answerTexts) && sel.answerTexts.length > 0 && sel.answerTexts[0]) {
        foundTimelineAnswer = sel.answerTexts[0];
      } else if (Array.isArray(sel.answerKeys) && sel.answerKeys.length > 0 && sel.answerKeys[0]) {
        foundTimelineAnswer = sel.answerKeys[0];
      } else if (sel.textValue) {
        foundTimelineAnswer = String(sel.textValue);
      }
    }
  }

  const directTimeline =
    calculatorSpecs.estimatedTimeline ||
    data.estimatedTimeline ||
    data.timeline ||
    data.totalDuration ||
    calculatorSpecs.timeline ||
    data.duration ||
    (data.timelineInDays ? `${data.timelineInDays} Days` : "") ||
    "";

  const formatRawAnswer = (raw: string): string => {
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
    if (lower.startsWith("gfx_timeline_1")) return "5 - 7 business days";
    if (lower.startsWith("gfx_timeline_2")) return "2 - 3 business days (Rushed): +25% rush fee";
    if (lower.startsWith("gfx_timeline_3")) return "24 - 48 hours (Super Rushed): +50% rush fee";
    if (lower.startsWith("seo_timeline")) return "Monthly Service";
    return raw;
  };

  const finalTimelineAnswer = formatRawAnswer(foundTimelineAnswer) || formatRawAnswer(directTimeline) || directTimeline;

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

  const categoryKey = data.categoryKey || calculatorSpecs.categoryKey || "";
  if (!duration) {
    if (categoryKey === "seo") duration = "Monthly Service";
    else if (categoryKey === "graphics") duration = "5 - 7 business days";
    else if (categoryKey === "marketing") duration = "Ongoing";
    else duration = "2 weeks";
  }

  const categoryName =
    calculatorSpecs?.categoryName ||
    data.serviceType ||
    "Custom Website Development Project";

  const selectedOptions: Array<{ question: string; answers: string[] }> = [];

  if (Array.isArray(rawSelections) && rawSelections.length > 0) {
    rawSelections.forEach((sel: any) => {
      const qText = sel.questionText || sel.questionKey || "";
      // Filter out internal timeline questions
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
          question: qText.endsWith(":") ? qText : `${qText}:`,
          answers: ansList,
        });
      }
    });

    // Ensure timeline question is at the end of Selected Options
    if (finalTimelineAnswer || duration) {
      let formattedTimeline = finalTimelineAnswer || duration;
      if (!formattedTimeline.includes(":") && !formattedTimeline.includes("Normal") && !formattedTimeline.includes("Rushed") && !formattedTimeline.toLowerCase().includes("month") && !formattedTimeline.toLowerCase().includes("business")) {
        formattedTimeline = `${formattedTimeline} (Normal): No extra fee`;
      }
      selectedOptions.push({
        question: "What is your desired project timeline?:",
        answers: [formattedTimeline],
      });
    }
  }

  // Addons extraction
  const addons: Array<{ name: string; duration: string; amount: number }> = [];
  if (Array.isArray(data.addons)) {
    data.addons.forEach((addon: any) => {
      if (Array.isArray(addon.deliverableItems)) {
        addon.deliverableItems.forEach((item: any) => {
          addons.push({
            name: item.description || item.name || item.title || "Add-on Task",
            duration: item.duration
              ? String(item.duration).toLowerCase().includes("day") || String(item.duration).toLowerCase().includes("week")
                ? String(item.duration)
                : `${item.duration} ${item.unit || "Days"}`
              : "-",
            amount: Number(item.amount ?? item.cost ?? 0),
          });
        });
      }
    });
  }

  // Deliverables extraction
  let deliverables: Array<{ name: string; duration: string; amount: number }> = [];

  if (calculatorSpecs) {
    deliverables = [
      {
        name: categoryName,
        duration: duration,
        amount: rawTotalPrice > 0 ? rawTotalPrice : Number(data.amountPaid || 0),
      },
    ];
  } else {
    const rawDeliverableItems: any[] = [];
    if (Array.isArray(data.deliverableItems) && data.deliverableItems.length > 0) {
      rawDeliverableItems.push(...data.deliverableItems);
    } else if (Array.isArray(data.lineItems) && data.lineItems.length > 0) {
      rawDeliverableItems.push(...data.lineItems);
    }

    if (rawDeliverableItems.length > 0) {
      deliverables = rawDeliverableItems.map((d: any) => ({
        name: d.item || d.name || d.description || d.title || title,
        duration: d.duration
          ? String(d.duration).toLowerCase().includes("day")
            ? d.duration
            : `${d.duration} Days`
          : duration,
        amount: Number(d.amount ?? d.cost ?? (d.price ?? 0)),
      }));
    } else {
      deliverables = [
        {
          name: title.startsWith("Free website analysis") ? "Free website analysis" : title,
          duration: duration,
          amount: rawTotalPrice,
        },
      ];
    }
  }

  const deliverablesSum = deliverables.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const addonsSum = addons.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const totalPrice = deliverablesSum > 0 ? deliverablesSum + (calculatorSpecs ? 0 : addonsSum) : (rawTotalPrice > 0 ? rawTotalPrice : Number(data.amountPaid || 0));

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalPrice);

  let description = data.description || "";
  if (!description && !calculatorSpecs) {
    if (data.website) {
      description = `Analysis for ${data.website}.`;
    } else if (title.includes(" - ")) {
      description = `Analysis for www.${title.split(" - ").pop()?.trim() || "com"}.`;
    } else {
      description = "Analysis for www.com.";
    }
  }

  return {
    rawProjectNumber,
    projectNumber,
    title,
    clientEmail,
    clientName,
    status,
    submittedDate,
    deadlineDate,
    categoryName,
    selectedOptions,
    duration,
    totalPrice,
    currency,
    formattedPrice,
    description,
    deliverables,
    addons,
  };
}

function getProjectDetailsHTML(d: ProjectPDFData): string {
  return `
    <div style="width: 100%; max-width: 794px; margin: 0 auto; box-sizing: border-box; background-color: #ffffff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0F172A; padding: 36px 40px;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
        <div>
          <div style="font-size: 26px; font-weight: 900; color: #162456; letter-spacing: -0.5px; line-height: 1.1;">SOCIETY</div>
          <div style="font-size: 9.5px; font-weight: 800; color: #4343F0; letter-spacing: 2px; text-transform: uppercase; margin-top: 3px;">WEB SOLUTIONS</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 22px; font-weight: 900; color: #162456; letter-spacing: -0.5px; margin-bottom: 5px;">PROJECT DETAILS</div>
          <div style="font-size: 11px; font-weight: 700; color: #1E293B; margin-bottom: 2px;">Society Web Solutions</div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">1645 Palm Beach Lakes Blvd</div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">West Palm Beach, FL, US</div>
          <div style="font-size: 11px; font-weight: 600; color: #2563EB;">contact@societywebsolutions.com</div>
        </div>
      </div>

      <!-- Client & Project Summary Card -->
      <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 20px; background-color: #FAFAFA; display: flex; justify-content: space-between; margin-bottom: 24px;">
        <div style="flex: 1;">
          <div style="font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">CLIENT</div>
          <div style="font-size: 16px; font-weight: 800; color: #0F172A; margin-bottom: 4px;">${d.clientName}</div>
          <div style="font-size: 11.5px; color: #64748B;">Status: <span style="font-weight: 700; color: #0F172A;">${d.status}</span></div>
        </div>
        <div style="width: 230px;">
          <div style="font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">PROJECT SUMMARY</div>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">
            <span style="color: #64748B;">Project ID:</span>
            <span style="font-weight: 700; color: #0F172A;">${d.projectNumber}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">
            <span style="color: #64748B;">Submitted:</span>
            <span style="font-weight: 700; color: #0F172A;">${d.submittedDate}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px;">
            <span style="color: #64748B;">Est. Deadline:</span>
            <span style="font-weight: 700; color: #00875A;">${d.deadlineDate}</span>
          </div>
        </div>
      </div>

      <!-- Project Title Section -->
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 18px; font-weight: 800; color: #1E2B7B; margin: 0 0 10px 0; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0;">Project Title: ${d.title}</h2>
      </div>

      <!-- Selected Options / Calculator Specs Section -->
      ${
        d.selectedOptions && d.selectedOptions.length > 0
          ? `
        <div style="margin-bottom: 22px;">
          <div style="font-size: 11.5px; font-weight: 600; color: #334155; margin-bottom: 12px;">Category: ${d.categoryName}</div>
          <div style="font-size: 11.5px; font-weight: 700; color: #1E293B; margin-bottom: 8px;">Selected Options:</div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${d.selectedOptions
              .map(
                (opt) => `
              <div style="font-size: 10.5px; line-height: 1.5;">
                <div style="font-weight: 600; color: #1E293B;">• ${opt.question}</div>
                ${opt.answers.map((ans) => `<div style="padding-left: 14px; color: #475569;">- ${ans}</div>`).join("")}
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `
          : d.description
          ? `<p style="font-size: 12px; color: #475569; margin: 0 0 20px 0; line-height: 1.5;">${d.description}</p>`
          : ""
      }

      <!-- Deliverables Table -->
      <div style="border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background-color: #162456; color: #FFFFFF;">
              <th style="padding: 10px 16px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; text-align: left;">DELIVERABLES & WORK SCOPE</th>
              <th style="padding: 10px 16px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; text-align: center;">DURATION</th>
              <th style="padding: 10px 16px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; text-align: right;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${(d.deliverables || [])
              .map(
                (item: { name: string; duration: string; amount: number }, idx: number) => `
              <tr style="background-color: #FFFFFF; border-top: ${idx > 0 ? "1px solid #F1F5F9" : "none"};">
                <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #0F172A; text-align: left;">${item.name}</td>
                <td style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: #475569; text-align: center;">${item.duration}</td>
                <td style="padding: 12px 16px; font-size: 12px; font-weight: 800; color: #0F172A; text-align: right;">${new Intl.NumberFormat("en-US", { style: "currency", currency: d.currency, minimumFractionDigits: 2 }).format(item.amount)}</td>
              </tr>
            `
              )
              .join("")}
            ${
              d.addons && d.addons.length > 0
                ? `
              <tr style="background-color: #E2E8F0;">
                <td colspan="3" style="padding: 7px 16px; font-size: 9.5px; font-weight: 800; color: #1E293B; text-transform: uppercase; letter-spacing: 0.5px;">ADD-ON TASKS</td>
              </tr>
              ${d.addons
                .map(
                  (addon) => `
                <tr style="background-color: #FFFFFF; border-top: 1px solid #F1F5F9;">
                  <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #0F172A; text-align: left;">${addon.name}</td>
                  <td style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: #475569; text-align: center;">${addon.duration}</td>
                  <td style="padding: 12px 16px; font-size: 12px; font-weight: 800; color: #0F172A; text-align: right;">${new Intl.NumberFormat("en-US", { style: "currency", currency: d.currency, minimumFractionDigits: 2 }).format(addon.amount)}</td>
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

      <!-- Summary Box (Bottom-Right) -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 32px;">
        <div style="width: 260px; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <!-- Top Row -->
          <div style="background-color: #0D1939; color: #FFFFFF; padding: 7px 14px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.9;">ESTIMATED TIMELINE</span>
            <span style="font-size: 11.5px; font-weight: 800;">${d.duration}</span>
          </div>
          <!-- Bottom Row -->
          <div style="background-color: #1E2B7B; color: #FFFFFF; padding: 11px 14px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">INVESTMENT TOTAL</span>
            <span style="font-size: 19px; font-weight: 900; letter-spacing: -0.5px;">${d.formattedPrice}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: center;">
        <div style="font-size: 10.5px; color: #64748B; margin-bottom: 4px;">This document serves as a record of project details and agreed deliverables.</div>
        <div style="font-size: 10.5px; color: #64748B; margin-bottom: 16px;">For inquiries, please reach out to <span style="font-weight: 600; color: #2563EB;">contact@societywebsolutions.com</span></div>
        <div style="font-size: 9px; font-weight: 800; color: #94A3B8; letter-spacing: 2px; text-transform: uppercase;">S O C I E T Y &nbsp; W E B &nbsp; S O L U T I O N S</div>
      </div>
    </div>
  `;
}

export async function downloadProjectDetailsPDF(data: any): Promise<void> {
  if (typeof window === "undefined") return;
  return downloadCalculatorProjectPDF(data);
}

export function printProjectDetails(data: any): void {
  if (typeof window === "undefined") return;
  return printCalculatorProjectPDF(data);
}
