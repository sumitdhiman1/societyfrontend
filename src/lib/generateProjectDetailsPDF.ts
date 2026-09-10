import { authService } from "./authService";
import {
  calculateSeoRawTimelineDays,
  formatGraphicsTimelineLabel,
  getSeoServiceMode,
  resolveGraphicsTimelineAnswer,
  snapGraphicsBaselineDays,
  getProjectEstimatedDeadline,
} from "./calculatorUtils";
import { downloadCalculatorProjectPDF, printCalculatorProjectPDF } from "./generateCalculatorProjectPDF";

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

function formatPdfDateMMDDYYYY(dateInput: any): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
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
  rawProjectNumber: string;
  clientEmail: string;
  clientName: string;
  status: string;
  submittedDate: string;
  deadlineDate: string;
  description: string;
  deliverables: Array<{
    name: string;
    duration: string;
    amount: number;
  }>;
  addons: Array<{
    name: string;
    duration: string;
    amount: number;
  }>;
  duration: string;
  totalPrice: number;
  currency: string;
  formattedPrice: string;
  [key: string]: any;
}

export function extractProjectDetails(data: any): ProjectPDFData {
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
    (currentUser?.fullName ||
      (currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ""}`.trim() : "")) ||
    data.calculatorSpecs?.businessInfo?.name ||
    data.requirements?.businessInfo?.name ||
    (data.title && data.title.includes(" - ") ? data.title.split(" - ").pop()?.trim() : "") ||
    "Client";

  let rawProjectNumber =
    data.projectNumber ||
    data.refNumber ||
    data.quoteNumber ||
    (data._id ? data._id.slice(-8).toUpperCase() : "968728E3");
  rawProjectNumber = String(rawProjectNumber)
    .replace(/^INV-/i, "")
    .replace(/^PROJECT-/i, "");
  const projectNumber = rawProjectNumber.startsWith("#") ? rawProjectNumber : `#${rawProjectNumber}`;

  const title = data.title || "Website Redesign";

  let rawStatus = data.status || "Active";
  if (rawStatus.toUpperCase() === "IN_PROGRESS" || rawStatus.toUpperCase() === "INPROGRESS") {
    rawStatus = "Active";
  }
  const status =
    rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

  const submittedDateObj = data.startDate || data.createdAt || data.submittedAt || new Date();
  const submittedDate = formatPdfDateMMDDYYYY(submittedDateObj);

  const deadlineDateObj =
    getProjectEstimatedDeadline(data) ||
    (data.deadline ? new Date(data.deadline) : null) ||
    (data.estimatedDeadline ? new Date(data.estimatedDeadline) : null);
  const deadlineDate = deadlineDateObj ? formatPdfDateSingle(deadlineDateObj) : formatPdfDateSingle(new Date(Date.now() + 43 * 86400000));

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
  let deliverables: Array<{ name: string; duration: string; amount: number }> = [];
  const rawDeliverableItems: any[] = [];
  if (Array.isArray(data.deliverableItems) && data.deliverableItems.length > 0) {
    rawDeliverableItems.push(...data.deliverableItems);
  } else if (Array.isArray(data.lineItems) && data.lineItems.length > 0) {
    rawDeliverableItems.push(...data.lineItems);
  }

  if (rawDeliverableItems.length > 0) {
    deliverables = rawDeliverableItems.map((d: any) => ({
      name: d.description || d.item || d.name || d.title || title,
      duration:
        d.duration !== undefined && d.duration !== null && String(d.duration).trim() !== ""
          ? String(d.duration).trim()
          : "-",
      amount: Number(d.amount ?? d.cost ?? (d.price ?? 0)),
    }));
  } else if (data.calculatorSpecs) {
  const categoryName =
      data.calculatorSpecs.categoryName ||
    data.serviceType ||
      "Website Development";
    const resolvedTimeline = resolveCalculatorEstimatedTimeline(data);
    deliverables = [
      {
        name: categoryName,
        duration: resolvedTimeline || data.calculatorSpecs.estimatedTimeline || data.timeline || "14 Days",
        amount: rawTotalPrice > 0 ? rawTotalPrice : Number(data.amountPaid || 0),
      },
    ];
  } else {
    deliverables = [
      {
        name: title.startsWith("Free website analysis") ? "Free website analysis" : title,
        duration: data.duration || (data.timelineInDays ? `${data.timelineInDays} Days` : "-"),
        amount: rawTotalPrice,
      },
    ];
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

  // Also check messages for accepted quote proposals
  if (Array.isArray(data.messages)) {
    data.messages
      .filter((m: any) => m.type === "quote_proposal" || m.content?.proposalStatus === "accepted" || m.proposalStatus === "accepted")
      .forEach((m: any) => {
        const items = m.deliverableItems || m.content?.deliverableItems || [];
        items.forEach((item: any) => {
          // Avoid duplicate add-on items
          const exists = addons.some(
            (a) => a.name === (item.description || item.name || item.title) && a.amount === Number(item.amount ?? item.cost ?? 0)
          );
          if (!exists) {
            addons.push({
              name: item.description || item.name || item.title || "Add-on Task",
              duration: item.duration
                ? String(item.duration).toLowerCase().includes("day") || String(item.duration).toLowerCase().includes("week")
                  ? String(item.duration)
                  : `${item.duration} ${item.unit || "Days"}`
                : "-",
              amount: Number(item.amount ?? item.cost ?? 0),
            });
          }
        });
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
    duration = `${totalDays} Days`;
  } else if (data.timelineInDays) {
    duration = `${data.timelineInDays} Days`;
  } else if (data.totalDuration || data.timeline || data.estimatedTimeline || data.duration) {
    duration = String(data.totalDuration || data.timeline || data.estimatedTimeline || data.duration);
  } else if (data.calculatorSpecs?.estimatedTimeline) {
    duration = String(data.calculatorSpecs.estimatedTimeline);
  } else {
    duration = "14 Days";
  }

  const deliverablesSum = deliverables.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const addonsSum = addons.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const totalPrice = deliverablesSum > 0 ? deliverablesSum + addonsSum : (rawTotalPrice > 0 ? rawTotalPrice : Number(data.amountPaid || 0));

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalPrice);

  let description = data.description || "";
  if (!description && data.calculatorSpecs) {
    description = `Website development project for ${clientName}.`;
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
    duration,
    totalPrice,
    currency,
    formattedPrice,
    description,
    deliverables,
    addons,
  };
}

export function getProjectDetailsHTML(d: ProjectPDFData): string {
  const cleanTitle = d.title.replace(/^Project Title:\s*/i, "");

  return `
    <div style="width: 100%; max-width: 794px; min-height: 1020px; margin: 0 auto; box-sizing: border-box; background-color: #ffffff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; padding: 40px 48px; display: flex; flex-direction: column; justify-content: space-between;">
      
      <div>
        <!-- Top Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
          <!-- Logo Left -->
        <div>
            <svg xmlns="http://www.w3.org/2000/svg" width="180" height="35" viewBox="0 0 167.558 32.77">
              <g transform="translate(-28.2 -49.985)">
                <path d="M50.859,74.861c-1.856,2.665-5.42,4.357-10.592,4.357C33.762,79.217,28.2,76.171,28.2,69l6.438.524c-.045,3.3,4.394,3.2,5.315,3.219,1.093.015,5.465.082,5.465-2.4,0-6.191-16.506-.629-16.506-11.49,0-5.981,5.622-8.788,10.869-8.788,4.544,0,8.818,1.49,10.675,5.06a.157.157,0,0,1-.03.045,18.482,18.482,0,0,0-1.744,3.855l-3.451-.5c-1.153-1.639-3.511-2.036-5.509-2.036-2.036,0-4.619.427-4.641,2.021-.045,2.695,1.5,2.014,8.833,3.593a12.554,12.554,0,0,1,3.922,1.5c-.022.344-.03.7-.03,1.04a18.387,18.387,0,0,0,2.62,9.484C50.567,74.389,50.709,74.628,50.859,74.861Zm14.3-23.774a5.11,5.11,0,0,0,.771.5,1.151,1.151,0,0,1,.524-.322c.629-.037.629.591.719.928.314.022.4-.1.674-.18.135.135.262.269.4.4a5.559,5.559,0,0,1,.853-.988,1.576,1.576,0,0,1,.187-.015A13.473,13.473,0,0,0,65.157,51.086ZM78.414,70.624a13.97,13.97,0,0,0,.906-2.4,4.077,4.077,0,0,1-.217-2.47c-.045-.389-.09-.771-.127-1.16.1-.741.21-1.475.307-2.216a12.127,12.127,0,0,0-.067-1.617l-.157-.494c-.689-.374-.621-.966-.614-1.5a13.538,13.538,0,0,0-5.465-5.9c-.007-.007-.015-.007-.022-.015a2.567,2.567,0,0,1,.509.636c-.187.561-.329,1.25-.591,1.422-1.1-.584-1.332-1.5-1.984-2.283-.322-.225-.651-.449-.973-.681.03-.082.052-.157.082-.24a1.829,1.829,0,0,0,.18-.075c-.18-.052-.352-.1-.531-.15.03.022.06.052.09.075l-.584.517a.309.309,0,0,1,.082.052c.449.524,1.332.749,1.377,1.362-.045.142-.09.292-.135.434a1.349,1.349,0,0,0-.546.255c.052.1.1.21.157.322.255.067.517-.045.779.225l1.115,1.325c-.007.21-.007.412-.015.621.15.337.442.3.472.666a.381.381,0,0,1-.269.075.532.532,0,0,1-.531-.367c.045-.1.09-.217.127-.322a1.9,1.9,0,0,0-1.168-.045,1.064,1.064,0,0,0,.292.966c-.03.06-.067.112-.1.172-.247.007-.636-.15-.9-.12a11.619,11.619,0,0,0-1.856,1.145c-.12.269-.24.546-.359.816-.352.322-1.041.232-1.37.689-.344.487.217,1.07-.247,1.512-.546.195-.479-.913-.546-1.228-2.059-1.3-4.761-.636-3.833,2.006,1.153.606,1.624-.786,2.253.045-.195.494-.6.831-.629,1.288,2.081,1.093.225.958.838,2.193.157.314.472.307.719.531l-.022.045-.187.232c-.075-.007-.15-.007-.217-.015-.344-.352-.7-.7-1.041-1.055-.12-.344-.045-.591-.322-.928-.359-.262-.719-.531-1.078-.793-.1-.187-.195-.382-.3-.569-.21-.067-.419-.127-.629-.195a3.616,3.616,0,0,1-1.482-1.482c-.382-.711.262-2.029-.382-2.785-.082.18-.172.359-.255.539-.037-.037-.067-.075-.1-.12.142-1.228-.18-2.642.344-3.96.367-.913,3.211-2.747,2.874-3.945A13.618,13.618,0,0,0,59.348,76.44a13.822,13.822,0,0,0,3.81,1.5,5.718,5.718,0,0,1,1.093-1.22,6.958,6.958,0,0,0,1.273-2.4c-.217-.449-.7-.651-1.055-1.123-.314-.966-.636-1.924-.951-2.889a4.93,4.93,0,0,1,.681-1.377c.269-.232.8-.314,1-.734.225-.494.015-.966.015-1.415.187.03.382.067.569.1a1.439,1.439,0,0,0,.524-.262l1.662,10.8c-.614.157-1.25.262-1.819.382a5.7,5.7,0,0,0-1.078.427,13.394,13.394,0,0,0,3-.1c.052.344.1.681.157,1.026a14.661,14.661,0,1,1,10.989-7.89C78.968,71.065,78.691,70.848,78.414,70.624Zm.539,10.136a.988.988,0,0,1-.359,1.347l-.9.517a.988.988,0,0,1-1.347-.359L73.009,76.47l-3.541,5.614L66.414,61.955,82.269,74.7l-6.662.247ZM95.8,72.742a8.069,8.069,0,0,0,7.066-4.162l5.756,3.189a14.6,14.6,0,0,1-25.354.247,19.407,19.407,0,0,0,0-14.732A14.607,14.607,0,0,1,108.6,57.5l-5.741,3.211A8.083,8.083,0,1,0,95.8,72.742ZM111.088,50.1h6.385V79.15h-6.385Zm15.795,11.371,11.73-.022v6.46l-11.73.007v4.858l14.709-.022v6.46H120.423V50.068h21.2l.03,6.438H126.891v4.963Zm33.049-4.948V79.292h-6.453V56.528h-9.207v-6.46h20.294l3.848,6.438Zm25.1,11.393V79.3h-6.46V67.809l-.022-.112L168.032,50.068h7.493l6.363,10.682,6.378-10.645h7.493Z" fill="#202794"/>
              </g>
            </svg>
            <div style="font-size: 11px; font-weight: 700; color: #202794; letter-spacing: 2.5px; text-transform: uppercase; margin-top: 5px;">WEB SOLUTIONS</div>
        </div>

          <!-- Address Right -->
        <div style="text-align: right;">
            <div style="font-size: 24px; font-weight: 900; color: #202794; letter-spacing: -0.5px; margin-bottom: 6px; text-transform: uppercase;">PROJECT DETAILS</div>
            <div style="font-size: 12px; font-weight: 700; color: #111827; margin-bottom: 2px;">Society Web Solutions</div>
            <div style="font-size: 12px; color: #374151; margin-bottom: 2px;">1645 Palm Beach Lakes Blvd</div>
            <div style="font-size: 12px; color: #374151; margin-bottom: 2px;">West Palm Beach, FL, US</div>
            <div style="font-size: 12px; font-weight: 700; color: #202794; margin-top: 3px;">contact@societywebsolutions.com</div>
          </div>
        </div>

        <!-- Header Divider -->
        <div style="height: 1px; background-color: #E2E8F0; width: 100%; margin-bottom: 24px;"></div>

      <!-- Client & Project Summary Card -->
        <div style="border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px 24px; background-color: #FAFAFA; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px;">
          <!-- Client Left -->
          <div>
            <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.8px;">CLIENT</div>
            <div style="font-size: 20px; font-weight: 800; color: #111827; margin: 8px 0 6px 0;">${d.clientName}</div>
            <div style="font-size: 13px; color: #64748B;">Status: <span style="font-weight: 700; color: #111827;">${d.status}</span></div>
          </div>

          <!-- Project Summary Right -->
          <div style="min-width: 250px;">
            <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px;">PROJECT SUMMARY</div>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #111827; font-weight: 500;">Project ID:</span>
                <span style="font-weight: 700; color: #111827;">${d.projectNumber}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #111827; font-weight: 500;">Submitted:</span>
                <span style="font-weight: 700; color: #111827;">${d.submittedDate}</span>
          </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #111827; font-weight: 500;">Est. Deadline:</span>
            <span style="font-weight: 700; color: #00875A;">${d.deadlineDate}</span>
          </div>
        </div>
      </div>
      </div>

        <!-- Project Title -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 20px; font-weight: 800; color: #202794; margin-bottom: 8px;">Project Title: ${cleanTitle}</div>
          <div style="height: 1px; background-color: #E2E8F0; width: 100%; margin-bottom: 14px;"></div>
          ${d.description ? `<p style="font-size: 13px; color: #334155; line-height: 1.6; margin: 0;">${d.description}</p>` : ""}
        </div>

      <!-- Deliverables Table -->
        <div style="border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
              <tr style="background-color: #282BB3; color: #FFFFFF;">
                <th style="padding: 12px 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; text-align: left;">DELIVERABLES & WORK SCOPE</th>
                <th style="padding: 12px 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; text-align: center;">DURATION</th>
                <th style="padding: 12px 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; text-align: right;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${(d.deliverables || [])
              .map(
                (item: { name: string; duration: string; amount: number }, idx: number) => `
                <tr style="background-color: #FFFFFF; border-top: ${idx > 0 ? "1px solid #E2E8F0" : "none"};">
                  <td style="padding: 14px 20px; font-size: 13px; font-weight: 700; color: #111827; text-align: left;">${item.name}</td>
                  <td style="padding: 14px 20px; font-size: 13px; font-weight: 600; color: #111827; text-align: center;">${item.duration}</td>
                  <td style="padding: 14px 20px; font-size: 13px; font-weight: 700; color: #111827; text-align: right;">${new Intl.NumberFormat("en-US", { style: "currency", currency: (d.currency || "USD").toUpperCase(), minimumFractionDigits: 2 }).format(item.amount)}</td>
              </tr>
            `
              )
              .join("")}
            ${
              d.addons && d.addons.length > 0
                ? `
                <tr style="background-color: #EBF0F7; border-top: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0;">
                  <td colspan="3" style="padding: 10px 20px; font-size: 11px; font-weight: 800; color: #111827; text-transform: uppercase; letter-spacing: 0.8px; text-align: left;">ADD-ON TASKS</td>
              </tr>
              ${d.addons
                .map(
                  (addon) => `
                  <tr style="background-color: #FFFFFF; border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 14px 20px; font-size: 13px; font-weight: 700; color: #111827; text-align: left;">${addon.name}</td>
                    <td style="padding: 14px 20px; font-size: 13px; font-weight: 600; color: #111827; text-align: center;">${addon.duration}</td>
                    <td style="padding: 14px 20px; font-size: 13px; font-weight: 700; color: #111827; text-align: right;">${new Intl.NumberFormat("en-US", { style: "currency", currency: (d.currency || "USD").toUpperCase(), minimumFractionDigits: 2 }).format(addon.amount)}</td>
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
        <div style="display: flex; justify-content: flex-end; margin-top: 24px; margin-bottom: 32px;">
          <div style="width: 310px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
            <!-- Top Row (Timeline) -->
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
                  <td style="padding: 16px 18px; vertical-align: middle; text-align: right;">
                    <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF; display: inline-block; vertical-align: middle; line-height: 1;">${d.formattedPrice}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #E2E8F0; padding-top: 24px; text-align: center; margin-top: 20px;">
        <div style="font-size: 11px; color: #64748B; margin-bottom: 4px;">This document serves as a record of project details and agreed deliverables.</div>
        <div style="font-size: 11px; color: #64748B; margin-bottom: 16px;">For inquiries, please reach out to <span style="font-weight: 700; color: #334155;">contact@societywebsolutions.com</span></div>
        <div style="font-size: 11px; font-weight: 800; color: #CBD5E1; letter-spacing: 4px; text-transform: uppercase;">S O C I E T Y &nbsp; W E B &nbsp; S O L U T I O N S</div>
      </div>

    </div>
  `;
}

function isCalculatorProject(data: any): boolean {
  return Boolean(
    data?.calculatorSpecs ||
    data?.requirements?.selections ||
    data?.categoryKey
  );
}

export async function downloadProjectDetailsPDF(data: any): Promise<void> {
  if (typeof window === "undefined") return;
  if (isCalculatorProject(data)) {
  return downloadCalculatorProjectPDF(data);
  }

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

      if (imgHeight <= pageHeight + 5) {
        pdf.addImage(pageImgData, "PNG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
      } else {
        // Multi-page slicing if needed
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(pageImgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(pageImgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
          heightLeft -= pageHeight;
        }
      }

      const cleanNum = d.rawProjectNumber.replace(/[^a-zA-Z0-9-_]/g, "") || "1";
      const filename = `Project_Details_${cleanNum}.pdf`;
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
  if (isCalculatorProject(data)) {
  return printCalculatorProjectPDF(data);
  }

  const d = extractProjectDetails(data);
  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Project Details - ${d.projectNumber}</title>
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
