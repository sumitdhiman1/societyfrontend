import { authService } from "./authService";
import { getProjectEstimatedDeadline, parseDurationToDays } from "./calculatorUtils";

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
  submittedDate: string;
  deadlineDate: string;
  categoryName: string;
  selectedOptions: Array<{ question: string; answers: string[] }>;
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
  description?: string;
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
    data.projectNumber ||
    data.quoteNumber ||
    (data._id ? `2026-${data._id.slice(-3).toUpperCase()}` : "2026-201");
  rawProjectNumber = String(rawProjectNumber).replace(/^INV-/i, "");
  const projectNumber = rawProjectNumber.startsWith("#") ? rawProjectNumber : `#${rawProjectNumber}`;

  const categoryName =
    data.categoryName ||
    data.calculatorSpecs?.categoryName ||
    data.serviceType ||
    "Custom Website Development Project";

  const title =
    data.title ||
    `Website Price Calculator - ${clientName}`;

  const status = (data.status || "Active").charAt(0).toUpperCase() + (data.status || "Active").slice(1).toLowerCase();

  const submittedDateObj = data.startDate || data.createdAt || new Date();
  const submittedDate = formatPdfDate(submittedDateObj);

  const duration =
    data.calculatorSpecs?.estimatedTimeline ||
    data.totalDuration ||
    data.timeline ||
    (data.timelineInDays ? `${data.timelineInDays} Days` : "") ||
    data.duration ||
    "2 weeks";

  let deadlineDate = "";
  const deadlineDateObj = getProjectEstimatedDeadline(data) || (data.deadline ? new Date(data.deadline) : null);
  if (deadlineDateObj) {
    deadlineDate = formatPdfDate(deadlineDateObj);
  } else {
    const days = parseDurationToDays(duration) || 14;
    const calcDate = new Date(submittedDateObj);
    calcDate.setDate(calcDate.getDate() + days);
    deadlineDate = formatPdfDate(calcDate);
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

  // Case 1: If invoked directly with calculator page breakdownItems
  if (Array.isArray(data.breakdownItems) && data.breakdownItems.length > 0) {
    if (data.subtitle) {
      selectedOptions.push({
        question: "What type of website do you need?:",
        answers: [data.subtitle],
      });
    }
    data.breakdownItems.forEach((item: any) => {
      const qText = item.question || "";
      if (/timeline/i.test(qText)) return;
      selectedOptions.push({
        question: qText.endsWith(":") ? qText : `${qText}:`,
        answers: Array.isArray(item.answers) ? item.answers : [String(item.answers || "")],
      });
    });

    const timelineVal = duration;
    let formattedTimeline = timelineVal;
    if (!timelineVal.includes(":") && !timelineVal.includes("Normal") && !timelineVal.includes("Rushed")) {
      formattedTimeline = `${timelineVal} (Normal): No extra fee`;
    }
    selectedOptions.push({
      question: "What is your desired project timeline?:",
      answers: [formattedTimeline],
    });
  } else {
    // Case 2: From project / quote specs selections
    const calculatorSpecs = data.calculatorSpecs || data.requirements || {};
    const rawSelections = calculatorSpecs?.selections || [];

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
            question: qText.endsWith(":") ? qText : `${qText}:`,
            answers: ansList,
          });
        }
      });

      const timelineVal = duration;
      let formattedTimeline = timelineVal;
      if (!timelineVal.includes(":") && !timelineVal.includes("Normal") && !timelineVal.includes("Rushed")) {
        formattedTimeline = `${timelineVal} (Normal): No extra fee`;
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

  const deliverables: Array<{ name: string; duration: string; amount: number }> = [
    {
      name: categoryName,
      duration: duration,
      amount: rawTotalPrice > 0 ? rawTotalPrice : Number(data.amountPaid || 0),
    },
  ];

  const deliverablesSum = deliverables.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const totalPrice = deliverablesSum > 0 ? deliverablesSum : (rawTotalPrice > 0 ? rawTotalPrice : Number(data.amountPaid || 0));

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalPrice);

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
    description: data.description || "",
    deliverables,
    addons,
  };
}

export function getCalculatorProjectHTML(d: CalculatorPDFData): string {
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
        throw new Error("Canvas rendering produced an empty canvas");
      }

      const pdf = new jsPdfLib("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Clean canvas page slicing for multi-page PDF
      const pageCanvasHeight = Math.floor((canvas.width * pageHeight) / pageWidth);
      let renderedHeight = 0;
      let pageNum = 0;

      while (renderedHeight < canvas.height) {
        const sliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            renderedHeight,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );

          const pageImgData = pageCanvas.toDataURL("image/png");
          if (pageNum > 0) {
            pdf.addPage();
          }
          const renderHeightPt = (sliceHeight * pageWidth) / canvas.width;
          pdf.addImage(pageImgData, "PNG", 0, 0, pageWidth, renderHeightPt, undefined, "FAST");
          pageNum++;
        }
        renderedHeight += pageCanvasHeight;
      }

      const cleanNum = d.rawProjectNumber.replace(/[^a-zA-Z0-9-_]/g, "") || "quote";
      const filename = `Project_Details_${cleanNum}.pdf`;
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

export function printCalculatorProjectPDF(data: any): void {
  if (typeof window === "undefined") return;

  const d = extractCalculatorPDFData(data);
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
